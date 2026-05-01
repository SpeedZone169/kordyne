import { NextResponse } from "next/server";
import {
  extractDesignAppToken,
  getDesignAppRequestContext,
} from "../../../../lib/design-app/request-auth";

function maskToken(token: string | null) {
  if (!token) return null;
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}

export async function GET(request: Request) {
  const token = extractDesignAppToken(request);

  const debug: Record<string, unknown> = {
    token_present: Boolean(token),
    token_preview: maskToken(token),
    authorization_header_present: Boolean(request.headers.get("authorization")),
    custom_token_header_present: Boolean(
      request.headers.get("x-kordyne-connection-token"),
    ),
  };

  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "fusion",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: false,
    });

    if ("error" in ctx) return ctx.error;

    debug.auth_user_error = null;
    debug.auth_user_id = ctx.user.id;
    debug.auth_user_email = ctx.user.email ?? null;
    debug.membership_error = null;
    debug.membership = {
      organization_id: ctx.organizationId,
      role: ctx.role,
    };

    const { data: entitlement, error: entitlementError } = await ctx.supabase
      .from("organization_connector_entitlements")
      .select(
        "id, organization_id, provider_key, is_enabled, allowed_runtime_roles, current_release_id",
      )
      .eq("organization_id", ctx.organizationId)
      .eq("provider_key", "fusion")
      .maybeSingle();

    debug.entitlement_error = entitlementError?.message ?? null;
    debug.entitlement = entitlement ?? null;

    if (entitlementError) {
      return NextResponse.json(
        {
          ok: false,
          error: entitlementError.message,
          debug,
        },
        { status: 500 },
      );
    }

    if (!entitlement?.is_enabled) {
      return NextResponse.json(
        {
          ok: false,
          error: "Connector is not enabled for this organization.",
          debug,
        },
        { status: 403 },
      );
    }

    const effectiveAllowedRoles =
      Array.isArray(entitlement.allowed_runtime_roles) &&
      entitlement.allowed_runtime_roles.length > 0
        ? entitlement.allowed_runtime_roles
        : ["admin", "engineer"];

    debug.effective_allowed_roles = effectiveAllowedRoles;

    if (!effectiveAllowedRoles.includes(ctx.role)) {
      return NextResponse.json(
        {
          ok: false,
          error: "You do not have access to this connector.",
          debug,
        },
        { status: 403 },
      );
    }

    const { count: partsCount, error: partsCountError } = await ctx.supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", ctx.organizationId);

    debug.parts_count_error = partsCountError?.message ?? null;
    debug.parts_count = partsCount ?? 0;

    const { count: connectorsCount, error: connectorsCountError } =
      await ctx.supabase
        .from("design_connectors")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", ctx.organizationId)
        .eq("provider_key", "fusion");

    debug.connectors_count_error = connectorsCountError?.message ?? null;
    debug.connectors_count = connectorsCount ?? 0;

    return NextResponse.json({
      ok: true,
      debug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
        debug,
      },
      { status: 500 },
    );
  }
}
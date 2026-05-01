import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";

export async function GET(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "fusion",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const { data: organization, error: organizationError } = await ctx.supabase
      .from("organizations")
      .select("id, name, slug, plan")
      .eq("id", ctx.organizationId)
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json(
        { ok: false, error: organizationError.message },
        { status: 500 },
      );
    }

    const { data: profile, error: profileError } = await ctx.supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: ctx.user.id,
        email: profile?.email ?? ctx.user.email ?? null,
        full_name: profile?.full_name ?? null,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            plan: organization.plan,
          }
        : null,
      membership: {
        role: ctx.role,
      },
      entitlement: ctx.entitlement
        ? {
            id: ctx.entitlement.id,
            provider_key: ctx.entitlement.provider_key,
            is_enabled: ctx.entitlement.is_enabled,
            allowed_runtime_roles: ctx.entitlement.allowed_runtime_roles,
            current_release_id: ctx.entitlement.current_release_id,
          }
        : null,
      auth: {
        mode: ctx.token ? "token" : "cookie",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
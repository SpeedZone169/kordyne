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

    const { data: connectors, error: connectorsError } = await ctx.supabase
      .from("design_connectors")
      .select(
        `
          id,
          provider_key,
          display_name,
          connection_mode,
          sync_scope_type,
          sync_scope_external_id,
          sync_scope_label,
          is_enabled,
          last_sync_status,
          last_sync_at,
          credential_profile:internal_connector_profiles (
            id,
            display_name,
            provider_key,
            auth_mode,
            last_test_status
          )
        `,
      )
      .eq("organization_id", ctx.organizationId)
      .eq("provider_key", "fusion")
      .order("display_name", { ascending: true });

    if (connectorsError) {
      return NextResponse.json(
        { ok: false, error: connectorsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      items: connectors ?? [],
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
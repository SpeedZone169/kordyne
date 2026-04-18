import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getDesignConnectorAdapter } from "../../../../../lib/design-connectors/adapters";
import type { DesignConnectorProfileRecord } from "../../../../../lib/design-connectors/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function toProfileRecord(
  row: Record<string, unknown>,
): DesignConnectorProfileRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    provider_key: String(row.provider_key),
    display_name: String(row.display_name),
    auth_mode: row.auth_mode ? String(row.auth_mode) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
    last_test_status: row.last_test_status ? String(row.last_test_status) : null,
    last_test_error: row.last_test_error ? String(row.last_test_error) : null,
    created_by_user_id: row.created_by_user_id
      ? String(row.created_by_user_id)
      : null,
    updated_by_user_id: row.updated_by_user_id
      ? String(row.updated_by_user_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    token_expires_at: row.token_expires_at
      ? String(row.token_expires_at)
      : null,
  };
}

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: connector, error: connectorError } = await supabase
      .from("design_connectors")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (connectorError) {
      return NextResponse.json({ error: connectorError.message }, { status: 500 });
    }

    if (!connector) {
      return NextResponse.json({ error: "Design connector not found." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("organization_id", connector.organization_id)
      .eq("role", "admin")
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "Only organization admins can test design connectors." },
        { status: 403 },
      );
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("*")
      .eq("id", connector.credential_profile_id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profileRow) {
      return NextResponse.json({ error: "Credential profile not found." }, { status: 404 });
    }

    const profile = toProfileRecord(profileRow as Record<string, unknown>);
    const adapter = getDesignConnectorAdapter(connector.provider_key);
    const result = await adapter.testProfile(profile);

    const timestamp = new Date().toISOString();
    const nextStatus = result.ok ? "succeeded" : "failed";
    const nextError = result.ok ? null : result.message;

    const { error: updateConnectorError } = await supabase
      .from("design_connectors")
      .update({
        last_sync_at: timestamp,
        last_sync_status: nextStatus,
        last_error: nextError,
        updated_by_user_id: user.id,
      })
      .eq("id", connector.id);

    if (updateConnectorError) {
      return NextResponse.json(
        { error: updateConnectorError.message },
        { status: 500 },
      );
    }

    const { error: updateProfileError } = await supabase
      .from("internal_connector_profiles")
      .update({
        last_tested_at: timestamp,
        last_test_status: nextStatus,
        last_test_error: nextError,
        updated_by_user_id: user.id,
      })
      .eq("id", profile.id);

    if (updateProfileError) {
      return NextResponse.json(
        { error: updateProfileError.message },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("design_connector_audit_events")
      .insert({
        organization_id: connector.organization_id,
        provider_key: connector.provider_key,
        design_connector_id: connector.id,
        credential_profile_id: profile.id,
        actor_user_id: user.id,
        event_type: "connector_test",
        target_type: "design_connector",
        target_id: connector.id,
        details: {
          ok: result.ok,
          message: result.message,
          adapter_details: result.details ?? {},
        },
      });

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: result.ok,
      connector_id: connector.id,
      provider_key: connector.provider_key,
      message: result.message,
      details: result.details ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
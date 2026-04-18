import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { getDesignConnectorAdapter } from "../../../../lib/design-connectors/adapters";
import type {
  DesignAppCompareInput,
  DesignConnectorProfileRecord,
} from "../../../../lib/design-connectors/types";

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseCompareInput(body: unknown): DesignAppCompareInput {
  if (!body || typeof body !== "object") {
    throw new Error("Request body must be an object.");
  }

  const input = body as Record<string, unknown>;

  if (typeof input.provider_key !== "string" || input.provider_key.trim().length === 0) {
    throw new Error("provider_key is required.");
  }

  return {
    provider_key: input.provider_key.trim() as DesignAppCompareInput["provider_key"],
    connector_id: asNullableString(input.connector_id),
    part_id: asNullableString(input.part_id),
    external_document_id: asNullableString(input.external_document_id),
    external_item_id: asNullableString(input.external_item_id),
    external_version_id: asNullableString(input.external_version_id),
    metadata: asObject(input.metadata),
  };
}

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

export async function POST(request: Request) {
  try {
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

    const body = (await request.json()) as unknown;
    const input = parseCompareInput(body);

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json({ error: "No organization membership found." }, { status: 403 });
    }

    let connector:
      | {
          id: string;
          organization_id: string;
          provider_key: string;
          credential_profile_id: string;
        }
      | null = null;

    if (input.connector_id) {
      const { data: connectorRow, error: connectorError } = await supabase
        .from("design_connectors")
        .select("id, organization_id, provider_key, credential_profile_id")
        .eq("id", input.connector_id)
        .maybeSingle();

      if (connectorError) {
        return NextResponse.json({ error: connectorError.message }, { status: 500 });
      }

      if (!connectorRow) {
        return NextResponse.json({ error: "Design connector not found." }, { status: 404 });
      }

      if (connectorRow.organization_id !== membership.organization_id) {
        return NextResponse.json(
          { error: "Connector does not belong to your organization." },
          { status: 403 },
        );
      }

      connector = connectorRow;
    }

    const resolvedProfileId = connector?.credential_profile_id ?? null;

    if (!resolvedProfileId) {
      return NextResponse.json(
        { error: "connector_id is required for compare in this first phase." },
        { status: 400 },
      );
    }

    const { data: profileRow, error: profileError } = await supabase
      .from("internal_connector_profiles")
      .select("*")
      .eq("id", resolvedProfileId)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    if (!profileRow) {
      return NextResponse.json({ error: "Credential profile not found." }, { status: 404 });
    }

    if (profileRow.organization_id !== membership.organization_id) {
      return NextResponse.json(
        { error: "Credential profile does not belong to your organization." },
        { status: 403 },
      );
    }

    if (profileRow.provider_key !== input.provider_key) {
      return NextResponse.json(
        { error: "provider_key does not match the selected credential profile." },
        { status: 400 },
      );
    }

    const profile = toProfileRecord(profileRow as Record<string, unknown>);
    const adapter = getDesignConnectorAdapter(input.provider_key);

    const { data: syncRun, error: syncRunError } = await supabase
      .from("design_sync_runs")
      .insert({
        organization_id: membership.organization_id,
        provider_key: input.provider_key,
        design_connector_id: connector?.id ?? null,
        credential_profile_id: profile.id,
        run_type: "compare",
        direction: "cad_to_kordyne",
        target_ref: input.part_id ?? input.external_document_id ?? input.external_item_id ?? null,
        status: "running",
        summary: {
          part_id: input.part_id ?? null,
          external_document_id: input.external_document_id ?? null,
          external_item_id: input.external_item_id ?? null,
          external_version_id: input.external_version_id ?? null,
          stub: true,
        },
        triggered_by_user_id: user.id,
      })
      .select("id")
      .single();

    if (syncRunError) {
      return NextResponse.json({ error: syncRunError.message }, { status: 500 });
    }

    try {
      const compareResult = adapter.compare
        ? await adapter.compare(profile, input)
        : {
            ok: false,
            provider_key: input.provider_key,
            message: `Compare is not implemented for provider '${input.provider_key}'.`,
            details: {},
          };

      const completedAt = new Date().toISOString();

      const { error: runUpdateError } = await supabase
        .from("design_sync_runs")
        .update({
          status: compareResult.ok ? "succeeded" : "failed",
          completed_at: completedAt,
          summary: {
            part_id: input.part_id ?? null,
            external_document_id: input.external_document_id ?? null,
            external_item_id: input.external_item_id ?? null,
            external_version_id: input.external_version_id ?? null,
            changed_fields: compareResult.summary?.changed_fields ?? [],
            stub: true,
          },
          error_message: compareResult.ok ? null : compareResult.message,
        })
        .eq("id", syncRun.id);

      if (runUpdateError) {
        throw new Error(runUpdateError.message);
      }

      if (connector?.id) {
        const { error: connectorUpdateError } = await supabase
          .from("design_connectors")
          .update({
            last_sync_at: completedAt,
            last_sync_status: compareResult.ok ? "succeeded" : "failed",
            last_error: compareResult.ok ? null : compareResult.message,
            updated_by_user_id: user.id,
          })
          .eq("id", connector.id);

        if (connectorUpdateError) {
          throw new Error(connectorUpdateError.message);
        }
      }

      const { error: auditError } = await supabase
        .from("design_connector_audit_events")
        .insert({
          organization_id: membership.organization_id,
          provider_key: input.provider_key,
          design_connector_id: connector?.id ?? null,
          credential_profile_id: profile.id,
          actor_user_id: user.id,
          event_type: "design_compare",
          target_type: "design_connector",
          target_id: connector?.id ?? null,
          details: {
            sync_run_id: syncRun.id,
            part_id: input.part_id ?? null,
            external_document_id: input.external_document_id ?? null,
            external_item_id: input.external_item_id ?? null,
            external_version_id: input.external_version_id ?? null,
            ok: compareResult.ok,
            message: compareResult.message,
            summary: compareResult.summary ?? {},
          },
        });

      if (auditError) {
        throw new Error(auditError.message);
      }

      return NextResponse.json({
        ok: compareResult.ok,
        sync_run_id: syncRun.id,
        message: compareResult.message,
        summary: compareResult.summary ?? {},
        details: compareResult.details ?? {},
      });
    } catch (innerError) {
      const failedAt = new Date().toISOString();

      await supabase
        .from("design_sync_runs")
        .update({
          status: "failed",
          completed_at: failedAt,
          error_message:
            innerError instanceof Error ? innerError.message : "Compare failed.",
        })
        .eq("id", syncRun.id);

      if (connector?.id) {
        await supabase
          .from("design_connectors")
          .update({
            last_sync_at: failedAt,
            last_sync_status: "failed",
            last_error:
              innerError instanceof Error ? innerError.message : "Compare failed.",
            updated_by_user_id: user.id,
          })
          .eq("id", connector.id);
      }

      return NextResponse.json(
        {
          error:
            innerError instanceof Error ? innerError.message : "Compare failed.",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
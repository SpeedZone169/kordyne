import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { getDesignConnectorAdapter } from "../../../../../lib/design-connectors/adapters";
import { toDesignConnectorProfileRecord } from "../../../../../lib/design-connectors/profile-record";
import type { DesignSyncResult } from "../../../../../lib/design-connectors/adapters/base";
import type {
  DesignSyncDirection,
  DesignSyncRunType,
} from "../../../../../lib/design-connectors/types";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function asRunType(value: unknown): DesignSyncRunType {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim() as DesignSyncRunType;
  }
  return "sync";
}

function asDirection(value: unknown): DesignSyncDirection {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim() as DesignSyncDirection;
  }
  return "bidirectional";
}

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

export async function POST(request: Request, context: RouteContext) {
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
        { error: "Only organization admins can run connector sync." },
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
      return NextResponse.json(
        { error: "Credential profile not found." },
        { status: 404 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const runType = asRunType(body.run_type);
    const direction = asDirection(body.direction);
    const targetRef = asNullableString(body.target_ref);
    const requestSummary = asObject(body.summary);
    const adapter = getDesignConnectorAdapter(connector.provider_key);
    const profile = toDesignConnectorProfileRecord(
      profileRow as Record<string, unknown>,
    );

    const { data: syncRun, error: syncRunError } = await supabase
      .from("design_sync_runs")
      .insert({
        organization_id: connector.organization_id,
        provider_key: connector.provider_key,
        design_connector_id: connector.id,
        credential_profile_id: connector.credential_profile_id,
        run_type: runType,
        direction,
        target_ref: targetRef,
        status: "running",
        summary: {
          phase: "adapter",
          adapter_provider_key: adapter.providerKey,
          requested_summary: requestSummary,
        },
        triggered_by_user_id: user.id,
      })
      .select("*")
      .single();

    if (syncRunError) {
      return NextResponse.json({ error: syncRunError.message }, { status: 500 });
    }

    let syncResult: DesignSyncResult;

    try {
      syncResult = adapter.sync
        ? await adapter.sync(profile, {
            connector_id: connector.id,
            sync_scope_type: connector.sync_scope_type,
            sync_scope_external_id: connector.sync_scope_external_id,
            sync_scope_label: connector.sync_scope_label,
            run_type: runType,
            direction,
            target_ref: targetRef,
            summary: requestSummary,
          })
        : {
            ok: true,
            provider_key: connector.provider_key,
            message: "Design connector sync stub completed.",
            summary: {
              adapter_mode: "stub",
              result: "No provider sync logic implemented yet.",
            },
            items: [],
          };
    } catch (error) {
      syncResult = {
        ok: false,
        provider_key: connector.provider_key,
        message:
          error instanceof Error ? error.message : "Connector adapter sync failed.",
        summary: {
          adapter_mode: "error",
        },
        items: [],
      };
    }

    const completedAt = new Date().toISOString();
    const completedStatus = syncResult.ok ? "succeeded" : "failed";
    const discoveredItems = syncResult.items ?? [];

    if (discoveredItems.length > 0) {
      const { error: itemsInsertError } = await supabase
        .from("design_sync_run_items")
        .insert(
          discoveredItems.map((item) => ({
            sync_run_id: syncRun.id,
            external_ref: item.id,
            action: "discover",
            status: completedStatus,
            message: item.name,
            details: {
              item,
              adapter_mode: item.metadata?.adapter_mode ?? "unknown",
            },
          })),
        );

      if (itemsInsertError) {
        return NextResponse.json(
          { error: itemsInsertError.message },
          { status: 500 },
        );
      }
    }

    const { error: runUpdateError } = await supabase
      .from("design_sync_runs")
      .update({
        status: completedStatus,
        completed_at: completedAt,
        error_message: syncResult.ok ? null : syncResult.message,
        summary: {
          phase: "adapter",
          adapter_provider_key: adapter.providerKey,
          requested_summary: requestSummary,
          result: syncResult.summary ?? {},
          discovered_item_count: discoveredItems.length,
        },
      })
      .eq("id", syncRun.id);

    if (runUpdateError) {
      return NextResponse.json({ error: runUpdateError.message }, { status: 500 });
    }

    const { error: connectorUpdateError } = await supabase
      .from("design_connectors")
      .update({
        last_sync_at: completedAt,
        last_sync_status: completedStatus,
        last_error: syncResult.ok ? null : syncResult.message,
        updated_by_user_id: user.id,
      })
      .eq("id", connector.id);

    if (connectorUpdateError) {
      return NextResponse.json(
        { error: connectorUpdateError.message },
        { status: 500 },
      );
    }

    const { error: auditError } = await supabase
      .from("design_connector_audit_events")
      .insert({
        organization_id: connector.organization_id,
        provider_key: connector.provider_key,
        design_connector_id: connector.id,
        credential_profile_id: connector.credential_profile_id,
        actor_user_id: user.id,
        event_type: "connector_sync",
        target_type: "design_connector",
        target_id: connector.id,
        details: {
          sync_run_id: syncRun.id,
          run_type: runType,
          direction,
          target_ref: targetRef,
          adapter_provider_key: adapter.providerKey,
          adapter_message: syncResult.message,
          discovered_item_count: discoveredItems.length,
        },
      });

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: syncResult.ok,
      sync_run_id: syncRun.id,
      status: completedStatus,
      message: syncResult.message,
      discovered_item_count: discoveredItems.length,
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

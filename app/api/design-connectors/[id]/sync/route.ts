import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
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

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const runType = asRunType(body.run_type);
    const direction = asDirection(body.direction);
    const targetRef = asNullableString(body.target_ref);
    const requestSummary = asObject(body.summary);

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
          phase: "stub",
          requested_summary: requestSummary,
        },
        triggered_by_user_id: user.id,
      })
      .select("*")
      .single();

    if (syncRunError) {
      return NextResponse.json({ error: syncRunError.message }, { status: 500 });
    }

    const completedAt = new Date().toISOString();

    const { error: runUpdateError } = await supabase
      .from("design_sync_runs")
      .update({
        status: "succeeded",
        completed_at: completedAt,
        summary: {
          phase: "stub",
          requested_summary: requestSummary,
          result: "No provider sync logic implemented yet.",
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
        last_sync_status: "succeeded",
        last_error: null,
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
          stub: true,
        },
      });

    if (auditError) {
      return NextResponse.json({ error: auditError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      sync_run_id: syncRun.id,
      status: "succeeded",
      message: "Design connector sync stub completed.",
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
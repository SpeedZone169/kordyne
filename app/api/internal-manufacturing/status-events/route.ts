import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateStatusEventBody = {
  resourceId?: string;
  status?: string;
  reasonCode?: string | null;
  reasonDetail?: string | null;
  effectiveAt?: string | null;
};

const ALLOWED_STATUSES = new Set([
  "idle",
  "queued",
  "running",
  "paused",
  "blocked",
  "maintenance",
  "offline",
  "complete",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeReasonCode(value: string | null): string | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.length > 0 ? normalized : null;
}

function parseEffectiveAt(value: string | null): string {
  if (!value) return new Date().toISOString();

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("effectiveAt is invalid.");
  }

  return parsed.toISOString();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("You must be signed in.", 401);
  }

  let body: CreateStatusEventBody;

  try {
    body = (await request.json()) as CreateStatusEventBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const resourceId = normalizeOptionalText(body.resourceId);
  const status = normalizeOptionalText(body.status);
  const reasonCode = normalizeReasonCode(normalizeOptionalText(body.reasonCode));
  const reasonDetail = normalizeOptionalText(body.reasonDetail);

  if (!resourceId) {
    return jsonError("resourceId is required.", 400);
  }

  if (!status || !ALLOWED_STATUSES.has(status)) {
    return jsonError("status is invalid.", 400);
  }

  let effectiveAt: string;

  try {
    effectiveAt = parseEffectiveAt(normalizeOptionalText(body.effectiveAt));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "effectiveAt is invalid.";
    return jsonError(message, 400);
  }

  const resourceResult = await supabase
    .from("internal_resources")
    .select("id, organization_id, name")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceResult.error) {
    return jsonError(resourceResult.error.message, 500);
  }

  if (!resourceResult.data) {
    return jsonError("Resource not found.", 404);
  }

  const resource = resourceResult.data as {
    id: string;
    organization_id: string;
    name: string;
  };

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", resource.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipResult.error) {
    return jsonError(membershipResult.error.message, 500);
  }

  if (!membershipResult.data) {
    return jsonError("You do not have access to this organization.", 403);
  }

  const membership = membershipResult.data as {
    organization_id: string;
    role: string;
  };

  if (membership.role !== "admin") {
    return jsonError(
      "Only customer organization admins can update resource statuses.",
      403,
    );
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", resource.organization_id)
    .maybeSingle();

  if (organizationResult.error) {
    return jsonError(organizationResult.error.message, 500);
  }

  if (!organizationResult.data) {
    return jsonError("Organization not found.", 404);
  }

  const organization = organizationResult.data as {
    id: string;
    organization_type: string | null;
  };

  if (organization.organization_type !== "customer") {
    return jsonError(
      "Resource status updates are only available for customer organizations.",
      403,
    );
  }

  const insertEventResult = await supabase
    .from("internal_resource_status_events")
    .insert({
      organization_id: resource.organization_id,
      resource_id: resource.id,
      source: "manual",
      status,
      reason_code: reasonCode,
      reason_detail: reasonDetail,
      effective_at: effectiveAt,
      entered_by_user_id: user.id,
    })
    .select(
      "id, organization_id, resource_id, source, status, reason_code, reason_detail, effective_at, entered_by_user_id, created_at",
    )
    .single();

  if (insertEventResult.error) {
    return jsonError(insertEventResult.error.message, 500);
  }

  const updateResourceResult = await supabase
    .from("internal_resources")
    .update({
      current_status: status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", resource.id)
    .select(
      "id, organization_id, name, current_status, status_source, active, location_label, updated_at",
    )
    .single();

  if (updateResourceResult.error) {
    return jsonError(updateResourceResult.error.message, 500);
  }

  return NextResponse.json(
    {
      statusEvent: insertEventResult.data,
      resource: updateResourceResult.data,
    },
    { status: 201 },
  );
}

export {};

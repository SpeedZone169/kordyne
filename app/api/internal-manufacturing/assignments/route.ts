import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateAssignmentBody = {
  operationId?: string;
  resourceId?: string;
  startDate?: string;
  endDate?: string;
  confidence?: "low" | "medium" | "high" | null;
  riskLevel?: "none" | "low" | "medium" | "high" | null;
};

type OperationRow = {
  id: string;
  organization_id: string;
  job_id: string;
  capability_id: string | null;
  status: string;
};

type ResourceRow = {
  id: string;
  organization_id: string;
  name: string;
  active: boolean;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseDateBoundary(value: string | null, kind: "start" | "end") {
  if (!value) {
    throw new Error(`${kind === "start" ? "startDate" : "endDate"} is required.`);
  }

  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);

  const date = dateOnlyMatch
    ? new Date(`${value}T${kind === "start" ? "00:00:00" : "23:59:59"}`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`${kind === "start" ? "startDate" : "endDate"} is invalid.`);
  }

  if (kind === "end" && dateOnlyMatch) {
    date.setHours(23, 59, 59, 999);
  }

  if (kind === "start" && dateOnlyMatch) {
    date.setHours(0, 0, 0, 0);
  }

  return date.toISOString();
}

function getConfidenceScore(confidence: CreateAssignmentBody["confidence"]) {
  switch (confidence) {
    case "high":
      return 0.9;
    case "medium":
      return 0.65;
    case "low":
      return 0.35;
    default:
      return null;
  }
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

  let body: CreateAssignmentBody;

  try {
    body = (await request.json()) as CreateAssignmentBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const operationId = normalizeOptionalText(body.operationId);
  const resourceId = normalizeOptionalText(body.resourceId);

  if (!operationId) {
    return jsonError("operationId is required.", 400);
  }

  if (!resourceId) {
    return jsonError("resourceId is required.", 400);
  }

  let startsAt: string;
  let endsAt: string;

  try {
    startsAt = parseDateBoundary(normalizeOptionalText(body.startDate), "start");
    endsAt = parseDateBoundary(normalizeOptionalText(body.endDate), "end");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid scheduling dates.";
    return jsonError(message, 400);
  }

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return jsonError("endDate must be after startDate.", 400);
  }

  const operationResult = await supabase
    .from("internal_job_operations")
    .select("id, organization_id, job_id, capability_id, status")
    .eq("id", operationId)
    .maybeSingle();

  if (operationResult.error) {
    return jsonError(operationResult.error.message, 500);
  }

  if (!operationResult.data) {
    return jsonError("Operation not found.", 404);
  }

  const operation = operationResult.data as OperationRow;

  const resourceResult = await supabase
    .from("internal_resources")
    .select("id, organization_id, name, active")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceResult.error) {
    return jsonError(resourceResult.error.message, 500);
  }

  if (!resourceResult.data) {
    return jsonError("Resource not found.", 404);
  }

  const resource = resourceResult.data as ResourceRow;

  if (operation.organization_id !== resource.organization_id) {
    return jsonError(
      "Operation and resource must belong to the same organization.",
      400,
    );
  }

  if (!resource.active) {
    return jsonError("Selected resource is not active.", 400);
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", operation.organization_id)
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
    role: string | null;
  };

  if (membership.role !== "admin") {
    return jsonError(
      "Only customer organization admins can create internal assignments.",
      403,
    );
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", operation.organization_id)
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
      "Internal assignments are only available for customer organizations.",
      403,
    );
  }

  if (operation.status === "completed" || operation.status === "cancelled") {
    return jsonError("Completed or cancelled operations cannot be assigned.", 400);
  }

  const existingAssignmentResult = await supabase
    .from("internal_operation_assignments")
    .select("id")
    .eq("operation_id", operation.id)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();

  if (existingAssignmentResult.error) {
    return jsonError(existingAssignmentResult.error.message, 500);
  }

  if (existingAssignmentResult.data) {
    return jsonError(
      "This operation already has an active internal assignment.",
      409,
    );
  }

  if (operation.capability_id) {
    const mappingResult = await supabase
      .from("internal_resource_capabilities")
      .select("resource_id, capability_id")
      .eq("resource_id", resource.id)
      .eq("capability_id", operation.capability_id)
      .maybeSingle();

    if (mappingResult.error) {
      return jsonError(mappingResult.error.message, 500);
    }

    if (!mappingResult.data) {
      return jsonError(
        "The required capability is not mapped to the selected resource.",
        400,
      );
    }
  }

  const insertResult = await supabase
    .from("internal_operation_assignments")
    .insert({
      organization_id: operation.organization_id,
      operation_id: operation.id,
      resource_id: resource.id,
      starts_at: startsAt,
      ends_at: endsAt,
      confidence_score: getConfidenceScore(body.confidence ?? null),
      risk_level: body.riskLevel ?? null,
      created_by: user.id,
    })
    .select(
      "id, organization_id, operation_id, resource_id, starts_at, ends_at, status, confidence_score, risk_level, created_by, created_at",
    )
    .single();

  if (insertResult.error) {
    return jsonError(insertResult.error.message, 500);
  }

  return NextResponse.json({ assignment: insertResult.data }, { status: 201 });
}
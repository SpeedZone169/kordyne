import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateScheduleBlockBody = {
  resourceId?: string;
  blockType?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  notes?: string | null;
  allDay?: boolean;
};

type ResourceRow = {
  id: string;
  organization_id: string;
  active: boolean;
};

const ALLOWED_BLOCK_TYPES = new Set([
  "maintenance",
  "downtime",
  "holiday",
  "internal_hold",
  "other",
]);

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

  let body: CreateScheduleBlockBody;

  try {
    body = (await request.json()) as CreateScheduleBlockBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const resourceId = normalizeOptionalText(body.resourceId);
  const blockType = normalizeOptionalText(body.blockType);
  const title = normalizeOptionalText(body.title);
  const notes = normalizeOptionalText(body.notes);
  const allDay = typeof body.allDay === "boolean" ? body.allDay : true;

  if (!resourceId) {
    return jsonError("resourceId is required.", 400);
  }

  if (!blockType || !ALLOWED_BLOCK_TYPES.has(blockType)) {
    return jsonError("blockType is invalid.", 400);
  }

  if (!title) {
    return jsonError("title is required.", 400);
  }

  let startsAt: string;
  let endsAt: string;

  try {
    startsAt = parseDateBoundary(normalizeOptionalText(body.startDate), "start");
    endsAt = parseDateBoundary(normalizeOptionalText(body.endDate), "end");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid schedule block dates.";
    return jsonError(message, 400);
  }

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return jsonError("endDate must be after startDate.", 400);
  }

  const resourceResult = await supabase
    .from("internal_resources")
    .select("id, organization_id, active")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceResult.error) {
    return jsonError(resourceResult.error.message, 500);
  }

  if (!resourceResult.data) {
    return jsonError("Resource not found.", 404);
  }

  const resource = resourceResult.data as ResourceRow;

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
    role: string | null;
  };

  if (membership.role !== "admin") {
    return jsonError(
      "Only customer organization admins can create internal schedule blocks.",
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
      "Internal schedule blocks are only available for customer organizations.",
      403,
    );
  }

  const insertResult = await supabase
    .from("internal_schedule_blocks")
    .insert({
      organization_id: resource.organization_id,
      resource_id: resource.id,
      block_type: blockType,
      title,
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      entered_by_user_id: user.id,
    })
    .select(
      "id, organization_id, resource_id, block_type, title, notes, starts_at, ends_at, all_day, entered_by_user_id, created_at, updated_at",
    )
    .single();

  if (insertResult.error) {
    return jsonError(insertResult.error.message, 500);
  }

  return NextResponse.json({ block: insertResult.data }, { status: 201 });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type UpdateScheduleBlockBody = {
  resourceId?: string;
  blockType?: string;
  title?: string;
  startDate?: string;
  endDate?: string;
  notes?: string | null;
  allDay?: boolean;
};

type RouteContext = {
  params: Promise<{
    blockId: string;
  }>;
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

async function getManagedBlock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  blockId: string,
  userId: string,
) {
  const blockResult = await supabase
    .from("internal_schedule_blocks")
    .select("id, organization_id, resource_id")
    .eq("id", blockId)
    .maybeSingle();

  if (blockResult.error) {
    return {
      ok: false as const,
      response: jsonError(blockResult.error.message, 500),
    };
  }

  if (!blockResult.data) {
    return {
      ok: false as const,
      response: jsonError("Schedule block not found.", 404),
    };
  }

  const block = blockResult.data as {
    id: string;
    organization_id: string;
    resource_id: string;
  };

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", block.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      ok: false as const,
      response: jsonError(membershipResult.error.message, 500),
    };
  }

  if (!membershipResult.data) {
    return {
      ok: false as const,
      response: jsonError("You do not have access to this organization.", 403),
    };
  }

  const membership = membershipResult.data as {
    organization_id: string;
    role: string | null;
  };

  if (membership.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can manage internal schedule blocks.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    block,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const { blockId } = await context.params;

  const managed = await getManagedBlock(supabase, blockId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  let body: UpdateScheduleBlockBody;

  try {
    body = (await request.json()) as UpdateScheduleBlockBody;
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
    .select("id, organization_id")
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
  };

  if (resource.organization_id !== managed.block.organization_id) {
    return jsonError(
      "Selected resource must belong to the same organization.",
      400,
    );
  }

  const updateResult = await supabase
    .from("internal_schedule_blocks")
    .update({
      resource_id: resource.id,
      block_type: blockType,
      title,
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId)
    .select(
      "id, organization_id, resource_id, block_type, title, notes, starts_at, ends_at, all_day, entered_by_user_id, created_at, updated_at",
    )
    .single();

  if (updateResult.error) {
    return jsonError(updateResult.error.message, 500);
  }

  return NextResponse.json({ block: updateResult.data }, { status: 200 });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const { blockId } = await context.params;

  const managed = await getManagedBlock(supabase, blockId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  const deleteResult = await supabase
    .from("internal_schedule_blocks")
    .delete()
    .eq("id", blockId);

  if (deleteResult.error) {
    return jsonError(deleteResult.error.message, 500);
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
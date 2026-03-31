import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

function toStartOfDayIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function toEndOfDayIso(value: string) {
  return new Date(`${value}T23:59:59`).toISOString();
}

export async function PATCH(request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const providerWorkCenterId =
    typeof body?.providerWorkCenterId === "string" ? body.providerWorkCenterId : null;
  const blockType =
    typeof body?.blockType === "string" ? body.blockType : null;
  const title =
    typeof body?.title === "string" ? body.title.trim() : "";
  const notes =
    typeof body?.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim()
      : null;
  const startDate =
    typeof body?.startDate === "string" ? body.startDate : null;
  const endDate =
    typeof body?.endDate === "string" ? body.endDate : null;
  const allDay =
    typeof body?.allDay === "boolean" ? body.allDay : true;

  if (!providerWorkCenterId) {
    return NextResponse.json(
      { error: "Work center is required." },
      { status: 400 },
    );
  }

  if (!blockType || !ALLOWED_BLOCK_TYPES.has(blockType)) {
    return NextResponse.json(
      { error: "Invalid block type." },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Block title is required." },
      { status: 400 },
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start date and end date are required." },
      { status: 400 },
    );
  }

  const { data: block, error: blockError } = await supabase
    .from("provider_schedule_blocks")
    .select("id, provider_org_id")
    .eq("id", blockId)
    .maybeSingle();

  if (blockError) {
    return NextResponse.json(
      { error: blockError.message },
      { status: 500 },
    );
  }

  if (!block) {
    return NextResponse.json(
      { error: "Schedule block not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", block.provider_org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );
  }

  if (!membership || !["admin", "engineer"].includes(membership.role ?? "")) {
    return NextResponse.json(
      { error: "You do not have permission to manage schedule blocks." },
      { status: 403 },
    );
  }

  const { data: workCenter, error: workCenterError } = await supabase
    .from("provider_work_centers")
    .select("id, provider_org_id")
    .eq("id", providerWorkCenterId)
    .maybeSingle();

  if (workCenterError) {
    return NextResponse.json(
      { error: workCenterError.message },
      { status: 500 },
    );
  }

  if (!workCenter || workCenter.provider_org_id !== block.provider_org_id) {
    return NextResponse.json(
      { error: "Work center does not belong to this provider organization." },
      { status: 400 },
    );
  }

  const startsAt = toStartOfDayIso(startDate);
  const endsAt = toEndOfDayIso(endDate);

  if (new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
    return NextResponse.json(
      { error: "End date must be after start date." },
      { status: 400 },
    );
  }

  const { error: updateError } = await supabase
    .from("provider_schedule_blocks")
    .update({
      provider_work_center_id: providerWorkCenterId,
      block_type: blockType,
      title,
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: block, error: blockError } = await supabase
    .from("provider_schedule_blocks")
    .select("id, provider_org_id")
    .eq("id", blockId)
    .maybeSingle();

  if (blockError) {
    return NextResponse.json(
      { error: blockError.message },
      { status: 500 },
    );
  }

  if (!block) {
    return NextResponse.json(
      { error: "Schedule block not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", block.provider_org_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );
  }

  if (!membership || !["admin", "engineer"].includes(membership.role ?? "")) {
    return NextResponse.json(
      { error: "You do not have permission to delete schedule blocks." },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabase
    .from("provider_schedule_blocks")
    .delete()
    .eq("id", blockId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
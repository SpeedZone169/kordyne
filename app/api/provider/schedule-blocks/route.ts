import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const providerOrgId =
    typeof body?.providerOrgId === "string" ? body.providerOrgId : null;
  const providerWorkCenterId =
    typeof body?.providerWorkCenterId === "string" &&
    body.providerWorkCenterId.length > 0
      ? body.providerWorkCenterId
      : null;
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

  if (!providerOrgId) {
    return NextResponse.json(
      { error: "Provider organization is required." },
      { status: 400 },
    );
  }

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

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", providerOrgId)
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

  if (!workCenter || workCenter.provider_org_id !== providerOrgId) {
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

  const { data: inserted, error: insertError } = await supabase
    .from("provider_schedule_blocks")
    .insert({
      provider_org_id: providerOrgId,
      provider_work_center_id: providerWorkCenterId,
      block_type: blockType,
      title,
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      all_day: allDay,
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    blockId: inserted.id,
    success: true,
  });
}
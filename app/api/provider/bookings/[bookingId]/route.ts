import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

const ALLOWED_PRIORITIES = new Set(["low", "normal", "high", "urgent"]);
const ALLOWED_STATUSES = new Set([
  "unscheduled",
  "scheduled",
  "in_progress",
  "paused",
  "completed",
  "cancelled",
]);

function toStartOfDayIso(value: string) {
  return new Date(`${value}T00:00:00`).toISOString();
}

function toEndOfDayIso(value: string) {
  return new Date(`${value}T23:59:59`).toISOString();
}

export async function PATCH(request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
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
    typeof body?.providerWorkCenterId === "string"
      ? body.providerWorkCenterId
      : null;
  const providerCapabilityId =
    typeof body?.providerCapabilityId === "string" &&
    body.providerCapabilityId.length > 0
      ? body.providerCapabilityId
      : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const notes =
    typeof body?.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim()
      : null;
  const priority = typeof body?.priority === "string" ? body.priority : null;
  const bookingStatus =
    typeof body?.bookingStatus === "string" ? body.bookingStatus : null;
  const startDate = typeof body?.startDate === "string" ? body.startDate : null;
  const endDate = typeof body?.endDate === "string" ? body.endDate : null;

  if (!providerWorkCenterId) {
    return NextResponse.json(
      { error: "Work center is required." },
      { status: 400 },
    );
  }

  if (!title) {
    return NextResponse.json(
      { error: "Booking title is required." },
      { status: 400 },
    );
  }

  if (!priority || !ALLOWED_PRIORITIES.has(priority)) {
    return NextResponse.json(
      { error: "Invalid priority." },
      { status: 400 },
    );
  }

  if (!bookingStatus || !ALLOWED_STATUSES.has(bookingStatus)) {
    return NextResponse.json(
      { error: "Invalid booking status." },
      { status: 400 },
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start date and end date are required." },
      { status: 400 },
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("provider_job_bookings")
    .select("id, provider_org_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", booking.provider_org_id)
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
      { error: "You do not have permission to manage bookings." },
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

  if (!workCenter || workCenter.provider_org_id !== booking.provider_org_id) {
    return NextResponse.json(
      { error: "Work center does not belong to this provider organization." },
      { status: 400 },
    );
  }

  if (providerCapabilityId) {
    const { data: capability, error: capabilityError } = await supabase
      .from("provider_capabilities")
      .select("id, provider_org_id")
      .eq("id", providerCapabilityId)
      .maybeSingle();

    if (capabilityError) {
      return NextResponse.json(
        { error: capabilityError.message },
        { status: 500 },
      );
    }

    if (!capability || capability.provider_org_id !== booking.provider_org_id) {
      return NextResponse.json(
        { error: "Capability does not belong to this provider organization." },
        { status: 400 },
      );
    }
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
    .from("provider_job_bookings")
    .update({
      provider_work_center_id: providerWorkCenterId,
      provider_capability_id: providerCapabilityId,
      title,
      notes,
      priority,
      booking_status: bookingStatus,
      starts_at: startsAt,
      ends_at: endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: booking, error: bookingError } = await supabase
    .from("provider_job_bookings")
    .select("id, provider_org_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (bookingError) {
    return NextResponse.json(
      { error: bookingError.message },
      { status: 500 },
    );
  }

  if (!booking) {
    return NextResponse.json(
      { error: "Booking not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", booking.provider_org_id)
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
      { error: "You do not have permission to delete bookings." },
      { status: 403 },
    );
  }

  const { error: deleteError } = await supabase
    .from("provider_job_bookings")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
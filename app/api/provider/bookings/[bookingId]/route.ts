import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDER_BOOKING_PRIORITIES,
  PROVIDER_BOOKING_STATUSES,
  getCapabilityInOrg,
  getManagedBooking,
  getWorkCenterInOrg,
  isAllowedValue,
  jsonError,
  parseDateRange,
  requireCapabilityMappedToWorkCenter,
  requireRouteUser,
} from "@/lib/provider-schedule";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
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
  const startDate =
    typeof body?.startDate === "string" ? body.startDate : null;
  const endDate = typeof body?.endDate === "string" ? body.endDate : null;

  if (!providerWorkCenterId) {
    return jsonError("Work center is required.", 400);
  }

  if (!title) {
    return jsonError("Booking title is required.", 400);
  }

  if (!isAllowedValue(priority, PROVIDER_BOOKING_PRIORITIES)) {
    return jsonError("Invalid priority.", 400);
  }

  if (!isAllowedValue(bookingStatus, PROVIDER_BOOKING_STATUSES)) {
    return jsonError("Invalid booking status.", 400);
  }

  const bookingResult = await getManagedBooking(
    supabase,
    bookingId,
    auth.user.id,
    "manage bookings",
  );

  if (!bookingResult.ok) {
    return bookingResult.response;
  }

  const workCenterResult = await getWorkCenterInOrg(
    supabase,
    providerWorkCenterId,
    bookingResult.booking.provider_org_id,
  );

  if (!workCenterResult.ok) {
    return workCenterResult.response;
  }

  if (providerCapabilityId) {
    const capabilityResult = await getCapabilityInOrg(
      supabase,
      providerCapabilityId,
      bookingResult.booking.provider_org_id,
    );

    if (!capabilityResult.ok) {
      return capabilityResult.response;
    }

    const mappingResult = await requireCapabilityMappedToWorkCenter(
      supabase,
      providerWorkCenterId,
      providerCapabilityId,
    );

    if (!mappingResult.ok) {
      return mappingResult.response;
    }
  }

  const rangeResult = parseDateRange(startDate, endDate);
  if (!rangeResult.ok) {
    return rangeResult.response;
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
      starts_at: rangeResult.startsAt,
      ends_at: rangeResult.endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { bookingId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
  }

  const bookingResult = await getManagedBooking(
    supabase,
    bookingId,
    auth.user.id,
    "delete bookings",
  );

  if (!bookingResult.ok) {
    return bookingResult.response;
  }

  const { error: deleteError } = await supabase
    .from("provider_job_bookings")
    .delete()
    .eq("id", bookingId);

  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  return NextResponse.json({ success: true });
}
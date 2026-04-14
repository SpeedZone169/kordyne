import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDER_BOOKING_PRIORITIES,
  ensureNoActiveBookingForPackage,
  getAwardedProviderPackageInOrg,
  getCapabilityInOrg,
  getWorkCenterInOrg,
  isAllowedValue,
  jsonError,
  parseDateRange,
  requireCapabilityMappedToWorkCenter,
  requireProviderOrgManager,
  requireRouteUser,
} from "@/lib/provider-schedule";

type LatestQuoteRow = {
  id: string;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);

  const providerOrgId =
    typeof body?.providerOrgId === "string" ? body.providerOrgId : null;
  const providerWorkCenterId =
    typeof body?.providerWorkCenterId === "string"
      ? body.providerWorkCenterId
      : null;
  const providerCapabilityId =
    typeof body?.providerCapabilityId === "string" &&
    body.providerCapabilityId.length > 0
      ? body.providerCapabilityId
      : null;
  const providerRequestPackageId =
    typeof body?.providerRequestPackageId === "string"
      ? body.providerRequestPackageId
      : null;
  const title =
    typeof body?.title === "string" && body.title.trim().length > 0
      ? body.title.trim()
      : null;
  const notes =
    typeof body?.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim()
      : null;
  const priority = typeof body?.priority === "string" ? body.priority : null;
  const startDate =
    typeof body?.startDate === "string" ? body.startDate : null;
  const endDate = typeof body?.endDate === "string" ? body.endDate : null;

  if (!providerOrgId) {
    return jsonError("Provider organization is required.", 400);
  }

  if (!providerWorkCenterId) {
    return jsonError("Work center is required.", 400);
  }

  if (!providerRequestPackageId) {
    return jsonError("Awarded package is required.", 400);
  }

  if (!isAllowedValue(priority, PROVIDER_BOOKING_PRIORITIES)) {
    return jsonError("Invalid priority.", 400);
  }

  const access = await requireProviderOrgManager(
    supabase,
    providerOrgId,
    auth.user.id,
    "create bookings",
  );

  if (!access.ok) {
    return access.response;
  }

  const workCenterResult = await getWorkCenterInOrg(
    supabase,
    providerWorkCenterId,
    providerOrgId,
  );

  if (!workCenterResult.ok) {
    return workCenterResult.response;
  }

  if (providerCapabilityId) {
    const capabilityResult = await getCapabilityInOrg(
      supabase,
      providerCapabilityId,
      providerOrgId,
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

  const packageResult = await getAwardedProviderPackageInOrg(
    supabase,
    providerRequestPackageId,
    providerOrgId,
  );

  if (!packageResult.ok) {
    return packageResult.response;
  }

  const duplicateResult = await ensureNoActiveBookingForPackage(
    supabase,
    providerRequestPackageId,
  );

  if (!duplicateResult.ok) {
    return duplicateResult.response;
  }

  const rangeResult = parseDateRange(startDate, endDate);
  if (!rangeResult.ok) {
    return rangeResult.response;
  }

  const { data: latestQuote, error: latestQuoteError } = await supabase
    .from("provider_quotes")
    .select("id")
    .eq("provider_request_package_id", packageResult.pkg.id)
    .order("quote_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestQuoteError) {
    return jsonError(latestQuoteError.message, 500);
  }

  const { data: inserted, error: insertError } = await supabase
    .from("provider_job_bookings")
    .insert({
      provider_org_id: providerOrgId,
      customer_org_id: packageResult.pkg.customer_org_id,
      provider_work_center_id: providerWorkCenterId,
      provider_capability_id: providerCapabilityId,
      provider_request_package_id: packageResult.pkg.id,
      provider_quote_id: (latestQuote as LatestQuoteRow | null)?.id ?? null,
      service_request_id: packageResult.pkg.service_request_id,
      booking_status: "scheduled",
      title: title || packageResult.pkg.package_title || "Scheduled job",
      notes,
      starts_at: rangeResult.startsAt,
      ends_at: rangeResult.endsAt,
      requested_quantity: packageResult.pkg.requested_quantity,
      priority,
      created_by_user_id: auth.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return jsonError(insertError.message, 500);
  }

  return NextResponse.json(
    {
      bookingId: inserted.id,
      success: true,
    },
    { status: 201 },
  );
}
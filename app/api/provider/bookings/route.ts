import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LatestQuoteRow = {
  id: string;
};

type PackageRow = {
  id: string;
  provider_org_id: string;
  customer_org_id: string | null;
  service_request_id: string | null;
  package_status: string;
  package_title: string | null;
  requested_quantity: number | null;
};

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
    typeof body?.providerWorkCenterId === "string" ? body.providerWorkCenterId : null;
  const providerCapabilityId =
    typeof body?.providerCapabilityId === "string" && body.providerCapabilityId.length > 0
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
  const priority =
    typeof body?.priority === "string" ? body.priority : "normal";
  const startDate =
    typeof body?.startDate === "string" ? body.startDate : null;
  const endDate = typeof body?.endDate === "string" ? body.endDate : null;

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

  if (!providerRequestPackageId) {
    return NextResponse.json(
      { error: "Awarded package is required." },
      { status: 400 },
    );
  }

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: "Start date and end date are required." },
      { status: 400 },
    );
  }

  if (!["low", "normal", "high", "urgent"].includes(priority)) {
    return NextResponse.json(
      { error: "Invalid priority." },
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
      { error: "You do not have permission to create bookings." },
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

    if (!capability || capability.provider_org_id !== providerOrgId) {
      return NextResponse.json(
        { error: "Capability does not belong to this provider organization." },
        { status: 400 },
      );
    }
  }

  const { data: pkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      "id, provider_org_id, customer_org_id, service_request_id, package_status, package_title, requested_quantity",
    )
    .eq("id", providerRequestPackageId)
    .maybeSingle();

  if (packageError) {
    return NextResponse.json(
      { error: packageError.message },
      { status: 500 },
    );
  }

  const typedPackage = pkg as PackageRow | null;

  if (!typedPackage || typedPackage.provider_org_id !== providerOrgId) {
    return NextResponse.json(
      { error: "Package not found for this provider organization." },
      { status: 404 },
    );
  }

  if (typedPackage.package_status !== "awarded") {
    return NextResponse.json(
      { error: "Only awarded packages can be turned into schedule bookings." },
      { status: 400 },
    );
  }

  const { data: latestQuote, error: latestQuoteError } = await supabase
    .from("provider_quotes")
    .select("id")
    .eq("provider_request_package_id", typedPackage.id)
    .order("quote_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestQuoteError) {
    return NextResponse.json(
      { error: latestQuoteError.message },
      { status: 500 },
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
    .from("provider_job_bookings")
    .insert({
      provider_org_id: providerOrgId,
      customer_org_id: typedPackage.customer_org_id,
      provider_work_center_id: providerWorkCenterId,
      provider_capability_id: providerCapabilityId,
      provider_request_package_id: typedPackage.id,
      provider_quote_id: (latestQuote as LatestQuoteRow | null)?.id ?? null,
      service_request_id: typedPackage.service_request_id,
      booking_status: "scheduled",
      title: title || typedPackage.package_title || "Scheduled job",
      notes,
      starts_at: startsAt,
      ends_at: endsAt,
      requested_quantity: typedPackage.requested_quantity,
      priority,
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
    bookingId: inserted.id,
    success: true,
  });
}
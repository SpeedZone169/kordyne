import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type AwardBody = {
  providerRequestPackageId?: string;
};

type MembershipRow = {
  organization_id: string;
  role: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: roundId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: AwardBody;

  try {
    body = (await request.json()) as AwardBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const selectedPackageId = String(body.providerRequestPackageId || "").trim();

  if (!selectedPackageId) {
    return NextResponse.json(
      { error: "Provider package is required." },
      { status: 400 },
    );
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 400 },
    );
  }

  const allowedMemberships = ((memberships ?? []) as MembershipRow[]).filter(
    (membership) => ["admin", "engineer"].includes(membership.role),
  );

  if (!allowedMemberships.length) {
    return NextResponse.json(
      { error: "You do not have permission to award providers." },
      { status: 403 },
    );
  }

  const membershipOrgIds = allowedMemberships.map(
    (membership) => membership.organization_id,
  );

  const { data: round, error: roundError } = await supabase
    .from("provider_quote_rounds")
    .select(
      `
        id,
        customer_org_id,
        service_request_id,
        status,
        selected_provider_package_id,
        awarded_at,
        closed_at
      `,
    )
    .eq("id", roundId)
    .single();

  if (roundError || !round) {
    return NextResponse.json(
      { error: roundError?.message || "Quote round not found." },
      { status: 404 },
    );
  }

  if (!membershipOrgIds.includes(round.customer_org_id)) {
    return NextResponse.json(
      { error: "You do not have access to award this quote round." },
      { status: 403 },
    );
  }

  if (
    round.awarded_at &&
    round.selected_provider_package_id &&
    round.selected_provider_package_id !== selectedPackageId
  ) {
    return NextResponse.json(
      { error: "This round has already been awarded to another provider." },
      { status: 409 },
    );
  }

  if (
    round.awarded_at &&
    round.selected_provider_package_id === selectedPackageId
  ) {
    return NextResponse.json({
      success: true,
      roundId,
      selectedProviderPackageId: selectedPackageId,
      alreadyAwarded: true,
    });
  }

  const { data: serviceRequest, error: serviceRequestError } = await supabase
    .from("service_requests")
    .select("id, organization_id, title, status")
    .eq("id", round.service_request_id)
    .single();

  if (serviceRequestError || !serviceRequest) {
    return NextResponse.json(
      { error: serviceRequestError?.message || "Service request not found." },
      { status: 404 },
    );
  }

  if (serviceRequest.organization_id !== round.customer_org_id) {
    return NextResponse.json(
      { error: "Round and request organization mismatch." },
      { status: 400 },
    );
  }

  const { data: packages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        provider_org_id,
        package_status
      `,
    )
    .eq("provider_quote_round_id", roundId);

  if (packagesError) {
    return NextResponse.json(
      { error: packagesError.message },
      { status: 400 },
    );
  }

  if (!packages?.length) {
    return NextResponse.json(
      { error: "No provider packages found for this round." },
      { status: 400 },
    );
  }

  const selectedPackage = packages.find((pkg) => pkg.id === selectedPackageId);

  if (!selectedPackage) {
    return NextResponse.json(
      { error: "Selected provider package does not belong to this round." },
      { status: 400 },
    );
  }

  const { count: selectedSubmittedQuoteCount, error: selectedQuoteCountError } =
    await supabase
      .from("provider_quotes")
      .select("*", { count: "exact", head: true })
      .eq("provider_request_package_id", selectedPackageId)
      .eq("status", "submitted");

  if (selectedQuoteCountError) {
    return NextResponse.json(
      { error: selectedQuoteCountError.message },
      { status: 400 },
    );
  }

  if (!selectedSubmittedQuoteCount || selectedSubmittedQuoteCount < 1) {
    return NextResponse.json(
      { error: "The selected provider package does not have a submitted quote." },
      { status: 400 },
    );
  }

  const losingPackageIds = packages
    .filter((pkg) => pkg.id !== selectedPackageId)
    .map((pkg) => pkg.id);

  const nowIso = new Date().toISOString();

  const { error: roundUpdateError } = await supabase
    .from("provider_quote_rounds")
    .update({
      selected_provider_package_id: selectedPackageId,
      status: "awarded",
      awarded_at: nowIso,
      closed_at: nowIso,
    })
    .eq("id", roundId);

  if (roundUpdateError) {
    return NextResponse.json(
      { error: roundUpdateError.message },
      { status: 400 },
    );
  }

  const { error: winnerUpdateError } = await supabase
    .from("provider_request_packages")
    .update({
      package_status: "awarded",
      awarded_at: nowIso,
      customer_visible_status: "Awarded",
    })
    .eq("id", selectedPackageId);

  if (winnerUpdateError) {
    return NextResponse.json(
      { error: winnerUpdateError.message },
      { status: 400 },
    );
  }

  if (losingPackageIds.length > 0) {
    const { error: loserUpdateError } = await supabase
      .from("provider_request_packages")
      .update({
        package_status: "not_awarded",
        customer_visible_status: "Not awarded",
      })
      .in("id", losingPackageIds);

    if (loserUpdateError) {
      return NextResponse.json(
        { error: loserUpdateError.message },
        { status: 400 },
      );
    }
  }

  const { error: winnerQuoteUpdateError } = await supabase
    .from("provider_quotes")
    .update({
      status: "accepted",
    })
    .eq("provider_request_package_id", selectedPackageId)
    .eq("status", "submitted");

  if (winnerQuoteUpdateError) {
    return NextResponse.json(
      { error: winnerQuoteUpdateError.message },
      { status: 400 },
    );
  }

  if (losingPackageIds.length > 0) {
    const { error: loserQuoteUpdateError } = await supabase
      .from("provider_quotes")
      .update({
        status: "rejected",
      })
      .in("provider_request_package_id", losingPackageIds)
      .eq("status", "submitted");

    if (loserQuoteUpdateError) {
      return NextResponse.json(
        { error: loserQuoteUpdateError.message },
        { status: 400 },
      );
    }
  }

  const { error: winnerEventError } = await supabase
    .from("provider_request_events")
    .insert({
      provider_request_package_id: selectedPackageId,
      actor_org_id: serviceRequest.organization_id,
      actor_user_id: user.id,
      event_type: "customer_awarded_provider",
      event_payload: {
        roundId,
        serviceRequestId: serviceRequest.id,
        selectedPackageId,
      },
    });

  if (winnerEventError) {
    console.error("Failed to insert winner provider event:", winnerEventError);
  }

  const { error: winnerMessageError } = await supabase
    .from("provider_messages")
    .insert({
      provider_request_package_id: selectedPackageId,
      sender_org_id: serviceRequest.organization_id,
      sender_user_id: user.id,
      message_type: "system_event",
      message_body: "Customer awarded this provider package.",
      is_system: true,
    });

  if (winnerMessageError) {
    console.error("Failed to insert winner provider message:", winnerMessageError);
  }

  if (losingPackageIds.length > 0) {
    const { error: losingMessagesError } = await supabase
      .from("provider_messages")
      .insert(
        losingPackageIds.map((packageId) => ({
          provider_request_package_id: packageId,
          sender_org_id: serviceRequest.organization_id,
          sender_user_id: user.id,
          message_type: "system_event",
          message_body: "This provider package was not awarded.",
          is_system: true,
        })),
      );

    if (losingMessagesError) {
      console.error("Failed to insert loser provider messages:", losingMessagesError);
    }
  }

  return NextResponse.json({
    success: true,
    roundId,
    selectedProviderPackageId: selectedPackageId,
  });
}
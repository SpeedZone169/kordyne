import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SubmitQuoteBody = {
  currencyCode?: string | null;
  setupPrice?: number | null;
  unitPrice?: number | null;
  totalPrice?: number | null;
  shippingPrice?: number | null;
  estimatedLeadTimeDays?: number | null;
  earliestStartDate?: string | null;
  estimatedCompletionDate?: string | null;
  quoteValidUntil?: string | null;
  notes?: string | null;
  exceptions?: string | null;
};

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: packageId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: SubmitQuoteBody;

  try {
    body = (await request.json()) as SubmitQuoteBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const currencyCode = toNullableString(body.currencyCode) ?? "EUR";
  const setupPrice = toNullableNumber(body.setupPrice);
  const unitPrice = toNullableNumber(body.unitPrice);
  const totalPrice = toNullableNumber(body.totalPrice);
  const shippingPrice = toNullableNumber(body.shippingPrice);
  const estimatedLeadTimeDays = toNullableNumber(body.estimatedLeadTimeDays);
  const earliestStartDate = toNullableString(body.earliestStartDate);
  const estimatedCompletionDate = toNullableString(body.estimatedCompletionDate);
  const quoteValidUntil = toNullableString(body.quoteValidUntil);
  const notes = toNullableString(body.notes);
  const exceptions = toNullableString(body.exceptions);

  if (totalPrice === null) {
    return NextResponse.json(
      { error: "Total price is required." },
      { status: 400 },
    );
  }

  if (estimatedLeadTimeDays === null) {
    return NextResponse.json(
      { error: "Estimated lead time is required." },
      { status: 400 },
    );
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 400 },
    );
  }

  const membershipOrgIds = (memberships ?? []).map((m) => m.organization_id);

  if (!membershipOrgIds.length) {
    return NextResponse.json(
      { error: "No organization membership found for current user." },
      { status: 403 },
    );
  }

  const { data: pkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        provider_quote_round_id,
        provider_org_id,
        customer_org_id,
        package_status,
        published_at
      `,
    )
    .eq("id", packageId)
    .single();

  if (packageError || !pkg) {
    return NextResponse.json(
      { error: packageError?.message || "Provider package not found." },
      { status: 404 },
    );
  }

  if (!pkg.published_at) {
    return NextResponse.json(
      { error: "This package has not been published yet." },
      { status: 400 },
    );
  }

  if (!membershipOrgIds.includes(pkg.provider_org_id)) {
    return NextResponse.json(
      { error: "You do not have access to submit a quote for this package." },
      { status: 403 },
    );
  }

  if (
    ["awarded", "not_awarded", "closed", "cancelled"].includes(
      pkg.package_status,
    )
  ) {
    return NextResponse.json(
      { error: "This package is no longer accepting quote submissions." },
      { status: 400 },
    );
  }

  const { data: latestQuotes, error: latestQuotesError } = await supabase
    .from("provider_quotes")
    .select("id, quote_version, status")
    .eq("provider_request_package_id", packageId)
    .order("quote_version", { ascending: false });

  if (latestQuotesError) {
    return NextResponse.json(
      { error: latestQuotesError.message },
      { status: 400 },
    );
  }

  const nextVersion = (latestQuotes?.[0]?.quote_version ?? 0) + 1;
  const nowIso = new Date().toISOString();
  const newPackageStatus =
    nextVersion === 1 ? "quote_submitted" : "quote_revised";

  if ((latestQuotes ?? []).length > 0) {
    const activeQuoteIds = latestQuotes
      .filter((quote) => ["draft", "submitted"].includes(quote.status))
      .map((quote) => quote.id);

    if (activeQuoteIds.length > 0) {
      const { error: supersedeError } = await supabase
        .from("provider_quotes")
        .update({ status: "superseded" })
        .in("id", activeQuoteIds);

      if (supersedeError) {
        return NextResponse.json(
          { error: supersedeError.message },
          { status: 400 },
        );
      }
    }
  }

  const { data: insertedQuote, error: insertQuoteError } = await supabase
    .from("provider_quotes")
    .insert({
      provider_request_package_id: packageId,
      provider_org_id: pkg.provider_org_id,
      quote_version: nextVersion,
      status: "submitted",
      currency_code: currencyCode,
      setup_price: setupPrice,
      unit_price: unitPrice,
      total_price: totalPrice,
      shipping_price: shippingPrice,
      estimated_lead_time_days: estimatedLeadTimeDays,
      earliest_start_date: earliestStartDate,
      estimated_completion_date: estimatedCompletionDate,
      quote_valid_until: quoteValidUntil,
      notes,
      exceptions,
      submitted_by_user_id: user.id,
      submitted_at: nowIso,
    })
    .select("id, quote_version")
    .single();

  if (insertQuoteError || !insertedQuote) {
    return NextResponse.json(
      { error: insertQuoteError?.message || "Failed to submit quote." },
      { status: 400 },
    );
  }

  const packageUpdates: Record<string, string | null> = {
    package_status: newPackageStatus,
    customer_visible_status:
      nextVersion === 1 ? "Quote submitted" : "Quote revised",
    provider_responded_at: nowIso,
  };

  const { error: packageUpdateError } = await supabase
    .from("provider_request_packages")
    .update(packageUpdates)
    .eq("id", packageId);

  if (packageUpdateError) {
    return NextResponse.json(
      { error: packageUpdateError.message },
      { status: 400 },
    );
  }

  const { error: roundUpdateError } = await supabase
    .from("provider_quote_rounds")
    .update({ status: "responses_open" })
    .eq("id", pkg.provider_quote_round_id);

  if (roundUpdateError) {
    return NextResponse.json(
      { error: roundUpdateError.message },
      { status: 400 },
    );
  }

  const { error: eventError } = await supabase
    .from("provider_request_events")
    .insert({
      provider_request_package_id: packageId,
      actor_org_id: pkg.provider_org_id,
      actor_user_id: user.id,
      event_type: "provider_quote_submitted",
      event_payload: {
        quoteVersion: nextVersion,
        totalPrice,
        currencyCode,
        estimatedLeadTimeDays,
      },
    });

  if (eventError) {
    return NextResponse.json(
      { error: eventError.message },
      { status: 400 },
    );
  }

  const { error: messageError } = await supabase.from("provider_messages").insert({
    provider_request_package_id: packageId,
    sender_org_id: pkg.provider_org_id,
    sender_user_id: user.id,
    message_type: "system_event",
    message_body:
      nextVersion === 1
        ? `Provider submitted quote v${nextVersion}.`
        : `Provider revised quote to v${nextVersion}.`,
    is_system: true,
  });

  if (messageError) {
    return NextResponse.json(
      { error: messageError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    quoteId: insertedQuote.id,
    quoteVersion: insertedQuote.quote_version,
  });
}
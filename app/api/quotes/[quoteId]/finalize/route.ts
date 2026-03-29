import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ quoteId: string }> },
) {
  const { quoteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 400 },
    );
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];

  const { data: quote, error: quoteError } = await supabase
    .from("provider_quotes")
    .select(
      `
        id,
        provider_request_package_id,
        provider_org_id,
        quote_reference,
        quote_version,
        status,
        currency_code,
        setup_price,
        unit_price,
        total_price,
        shipping_price,
        estimated_lead_time_days,
        earliest_start_date,
        estimated_completion_date,
        quote_valid_until,
        notes,
        exceptions,
        issued_at,
        submitted_at
      `,
    )
    .eq("id", quoteId)
    .single();

  if (quoteError || !quote) {
    return NextResponse.json({ error: "Quote not found." }, { status: 404 });
  }

  const canFinalize = memberships.some(
    (membership) =>
      membership.organization_id === quote.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  if (!canFinalize) {
    return NextResponse.json(
      { error: "You do not have permission to finalize this quote." },
      { status: 403 },
    );
  }

  const { data: pkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        service_request_id,
        customer_org_id,
        package_title,
        target_due_date,
        requested_quantity
      `,
    )
    .eq("id", quote.provider_request_package_id)
    .single();

  if (packageError || !pkg) {
    return NextResponse.json(
      { error: "Provider package not found." },
      { status: 404 },
    );
  }

  const [
    { data: providerOrg },
    { data: customerOrg },
    { data: providerCommercialProfile },
    { data: providerBrandProfile },
    { data: serviceRequest },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", quote.provider_org_id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", pkg.customer_org_id)
      .maybeSingle(),
    supabase
      .from("organization_commercial_profiles")
      .select(
        `
          legal_name,
          trading_name,
          address_line_1,
          address_line_2,
          city,
          region,
          postal_code,
          country,
          vat_number,
          company_number,
          contact_name,
          contact_email,
          contact_phone,
          website
        `,
      )
      .eq("organization_id", quote.provider_org_id)
      .maybeSingle(),
    supabase
      .from("provider_profiles")
      .select(
        `
          logo_path,
          website,
          short_description,
          country,
          city
        `,
      )
      .eq("organization_id", quote.provider_org_id)
      .maybeSingle(),
    supabase
      .from("service_requests")
      .select(
        `
          id,
          title,
          request_type,
          requested_item_name,
          requested_item_reference,
          target_process,
          target_material
        `,
      )
      .eq("id", pkg.service_request_id)
      .maybeSingle(),
  ]);

  const providerDisplayName =
    providerCommercialProfile?.trading_name ||
    providerCommercialProfile?.legal_name ||
    providerOrg?.name ||
    "Provider";

  const nowIso = new Date().toISOString();

  const snapshotJson = {
    quote: {
      id: quote.id,
      quoteReference: quote.quote_reference,
      quoteVersion: quote.quote_version,
      status: quote.status,
      currencyCode: quote.currency_code,
      setupPrice: quote.setup_price,
      unitPrice: quote.unit_price,
      totalPrice: quote.total_price,
      shippingPrice: quote.shipping_price,
      estimatedLeadTimeDays: quote.estimated_lead_time_days,
      earliestStartDate: quote.earliest_start_date,
      estimatedCompletionDate: quote.estimated_completion_date,
      quoteValidUntil: quote.quote_valid_until,
      notes: quote.notes,
      exceptions: quote.exceptions,
      issuedAt: quote.issued_at,
      submittedAt: quote.submitted_at,
    },
    provider: {
      organizationId: quote.provider_org_id,
      displayName: providerDisplayName,
      legalName: providerCommercialProfile?.legal_name ?? null,
      tradingName: providerCommercialProfile?.trading_name ?? null,
      addressLine1: providerCommercialProfile?.address_line_1 ?? null,
      addressLine2: providerCommercialProfile?.address_line_2 ?? null,
      city: providerCommercialProfile?.city ?? providerBrandProfile?.city ?? null,
      region: providerCommercialProfile?.region ?? null,
      postalCode: providerCommercialProfile?.postal_code ?? null,
      country:
        providerCommercialProfile?.country ?? providerBrandProfile?.country ?? null,
      vatNumber: providerCommercialProfile?.vat_number ?? null,
      companyNumber: providerCommercialProfile?.company_number ?? null,
      contactName: providerCommercialProfile?.contact_name ?? null,
      contactEmail: providerCommercialProfile?.contact_email ?? null,
      contactPhone: providerCommercialProfile?.contact_phone ?? null,
      website:
        providerCommercialProfile?.website ?? providerBrandProfile?.website ?? null,
      logoPath: providerBrandProfile?.logo_path ?? null,
      shortDescription: providerBrandProfile?.short_description ?? null,
    },
    customer: {
      organizationId: pkg.customer_org_id,
      name: customerOrg?.name ?? "Customer",
    },
    package: {
      id: pkg.id,
      title: pkg.package_title,
      targetDueDate: pkg.target_due_date,
      requestedQuantity: pkg.requested_quantity,
    },
    request: {
      id: serviceRequest?.id ?? pkg.service_request_id,
      title: serviceRequest?.title ?? null,
      requestType: serviceRequest?.request_type ?? null,
      requestedItemName: serviceRequest?.requested_item_name ?? null,
      requestedItemReference: serviceRequest?.requested_item_reference ?? null,
      targetProcess: serviceRequest?.target_process ?? null,
      targetMaterial: serviceRequest?.target_material ?? null,
    },
  };

  const { error: snapshotError } = await supabase
    .from("provider_quote_snapshots")
    .upsert(
      {
        provider_quote_id: quote.id,
        provider_org_id: quote.provider_org_id,
        customer_org_id: pkg.customer_org_id,
        service_request_id: pkg.service_request_id,
        snapshot_json: snapshotJson,
        finalized_at: nowIso,
        updated_at: nowIso,
      },
      {
        onConflict: "provider_quote_id",
      },
    );

  if (snapshotError) {
    return NextResponse.json(
      { error: snapshotError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    quoteId,
    finalizedAt: nowIso,
  });
}
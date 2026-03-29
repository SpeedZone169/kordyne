import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
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

  const { data: invoice, error: invoiceError } = await supabase
    .from("provider_invoices")
    .select(
      `
        id,
        provider_request_package_id,
        provider_quote_id,
        provider_org_id,
        customer_org_id,
        invoice_source,
        invoice_number,
        status,
        currency_code,
        subtotal_amount,
        tax_amount,
        total_amount,
        issued_at,
        due_date,
        paid_at,
        notes,
        uploaded_file_path,
        uploaded_file_name,
        uploaded_file_type
      `,
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const canFinalize = memberships.some(
    (membership) =>
      membership.organization_id === invoice.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  if (!canFinalize) {
    return NextResponse.json(
      { error: "You do not have permission to finalize this invoice." },
      { status: 403 },
    );
  }

  const [
    { data: providerOrg },
    { data: customerOrg },
    { data: providerCommercialProfile },
    { data: providerBrandProfile },
    { data: pkg },
    { data: serviceRequest },
    { data: quote },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", invoice.provider_org_id)
      .maybeSingle(),
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", invoice.customer_org_id)
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
      .eq("organization_id", invoice.provider_org_id)
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
      .eq("organization_id", invoice.provider_org_id)
      .maybeSingle(),
    supabase
      .from("provider_request_packages")
      .select(
        `
          id,
          package_title,
          requested_quantity,
          target_due_date,
          service_request_id
        `,
      )
      .eq("id", invoice.provider_request_package_id)
      .maybeSingle(),
    supabase
      .from("service_requests")
      .select(
        `
          id,
          title,
          requested_item_name,
          requested_item_reference,
          target_process,
          target_material
        `,
      )
      .eq(
        "id",
        (
          await supabase
            .from("provider_request_packages")
            .select("service_request_id")
            .eq("id", invoice.provider_request_package_id)
            .single()
        ).data?.service_request_id,
      )
      .maybeSingle(),
    invoice.provider_quote_id
      ? supabase
          .from("provider_quotes")
          .select(
            `
              id,
              quote_reference,
              quote_version,
              status,
              total_price,
              currency_code,
              submitted_at
            `,
          )
          .eq("id", invoice.provider_quote_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const providerDisplayName =
    providerCommercialProfile?.trading_name ||
    providerCommercialProfile?.legal_name ||
    providerOrg?.name ||
    "Provider";

  const nowIso = new Date().toISOString();

  const snapshotJson = {
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      invoiceSource: invoice.invoice_source,
      status: invoice.status,
      currencyCode: invoice.currency_code,
      subtotalAmount: invoice.subtotal_amount,
      taxAmount: invoice.tax_amount,
      totalAmount: invoice.total_amount,
      issuedAt: invoice.issued_at,
      dueDate: invoice.due_date,
      paidAt: invoice.paid_at,
      notes: invoice.notes,
      uploadedFilePath: invoice.uploaded_file_path,
      uploadedFileName: invoice.uploaded_file_name,
      uploadedFileType: invoice.uploaded_file_type,
    },
    provider: {
      organizationId: invoice.provider_org_id,
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
      organizationId: invoice.customer_org_id,
      name: customerOrg?.name ?? "Customer",
    },
    package: {
      id: pkg?.id ?? invoice.provider_request_package_id,
      title: pkg?.package_title ?? null,
      requestedQuantity: pkg?.requested_quantity ?? null,
      targetDueDate: pkg?.target_due_date ?? null,
    },
    request: {
      id: serviceRequest?.id ?? null,
      title: serviceRequest?.title ?? null,
      requestedItemName: serviceRequest?.requested_item_name ?? null,
      requestedItemReference: serviceRequest?.requested_item_reference ?? null,
      targetProcess: serviceRequest?.target_process ?? null,
      targetMaterial: serviceRequest?.target_material ?? null,
    },
    quote: quote
      ? {
          id: quote.id,
          quoteReference: quote.quote_reference,
          quoteVersion: quote.quote_version,
          status: quote.status,
          totalPrice: quote.total_price,
          currencyCode: quote.currency_code,
          submittedAt: quote.submitted_at,
        }
      : null,
  };

  const { error: updateError } = await supabase
    .from("provider_invoices")
    .update({
      snapshot_json: snapshotJson,
      finalized_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", invoiceId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    invoiceId,
    finalizedAt: nowIso,
  });
}
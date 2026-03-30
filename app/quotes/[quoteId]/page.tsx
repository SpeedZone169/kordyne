import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyValue, formatLeadTime } from "@/lib/providers";
import QuoteDocumentActions from "./QuoteDocumentActions";

type QuoteSnapshotData = {
  quote?: {
    id: string;
    quoteReference: string | null;
    quoteVersion: number | null;
    status: string;
    currencyCode: string | null;
    setupPrice: number | null;
    unitPrice: number | null;
    totalPrice: number | null;
    shippingPrice: number | null;
    estimatedLeadTimeDays: number | null;
    earliestStartDate: string | null;
    estimatedCompletionDate: string | null;
    quoteValidUntil: string | null;
    notes: string | null;
    exceptions: string | null;
    issuedAt: string | null;
    submittedAt: string | null;
  };
  provider?: Record<string, unknown>;
  customer?: Record<string, unknown>;
  package?: Record<string, unknown>;
  request?: Record<string, unknown>;
};

type PageProps = {
  params: Promise<{
    quoteId: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
  role: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(date);
}

export default async function QuoteDocumentPage({ params }: PageProps) {
  const { quoteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];
  const membershipOrgIds = memberships.map((m) => m.organization_id);

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
    notFound();
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
    notFound();
  }

  const allowed =
    membershipOrgIds.includes(quote.provider_org_id) ||
    membershipOrgIds.includes(pkg.customer_org_id);

  if (!allowed) {
    notFound();
  }

  const canFinalizeSnapshot = memberships.some(
    (membership) =>
      membership.organization_id === quote.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  const [
    { data: snapshot },
    { data: providerOrg },
    { data: customerOrg },
    { data: providerProfile },
    { data: providerBrandProfile },
    { data: serviceRequest },
  ] = await Promise.all([
    supabase
      .from("provider_quote_snapshots")
      .select("snapshot_json, finalized_at")
      .eq("provider_quote_id", quoteId)
      .maybeSingle(),
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

  const snapshotData = (snapshot?.snapshot_json ?? {}) as QuoteSnapshotData;

  const quoteData = snapshotData.quote ?? {
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
  };

  const providerData = snapshotData.provider ?? {
    organizationId: quote.provider_org_id,
    displayName:
      providerProfile?.trading_name ||
      providerProfile?.legal_name ||
      providerOrg?.name ||
      "Provider",
    legalName: providerProfile?.legal_name ?? null,
    tradingName: providerProfile?.trading_name ?? null,
    addressLine1: providerProfile?.address_line_1 ?? null,
    addressLine2: providerProfile?.address_line_2 ?? null,
    city: providerProfile?.city ?? providerBrandProfile?.city ?? null,
    region: providerProfile?.region ?? null,
    postalCode: providerProfile?.postal_code ?? null,
    country: providerProfile?.country ?? providerBrandProfile?.country ?? null,
    vatNumber: providerProfile?.vat_number ?? null,
    companyNumber: providerProfile?.company_number ?? null,
    contactName: providerProfile?.contact_name ?? null,
    contactEmail: providerProfile?.contact_email ?? null,
    contactPhone: providerProfile?.contact_phone ?? null,
    website: providerProfile?.website ?? providerBrandProfile?.website ?? null,
    logoPath: providerBrandProfile?.logo_path ?? null,
    shortDescription: providerBrandProfile?.short_description ?? null,
  };

  const customerData = snapshotData.customer ?? {
    organizationId: pkg.customer_org_id,
    name: customerOrg?.name ?? "Customer",
  };

  const packageData = snapshotData.package ?? {
    id: pkg.id,
    title: pkg.package_title,
    targetDueDate: pkg.target_due_date,
    requestedQuantity: pkg.requested_quantity,
  };

  const requestData = snapshotData.request ?? {
    id: serviceRequest?.id ?? pkg.service_request_id,
    title: serviceRequest?.title ?? null,
    requestType: serviceRequest?.request_type ?? null,
    requestedItemName: serviceRequest?.requested_item_name ?? null,
    requestedItemReference: serviceRequest?.requested_item_reference ?? null,
    targetProcess: serviceRequest?.target_process ?? null,
    targetMaterial: serviceRequest?.target_material ?? null,
  };

  const providerLogoUrl = providerData.logoPath
    ? supabase.storage.from("provider-assets").getPublicUrl(providerData.logoPath)
        .data.publicUrl
    : null;

  const providerLocation =
    [providerData.city, providerData.region, providerData.country]
      .filter(Boolean)
      .join(", ") || "—";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="flex flex-col gap-8 border-b border-slate-200 pb-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-slate-200 bg-white">
              {providerLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={providerLogoUrl}
                  alt={`${providerData.displayName} logo`}
                  className="max-h-16 w-auto object-contain"
                />
              ) : (
                <div className="px-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  No logo
                </div>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-500">
                Formal Quote
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {quoteData.quoteReference || "Quote"}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Version {quoteData.quoteVersion}
              </p>

              <div className="mt-5 space-y-1">
                <p className="text-lg font-semibold text-slate-950">
                  {providerData.displayName}
                </p>

                {providerData.legalName &&
                providerData.legalName !== providerData.displayName ? (
                  <p className="text-sm text-slate-600">
                    {providerData.legalName}
                  </p>
                ) : null}

                <p className="text-sm text-slate-600">{providerLocation}</p>

                {providerData.website ? (
                  <p className="text-sm text-slate-600">{providerData.website}</p>
                ) : null}
              </div>
            </div>
          </div>

          <QuoteDocumentActions
            quoteId={quoteId}
            canFinalizeSnapshot={canFinalizeSnapshot}
            hasSnapshot={Boolean(snapshot)}
            snapshotFinalizedAt={snapshot?.finalized_at ?? null}
          />
        </div>

        <div className="grid gap-10 pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Provider
            </p>

            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {providerData.displayName}
              </p>

              {providerData.legalName &&
              providerData.legalName !== providerData.displayName ? (
                <p>{providerData.legalName}</p>
              ) : null}

              <p>{providerData.addressLine1 || "—"}</p>

              {providerData.addressLine2 ? <p>{providerData.addressLine2}</p> : null}

              <p>
                {[providerData.city, providerData.region]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>

              <p>
                {[providerData.postalCode, providerData.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>

              <p>VAT: {providerData.vatNumber || "—"}</p>
              <p>Company No.: {providerData.companyNumber || "—"}</p>
              <p>Contact: {providerData.contactName || "—"}</p>
              <p>Email: {providerData.contactEmail || "—"}</p>
              <p>Phone: {providerData.contactPhone || "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Customer
            </p>

            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {customerData.name || "Customer"}
              </p>
              <p>Package: {packageData.title || "Provider package"}</p>
              <p>
                Request: {requestData.title || requestData.requestedItemName || "—"}
              </p>
              <p>Reference: {requestData.requestedItemReference || "—"}</p>
              <p>Quantity: {packageData.requestedQuantity ?? "—"}</p>
              <p>Target due date: {formatDate(packageData.targetDueDate)}</p>
              <p>Process: {requestData.targetProcess || "—"}</p>
              <p>Material: {requestData.targetMaterial || "—"}</p>
            </div>
          </div>
        </div>

        {providerData.shortDescription ? (
          <div className="mt-8 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Provider summary
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {providerData.shortDescription}
            </p>
          </div>
        ) : null}

        <div className="mt-10 overflow-hidden rounded-[24px] border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-slate-600">
                  Commercial item
                </th>
                <th className="px-4 py-3 text-right font-medium text-slate-600">
                  Value
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              <tr>
                <td className="px-4 py-3 text-slate-700">Setup price</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrencyValue(
                    quoteData.setupPrice,
                    quoteData.currencyCode ?? undefined,
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Unit price</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrencyValue(
                    quoteData.unitPrice,
                    quoteData.currencyCode ?? undefined,
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Shipping</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrencyValue(
                    quoteData.shippingPrice,
                    quoteData.currencyCode ?? undefined,
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Total price</td>
                <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">
                  {formatCurrencyValue(
                    quoteData.totalPrice,
                    quoteData.currencyCode ?? undefined,
                  )}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Lead time</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatLeadTime(quoteData.estimatedLeadTimeDays)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Earliest start</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatDate(quoteData.earliestStartDate)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Estimated completion</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatDate(quoteData.estimatedCompletionDate)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Notes
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {quoteData.notes || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Exceptions
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {quoteData.exceptions || "—"}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">
            <p>
              This quote was issued through Kordyne as a structured provider
              response. Commercial acceptance, tax treatment, and fulfilment terms
              should follow the provider’s agreed commercial process.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={28}
              height={28}
              className="h-7 w-auto"
            />
            <span className="text-xs font-medium text-slate-600">
              Issued via Kordyne
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
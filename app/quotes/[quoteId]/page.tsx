import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyValue, formatLeadTime } from "@/lib/providers";

type PageProps = {
  params: Promise<{
    quoteId: string;
  }>;
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

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipOrgIds = (memberships ?? []).map((m) => m.organization_id);

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

  const { data: providerOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", quote.provider_org_id)
    .maybeSingle();

  const { data: customerOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", pkg.customer_org_id)
    .maybeSingle();

  const { data: providerProfile } = await supabase
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
    .maybeSingle();

  const { data: serviceRequest } = await supabase
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
    .maybeSingle();

  const providerDisplayName =
    providerProfile?.trading_name ||
    providerProfile?.legal_name ||
    providerOrg?.name ||
    "Provider";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-10 shadow-sm print:rounded-none print:border-0 print:shadow-none">
        <div className="flex items-start justify-between gap-8 border-b border-slate-200 pb-8">
          <div className="flex items-center gap-4">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={56}
              height={56}
              className="h-14 w-auto"
              priority
            />
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
                Formal Quote
              </p>
              <h1 className="text-3xl font-semibold text-slate-900">
                {quote.quote_reference || "Quote"}
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Version {quote.quote_version}
              </p>
            </div>
          </div>

          <div className="text-right text-sm text-slate-600">
            <p>Issued: {formatDate(quote.issued_at || quote.submitted_at)}</p>
            <p>Valid until: {formatDate(quote.quote_valid_until)}</p>
          </div>
        </div>

        <div className="grid gap-10 pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Provider
            </p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{providerDisplayName}</p>
              {providerProfile?.legal_name &&
              providerProfile.legal_name !== providerDisplayName ? (
                <p>{providerProfile.legal_name}</p>
              ) : null}
              <p>{providerProfile?.address_line_1 || "—"}</p>
              {providerProfile?.address_line_2 ? (
                <p>{providerProfile.address_line_2}</p>
              ) : null}
              <p>
                {[providerProfile?.city, providerProfile?.region]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p>
                {[providerProfile?.postal_code, providerProfile?.country]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
              <p>VAT: {providerProfile?.vat_number || "—"}</p>
              <p>Company No.: {providerProfile?.company_number || "—"}</p>
              <p>Contact: {providerProfile?.contact_name || "—"}</p>
              <p>Email: {providerProfile?.contact_email || "—"}</p>
              <p>Phone: {providerProfile?.contact_phone || "—"}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Customer
            </p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {customerOrg?.name || "Customer"}
              </p>
              <p>Package: {pkg.package_title || "Provider package"}</p>
              <p>
                Request:{" "}
                {serviceRequest?.title ||
                  serviceRequest?.requested_item_name ||
                  "—"}
              </p>
              <p>
                Reference: {serviceRequest?.requested_item_reference || "—"}
              </p>
              <p>Quantity: {pkg.requested_quantity ?? "—"}</p>
              <p>Target due date: {formatDate(pkg.target_due_date)}</p>
              <p>Process: {serviceRequest?.target_process || "—"}</p>
              <p>Material: {serviceRequest?.target_material || "—"}</p>
            </div>
          </div>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200">
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
                  {formatCurrencyValue(quote.setup_price, quote.currency_code)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Unit price</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrencyValue(quote.unit_price, quote.currency_code)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Shipping</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatCurrencyValue(quote.shipping_price, quote.currency_code)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Total price</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatCurrencyValue(quote.total_price, quote.currency_code)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Lead time</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatLeadTime(quote.estimated_lead_time_days)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Earliest start</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatDate(quote.earliest_start_date)}
                </td>
              </tr>
              <tr>
                <td className="px-4 py-3 text-slate-700">Estimated completion</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {formatDate(quote.estimated_completion_date)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Notes
            </p>
            <p className="mt-3 text-sm text-slate-700">
              {quote.notes || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Exceptions
            </p>
            <p className="mt-3 text-sm text-slate-700">
              {quote.exceptions || "—"}
            </p>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-200 pt-6 text-xs text-slate-500">
          <p>
            This quote was issued through Kordyne as a structured provider
            response. Commercial acceptance, tax treatment, and fulfilment terms
            should follow the provider’s agreed commercial process.
          </p>
        </div>
      </div>
    </div>
  );
}
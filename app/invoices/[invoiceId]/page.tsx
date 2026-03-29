import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyValue } from "@/lib/providers";
import InvoiceDocumentActions from "./InvoiceDocumentActions";

type PageProps = {
  params: Promise<{
    invoiceId: string;
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

function getInvoiceStatusClasses(status: string) {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    case "viewed":
      return "bg-sky-100 text-sky-700";
    case "sent":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default async function InvoiceDocumentPage({ params }: PageProps) {
  const { invoiceId } = await params;
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

  const { data: invoiceRaw, error: invoiceError } = await supabase
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
        uploaded_file_type,
        snapshot_json,
        finalized_at
      `,
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoiceRaw) {
    notFound();
  }

  const allowed =
    membershipOrgIds.includes(invoiceRaw.provider_org_id) ||
    membershipOrgIds.includes(invoiceRaw.customer_org_id);

  if (!allowed) {
    notFound();
  }

  const isProviderMember = memberships.some(
    (membership) => membership.organization_id === invoiceRaw.provider_org_id,
  );

  const isProviderManager = memberships.some(
    (membership) =>
      membership.organization_id === invoiceRaw.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  const isCustomerMember = memberships.some(
    (membership) => membership.organization_id === invoiceRaw.customer_org_id,
  );

  let invoice = invoiceRaw;

  if (
    isCustomerMember &&
    !isProviderMember &&
    (invoice.status === "issued" || invoice.status === "sent")
  ) {
    const { data: viewedInvoice } = await supabase
      .from("provider_invoices")
      .update({
        status: "viewed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
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
          uploaded_file_type,
          snapshot_json,
          finalized_at
        `,
      )
      .single();

    if (viewedInvoice) {
      invoice = viewedInvoice;
    }
  }

  const [
    { data: providerOrg },
    { data: customerOrg },
    { data: providerCommercialProfile },
    { data: providerBrandProfile },
    { data: pkg },
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
  ]);

  const { data: serviceRequest } = await supabase
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
    .eq("id", pkg?.service_request_id || "")
    .maybeSingle();

  const snapshotData = (invoice.snapshot_json ?? {}) as Record<string, any>;

  const invoiceData = snapshotData.invoice ?? {
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
  };

  const providerData = snapshotData.provider ?? {
    organizationId: invoice.provider_org_id,
    displayName:
      providerCommercialProfile?.trading_name ||
      providerCommercialProfile?.legal_name ||
      providerOrg?.name ||
      "Provider",
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
  };

  const customerData = snapshotData.customer ?? {
    organizationId: invoice.customer_org_id,
    name: customerOrg?.name ?? "Customer",
  };

  const packageData = snapshotData.package ?? {
    id: pkg?.id ?? invoice.provider_request_package_id,
    title: pkg?.package_title ?? null,
    requestedQuantity: pkg?.requested_quantity ?? null,
    targetDueDate: pkg?.target_due_date ?? null,
  };

  const requestData = snapshotData.request ?? {
    id: serviceRequest?.id ?? null,
    title: serviceRequest?.title ?? null,
    requestedItemName: serviceRequest?.requested_item_name ?? null,
    requestedItemReference: serviceRequest?.requested_item_reference ?? null,
    targetProcess: serviceRequest?.target_process ?? null,
    targetMaterial: serviceRequest?.target_material ?? null,
  };

  const quoteData = snapshotData.quote ?? null;

  const providerLogoUrl = providerData.logoPath
    ? supabase.storage
        .from("provider-assets")
        .getPublicUrl(providerData.logoPath).data.publicUrl
    : null;

  const uploadedInvoiceUrl =
    invoice.invoice_source === "provider_uploaded" && invoice.uploaded_file_path
      ? (
          await supabase.storage
            .from("provider-invoices")
            .createSignedUrl(invoice.uploaded_file_path, 60 * 15, {
              download: invoice.uploaded_file_name || "invoice.pdf",
            })
        ).data?.signedUrl ?? null
      : null;

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
                Invoice
              </p>

              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                {invoice.invoice_number}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                  {invoice.invoice_source.replace("_", " ")}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${getInvoiceStatusClasses(
                    invoice.status,
                  )}`}
                >
                  {invoice.status}
                </span>
              </div>

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

                {providerData.website ? (
                  <p className="text-sm text-slate-600">{providerData.website}</p>
                ) : null}
              </div>
            </div>
          </div>

          <InvoiceDocumentActions
            invoiceId={invoice.id}
            status={invoice.status}
            canManageStatus={isProviderManager}
            canFinalizeSnapshot={isProviderManager}
            finalizedAt={invoice.finalized_at}
            invoiceSource={invoice.invoice_source}
            uploadedInvoiceUrl={uploadedInvoiceUrl}
          />
        </div>

        <div className="grid gap-10 pt-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Provider
            </p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{providerData.displayName}</p>
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

        {invoice.invoice_source === "provider_uploaded" ? (
          <div className="mt-10 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Uploaded provider invoice
            </p>
            <p className="mt-3 text-sm text-slate-700">
              This invoice was uploaded by the provider as their own official finance document.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">File</div>
                <div className="mt-1 font-medium text-slate-900">
                  {invoice.uploaded_file_name || "invoice.pdf"}
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">Type</div>
                <div className="mt-1 font-medium text-slate-900">
                  {invoice.uploaded_file_type || "application/pdf"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 overflow-hidden rounded-[24px] border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">
                    Invoice item
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">
                    Value
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-4 py-3 text-slate-700">Subtotal</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrencyValue(
                      invoiceData.subtotalAmount,
                      invoiceData.currencyCode ?? undefined,
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-700">Tax</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {formatCurrencyValue(
                      invoiceData.taxAmount,
                      invoiceData.currencyCode ?? undefined,
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right text-base font-semibold text-slate-900">
                    {formatCurrencyValue(
                      invoiceData.totalAmount,
                      invoiceData.currencyCode ?? undefined,
                    )}
                  </td>
                </tr>
                {quoteData?.quoteReference ? (
                  <tr>
                    <td className="px-4 py-3 text-slate-700">Related quote</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {quoteData.quoteReference}
                      {quoteData.quoteVersion ? ` v${quoteData.quoteVersion}` : ""}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Notes
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              {invoiceData.notes || "—"}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Billing dates
            </p>
            <div className="mt-3 space-y-1 text-sm text-slate-700">
              <p>Issued: {formatDate(invoice.issued_at)}</p>
              <p>Due: {formatDate(invoice.due_date)}</p>
              <p>Paid: {formatDate(invoice.paid_at)}</p>
              <p>Snapshot finalized: {formatDate(invoice.finalized_at)}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs leading-5 text-slate-500">
            <p>
              This invoice is managed through Kordyne. Commercial acceptance, payment handling,
              tax treatment, and supplier finance obligations should follow the provider’s agreed process.
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
              Managed via Kordyne
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
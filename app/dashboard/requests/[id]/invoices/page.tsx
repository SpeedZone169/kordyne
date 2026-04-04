import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCurrencyValue } from "@/lib/providers";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type InvoiceRow = {
  id: string;
  provider_request_package_id: string;
  provider_org_id: string;
  invoice_source: "kordyne_generated" | "provider_uploaded";
  invoice_number: string;
  status: string;
  currency_code: string | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  uploaded_file_name: string | null;
  created_at: string;
};

type PackageRow = {
  id: string;
  provider_org_id: string;
  package_title: string | null;
  package_status: string;
  awarded_at: string | null;
};

type QuoteRow = {
  id: string;
  provider_request_package_id: string;
  quote_version: number;
  status: string;
  currency_code: string | null;
  total_price: number | null;
  submitted_at: string | null;
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

function getApActionSummary(status: string, paidAt: string | null) {
  if (paidAt || status === "paid") {
    return {
      label: "Paid",
      helper: "Payment is recorded for this invoice.",
      tone: "bg-emerald-100 text-emerald-700",
    };
  }

  if (status === "viewed") {
    return {
      label: "Approval pending",
      helper: "Customer has opened the invoice. AP processing should continue.",
      tone: "bg-sky-100 text-sky-700",
    };
  }

  return {
    label: "Receipt required",
    helper: "Invoice has been issued and should be received into AP workflow.",
    tone: "bg-amber-100 text-amber-700",
  };
}

function getCurrency(invoice: Pick<InvoiceRow, "currency_code">, poCurrency?: string | null) {
  return invoice.currency_code || poCurrency || "EUR";
}

export default async function CustomerRequestInvoicesPage({
  params,
}: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select("id, organization_id, title, requested_item_name")
    .eq("id", id)
    .single();

  if (requestError || !request) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", request.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: packages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .select("id, provider_org_id, package_title, package_status, awarded_at")
    .eq("service_request_id", id)
    .order("created_at", { ascending: false });

  if (packagesError) {
    throw new Error(packagesError.message);
  }

  const packageRows = (packages ?? []) as PackageRow[];
  const packageIds = packageRows.map((pkg) => pkg.id);
  const providerOrgIds = [...new Set(packageRows.map((pkg) => pkg.provider_org_id))];

  let invoices: InvoiceRow[] = [];
  let providerNames = new Map<string, string>();
  const packageTitles = new Map<string, string | null>();

  for (const pkg of packageRows) {
    packageTitles.set(pkg.id, pkg.package_title);
  }

  if (providerOrgIds.length > 0) {
    const { data: providerOrgs, error: providerOrgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", providerOrgIds);

    if (providerOrgsError) {
      throw new Error(providerOrgsError.message);
    }

    providerNames = new Map((providerOrgs ?? []).map((org) => [org.id, org.name]));
  }

  if (packageIds.length > 0) {
    const { data: invoicesRaw, error: invoicesError } = await supabase
      .from("provider_invoices")
      .select(
        `
          id,
          provider_request_package_id,
          provider_org_id,
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
          uploaded_file_name,
          created_at
        `,
      )
      .in("provider_request_package_id", packageIds)
      .order("created_at", { ascending: false });

    if (invoicesError) {
      throw new Error(invoicesError.message);
    }

    invoices = (invoicesRaw ?? []) as InvoiceRow[];
  }

  let quotesByPackageId = new Map<string, QuoteRow[]>();

  if (packageIds.length > 0) {
    const { data: quotesRaw, error: quotesError } = await supabase
      .from("provider_quotes")
      .select(
        `
          id,
          provider_request_package_id,
          quote_version,
          status,
          currency_code,
          total_price,
          submitted_at
        `,
      )
      .in("provider_request_package_id", packageIds)
      .order("quote_version", { ascending: false });

    if (quotesError) {
      throw new Error(quotesError.message);
    }

    for (const quote of (quotesRaw ?? []) as QuoteRow[]) {
      const current = quotesByPackageId.get(quote.provider_request_package_id) ?? [];
      current.push(quote);
      quotesByPackageId.set(quote.provider_request_package_id, current);
    }
  }

  const poTotalByPackageId = new Map<string, number | null>();
  const poCurrencyByPackageId = new Map<string, string | null>();

  for (const pkg of packageRows) {
    const packageQuotes = quotesByPackageId.get(pkg.id) ?? [];
    const chosenQuote =
      packageQuotes.find((quote) => quote.status === "submitted") ??
      packageQuotes[0] ??
      null;

    poTotalByPackageId.set(pkg.id, chosenQuote?.total_price ?? null);
    poCurrencyByPackageId.set(pkg.id, chosenQuote?.currency_code ?? null);
  }

  const invoicesByPackageId = new Map<string, InvoiceRow[]>();
  for (const invoice of invoices) {
    const current = invoicesByPackageId.get(invoice.provider_request_package_id) ?? [];
    current.push(invoice);
    invoicesByPackageId.set(invoice.provider_request_package_id, current);
  }

  const requestPoTotal = packageRows.reduce((sum, pkg) => {
    return sum + (poTotalByPackageId.get(pkg.id) ?? 0);
  }, 0);

  const requestInvoicedTotal = invoices.reduce((sum, invoice) => {
    return sum + (invoice.total_amount ?? 0);
  }, 0);

  const requestRemainingTotal = Math.max(requestPoTotal - requestInvoicedTotal, 0);
  const unpaidInvoicesCount = invoices.filter(
    (invoice) => !invoice.paid_at && invoice.status !== "paid",
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Request billing
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Invoices for this request
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Review provider invoices, current PO consumption, and next AP actions.
            </p>
            <p className="mt-3 text-sm text-slate-700">
              Request:{" "}
              <span className="font-medium">
                {request.title || request.requested_item_name || "Untitled request"}
              </span>
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/requests/${id}`}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Back to request
            </Link>

            <Link
              href={`/dashboard/requests/${id}/quotes`}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              View quotes
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">PO total</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrencyValue(requestPoTotal, "EUR")}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Based on current package quote totals.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Invoiced</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrencyValue(requestInvoicedTotal, "EUR")}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Total value already billed against this request.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">Remaining</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {formatCurrencyValue(requestRemainingTotal, "EUR")}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Estimated balance still available on awarded value.
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm text-slate-500">AP attention</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {unpaidInvoicesCount}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Open invoice{unpaidInvoicesCount === 1 ? "" : "s"} still needing action.
          </p>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Invoice documents
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Generated and uploaded provider invoices linked to this request.
            </p>
          </div>

          <div className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-4 py-2 text-sm font-medium text-slate-700">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"}
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-8 text-sm text-slate-600">
            No invoices have been issued for this request yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {invoices.map((invoice) => {
              const packageInvoices =
                invoicesByPackageId.get(invoice.provider_request_package_id) ?? [];

              const sortedPackageInvoices = [...packageInvoices].sort((a, b) => {
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
              });

              const currentIndex = sortedPackageInvoices.findIndex(
                (item) => item.id === invoice.id,
              );

              const cumulativeInvoiced = sortedPackageInvoices
                .slice(0, currentIndex + 1)
                .reduce((sum, item) => sum + (item.total_amount ?? 0), 0);

              const packageInvoicedTotal = sortedPackageInvoices.reduce(
                (sum, item) => sum + (item.total_amount ?? 0),
                0,
              );

              const poTotal =
                poTotalByPackageId.get(invoice.provider_request_package_id) ?? null;
              const poCurrency =
                poCurrencyByPackageId.get(invoice.provider_request_package_id) ?? null;
              const currency = getCurrency(invoice, poCurrency);

              const remainingBalance =
                typeof poTotal === "number"
                  ? Math.max(poTotal - cumulativeInvoiced, 0)
                  : null;

              const isFinalInvoice =
                typeof poTotal === "number" &&
                Math.abs(packageInvoicedTotal - poTotal) < 0.0001;

              const apAction = getApActionSummary(invoice.status, invoice.paid_at);

              return (
                <div
                  key={invoice.id}
                  className="rounded-[24px] border border-zinc-200 p-6"
                >
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1.28fr)_360px] xl:items-start">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {invoice.invoice_number}
                        </h3>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${getInvoiceStatusClasses(
                            invoice.status,
                          )}`}
                        >
                          {invoice.status}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                          {invoice.invoice_source.replace("_", " ")}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            isFinalInvoice
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {isFinalInvoice ? "Final" : "Partial"}
                        </span>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          Provider:{" "}
                          {providerNames.get(invoice.provider_org_id) || "Provider"}
                        </p>
                        <p>
                          Package:{" "}
                          {packageTitles.get(invoice.provider_request_package_id) ||
                            "Provider package"}
                        </p>
                        <p>Issued: {formatDate(invoice.issued_at)}</p>
                        <p>Due: {formatDate(invoice.due_date)}</p>
                        <p>Paid: {formatDate(invoice.paid_at)}</p>
                        {invoice.uploaded_file_name ? (
                          <p>File: {invoice.uploaded_file_name}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-[20px] bg-[#fafaf9] p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            This invoice
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">
                            {formatCurrencyValue(invoice.total_amount, currency)}
                          </div>
                        </div>

                        <div className="rounded-[20px] bg-[#fafaf9] p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            PO total
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">
                            {typeof poTotal === "number"
                              ? formatCurrencyValue(poTotal, currency)
                              : "—"}
                          </div>
                        </div>

                        <div className="rounded-[20px] bg-[#fafaf9] p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Cumulative invoiced
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">
                            {formatCurrencyValue(cumulativeInvoiced, currency)}
                          </div>
                        </div>

                        <div className="rounded-[20px] bg-[#fafaf9] p-4">
                          <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                            Remaining
                          </div>
                          <div className="mt-2 font-semibold text-slate-900">
                            {remainingBalance == null
                              ? "—"
                              : formatCurrencyValue(remainingBalance, currency)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${apAction.tone}`}
                        >
                          {apAction.label}
                        </span>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {apAction.helper}
                        </p>
                      </div>

                      <div className="grid min-w-[280px] grid-cols-1 gap-3 text-sm">
                        <div className="rounded-[20px] bg-[#fafaf9] p-4">
                          <div className="text-slate-500">Total</div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {formatCurrencyValue(
                              invoice.total_amount,
                              currency,
                            )}
                          </div>
                        </div>

                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="rounded-full bg-slate-950 px-5 py-2.5 text-center text-sm font-medium text-white transition hover:opacity-90"
                        >
                          Open invoice
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
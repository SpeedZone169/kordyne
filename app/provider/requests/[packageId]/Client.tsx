"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  formatCurrencyValue,
  formatLeadTime,
  getProviderPackageStatusLabel,
  getProviderQuoteStatusLabel,
  providerFileSourceTypeLabels,
  providerPackageStatusTones,
  providerQuoteStatusTones,
} from "@/lib/providers";
import type { ProviderPackageDetailData } from "./types";

type Props = {
  data: ProviderPackageDetailData;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatBytes(value?: number | null) {
  if (!value || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function toneClasses(
  tone: "neutral" | "info" | "success" | "warning" | "danger",
) {
  switch (tone) {
    case "info":
      return "bg-sky-100 text-sky-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "danger":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getLockMessage(packageStatus: string, quoteStatus?: string | null) {
  if (packageStatus === "awarded") {
    return "This package was awarded to your organization. Quote revisions are now locked.";
  }

  if (packageStatus === "not_awarded") {
    return "This package was not awarded. Quote submission is now locked.";
  }

  if (packageStatus === "closed") {
    return "This package has been closed. Quote submission is locked.";
  }

  if (packageStatus === "cancelled") {
    return "This package has been cancelled. Quote submission is locked.";
  }

  if (quoteStatus === "accepted") {
    return "Your latest submitted quote has been accepted.";
  }

  if (quoteStatus === "rejected") {
    return "Your latest submitted quote has been rejected.";
  }

  return "Quote submission is locked for this package.";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export default function Client({ data }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const latestQuote = data.quotes[0] ?? null;
  const latestAcceptedQuote =
    data.quotes.find((quote) => quote.status === "accepted") ?? latestQuote;

  const fullPoAmount = roundMoney(Number(latestAcceptedQuote?.totalPrice ?? 0));

  const alreadyInvoicedAmount = roundMoney(
    data.invoices.reduce((sum, invoice) => {
      const status = String(invoice.status || "").toLowerCase();

      if (status === "void" || status === "cancelled" || status === "canceled") {
        return sum;
      }

      const amount = Number(invoice.totalAmount ?? 0);
      return Number.isFinite(amount) ? sum + amount : sum;
    }, 0),
  );

  const remainingInvoiceAmount = roundMoney(
    Math.max(fullPoAmount - alreadyInvoicedAmount, 0),
  );

  const quoteLocked = ["awarded", "not_awarded", "closed", "cancelled"].includes(
    data.package.packageStatus,
  );

  const awardState = useMemo(() => {
    if (data.package.packageStatus === "awarded") return "awarded";
    if (data.package.packageStatus === "not_awarded") return "not_awarded";
    return "open";
  }, [data.package.packageStatus]);

  const [currencyCode, setCurrencyCode] = useState(
    latestQuote?.currencyCode ?? "EUR",
  );
  const [setupPrice, setSetupPrice] = useState(
    latestQuote?.setupPrice?.toString() ?? "",
  );
  const [unitPrice, setUnitPrice] = useState(
    latestQuote?.unitPrice?.toString() ?? "",
  );
  const [shippingPrice, setShippingPrice] = useState(
    latestQuote?.shippingPrice?.toString() ?? "",
  );
  const [totalPrice, setTotalPrice] = useState(
    latestQuote?.totalPrice?.toString() ?? "",
  );
  const [estimatedLeadTimeDays, setEstimatedLeadTimeDays] = useState(
    latestQuote?.estimatedLeadTimeDays?.toString() ?? "",
  );
  const [earliestStartDate, setEarliestStartDate] = useState(
    latestQuote?.earliestStartDate ?? "",
  );
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(
    latestQuote?.estimatedCompletionDate ?? "",
  );
  const [quoteValidUntil, setQuoteValidUntil] = useState(
    latestQuote?.quoteValidUntil ?? "",
  );
  const [notes, setNotes] = useState(latestQuote?.notes ?? "");
  const [exceptions, setExceptions] = useState(latestQuote?.exceptions ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const [invoiceSource, setInvoiceSource] = useState<
    "kordyne_generated" | "provider_uploaded"
  >("kordyne_generated");
  const [invoiceNumber, setInvoiceNumber] = useState(
    `INV-${data.package.id.slice(0, 8).toUpperCase()}-${data.invoices.length + 1}`,
  );
  const [invoiceCurrencyCode, setInvoiceCurrencyCode] = useState(
    latestAcceptedQuote?.currencyCode ?? "EUR",
  );
  const [invoiceSubtotal, setInvoiceSubtotal] = useState(
    remainingInvoiceAmount > 0 ? remainingInvoiceAmount.toFixed(2) : "",
  );
  const [invoiceTax, setInvoiceTax] = useState("0");
  const [invoiceTotal, setInvoiceTotal] = useState(
    remainingInvoiceAmount > 0 ? remainingInvoiceAmount.toFixed(2) : "",
  );
  const [invoiceIssuedAt, setInvoiceIssuedAt] = useState(getTodayInputValue());
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState<string | null>(null);

  const currentInvoiceAmount = roundMoney(Number(invoiceTotal || 0));
  const remainingAfterCurrentInvoice = roundMoney(
    Math.max(remainingInvoiceAmount - currentInvoiceAmount, 0),
  );
  const invoiceKindPreview =
    currentInvoiceAmount > 0 && remainingAfterCurrentInvoice === 0
      ? "Final invoice"
      : "Partial invoice";

  async function handleSubmitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!totalPrice) {
      setSubmitError("Total price is required.");
      return;
    }

    if (!estimatedLeadTimeDays) {
      setSubmitError("Estimated lead time is required.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        `/api/providers/packages/${data.package.id}/quote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            currencyCode,
            setupPrice: setupPrice ? Number(setupPrice) : null,
            unitPrice: unitPrice ? Number(unitPrice) : null,
            shippingPrice: shippingPrice ? Number(shippingPrice) : null,
            totalPrice: totalPrice ? Number(totalPrice) : null,
            estimatedLeadTimeDays: estimatedLeadTimeDays
              ? Number(estimatedLeadTimeDays)
              : null,
            earliestStartDate: earliestStartDate || null,
            estimatedCompletionDate: estimatedCompletionDate || null,
            quoteValidUntil: quoteValidUntil || null,
            notes: notes || null,
            exceptions: exceptions || null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to submit quote.");
      }

      setSubmitSuccess(
        `Quote ${payload.quoteReference} v${payload.quoteVersion} submitted successfully.`,
      );

      router.refresh();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to submit quote.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateInvoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInvoiceError(null);
    setInvoiceSuccess(null);

    if (awardState !== "awarded") {
      setInvoiceError("Invoices can only be created for awarded packages.");
      return;
    }

    if (!invoiceNumber.trim()) {
      setInvoiceError("Invoice number is required.");
      return;
    }

    if (!invoiceTotal.trim()) {
      setInvoiceError("Invoice amount is required.");
      return;
    }

    const parsedInvoiceTotal = Number(invoiceTotal);

    if (!Number.isFinite(parsedInvoiceTotal) || parsedInvoiceTotal <= 0) {
      setInvoiceError("Invoice amount must be greater than zero.");
      return;
    }

    if (parsedInvoiceTotal > remainingInvoiceAmount) {
      setInvoiceError(
        `Invoice amount exceeds the remaining PO value of ${formatCurrencyValue(
          remainingInvoiceAmount,
          invoiceCurrencyCode || undefined,
        )}.`,
      );
      return;
    }

    if (invoiceSource === "provider_uploaded") {
      if (!invoiceFile) {
        setInvoiceError("Please select a PDF invoice file to upload.");
        return;
      }

      const isPdfType = invoiceFile.type === "application/pdf";
      const isPdfName = invoiceFile.name.toLowerCase().endsWith(".pdf");

      if (!isPdfType || !isPdfName) {
        setInvoiceError("Only PDF invoice uploads are allowed.");
        return;
      }
    }

    setInvoiceSubmitting(true);

    try {
      let uploadedFilePath: string | null = null;
      let uploadedFileName: string | null = null;
      let uploadedFileType: string | null = null;

      if (invoiceSource === "provider_uploaded" && invoiceFile) {
        const safeFileName = invoiceFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "-");
        uploadedFilePath = `${data.package.providerOrgId}/${data.package.id}/invoice-${Date.now()}-${safeFileName}`;
        uploadedFileName = invoiceFile.name;
        uploadedFileType = invoiceFile.type || "application/pdf";

        const { error: uploadError } = await supabase.storage
          .from("provider-invoices")
          .upload(uploadedFilePath, invoiceFile, {
            upsert: true,
            contentType: uploadedFileType,
          });

        if (uploadError) {
          throw new Error(uploadError.message);
        }
      }

      const response = await fetch(
        `/api/provider/packages/${data.package.id}/invoices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            invoiceSource,
            invoiceNumber: invoiceNumber.trim(),
            currencyCode: invoiceCurrencyCode.trim() || "EUR",
            subtotalAmount: invoiceSubtotal ? Number(invoiceSubtotal) : null,
            taxAmount: invoiceTax ? Number(invoiceTax) : 0,
            totalAmount: invoiceTotal ? Number(invoiceTotal) : null,
            issuedAt: invoiceIssuedAt
              ? new Date(`${invoiceIssuedAt}T00:00:00`).toISOString()
              : null,
            dueDate: invoiceDueDate || null,
            notes: invoiceNotes.trim() || null,
            uploadedFilePath,
            uploadedFileName,
            uploadedFileType,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create invoice.");
      }

      setInvoiceSuccess("Invoice created successfully.");
      router.push(`/invoices/${payload.invoiceId}`);
      router.refresh();
    } catch (error) {
      setInvoiceError(
        error instanceof Error ? error.message : "Failed to create invoice.",
      );
    } finally {
      setInvoiceSubmitting(false);
    }
  }

  function handleInvoiceFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setInvoiceFile(null);
      return;
    }

    const isPdfType = file.type === "application/pdf";
    const isPdfName = file.name.toLowerCase().endsWith(".pdf");

    if (!isPdfType || !isPdfName) {
      setInvoiceError("Only PDF invoice uploads are allowed.");
      setInvoiceFile(null);
      event.target.value = "";
      return;
    }

    setInvoiceError(null);
    setInvoiceFile(file);
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Provider portal</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {data.package.packageTitle || "Provider package"}
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Review the shared package, confirm technical context, and submit
              a structured quote response to the customer.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <div className="text-slate-500">Customer</div>
              <div className="font-medium text-slate-900">
                {data.package.customerOrgName}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Status</div>
              <div className="mt-1">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                    providerPackageStatusTones[
                      data.package.packageStatus as keyof typeof providerPackageStatusTones
                    ],
                  )}`}
                >
                  {getProviderPackageStatusLabel(
                    data.package.packageStatus as Parameters<
                      typeof getProviderPackageStatusLabel
                    >[0],
                  )}
                </span>
              </div>
            </div>
            <div>
              <div className="text-slate-500">Files</div>
              <div className="font-medium text-slate-900">{data.files.length}</div>
            </div>
            <div>
              <div className="text-slate-500">Quote versions</div>
              <div className="font-medium text-slate-900">{data.quotes.length}</div>
            </div>
          </div>
        </div>
      </div>

      {awardState === "awarded" ? (
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-emerald-900">
              Awarded to your organization
            </h2>
            <p className="text-sm text-emerald-800">
              This provider package has been awarded. Your latest accepted quote
              is now the winning commercial response for this round and you can now issue invoices.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-emerald-900">
              <span>Awarded: {formatDateTime(data.package.awardedAt)}</span>
              <span>Status: {data.package.customerVisibleStatus || "Awarded"}</span>
            </div>
          </div>
        </div>
      ) : null}

      {awardState === "not_awarded" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
          <div className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold text-amber-900">
              Not awarded
            </h2>
            <p className="text-sm text-amber-800">
              This provider package was reviewed but not selected for award.
              Quote revisions are locked for this round.
            </p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm text-amber-900">
              <span>Decision recorded: {formatDateTime(data.package.awardedAt)}</span>
              <span>Status: {data.package.customerVisibleStatus || "Not awarded"}</span>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Package overview
            </h2>

            <dl className="mt-4 grid gap-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Target due date</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDate(data.package.targetDueDate)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Requested quantity</dt>
                <dd className="text-right font-medium text-slate-900">
                  {data.package.requestedQuantity ?? "—"}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Response deadline</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDateTime(data.package.responseDeadline)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Published</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDateTime(data.package.publishedAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Viewed</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDateTime(data.package.viewedAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Responded</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDateTime(data.package.providerRespondedAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Awarded / decision time</dt>
                <dd className="text-right font-medium text-slate-900">
                  {formatDateTime(data.package.awardedAt)}
                </dd>
              </div>

              <div className="flex items-start justify-between gap-4">
                <dt className="text-slate-500">Customer-visible status</dt>
                <dd className="text-right font-medium text-slate-900">
                  {data.package.customerVisibleStatus || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Request context
            </h2>

            {data.request ? (
              <dl className="mt-4 grid gap-4 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Request</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {data.request.title ||
                      data.request.requestedItemName ||
                      "Untitled request"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Type</dt>
                  <dd className="text-right font-medium capitalize text-slate-900">
                    {data.request.requestType ?? "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Origin</dt>
                  <dd className="text-right font-medium capitalize text-slate-900">
                    {data.request.requestOrigin ?? "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Requested item</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {data.request.requestedItemReference ||
                      data.request.requestedItemName ||
                      "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Target process</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {data.request.targetProcess || "—"}
                  </dd>
                </div>

                <div className="flex items-start justify-between gap-4">
                  <dt className="text-slate-500">Target material</dt>
                  <dd className="text-right font-medium text-slate-900">
                    {data.request.targetMaterial || "—"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Request context is not available for this package.
              </p>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Shared summary
            </h2>
            <p className="mt-4 text-sm text-slate-700">
              {data.package.sharedSummary || "No shared summary provided."}
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Submit quote response
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Send an initial quote or revise your latest response for this
                  package.
                </p>
                {latestQuote?.quoteReference ? (
                  <p className="mt-2 text-sm text-slate-600">
                    Reference: {latestQuote.quoteReference} v{latestQuote.quoteVersion}
                  </p>
                ) : null}
              </div>

              {latestQuote?.status ? (
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                    providerQuoteStatusTones[
                      latestQuote.status as keyof typeof providerQuoteStatusTones
                    ],
                  )}`}
                >
                  {getProviderQuoteStatusLabel(
                    latestQuote.status as Parameters<
                      typeof getProviderQuoteStatusLabel
                    >[0],
                  )}
                </span>
              ) : null}
            </div>

            {quoteLocked ? (
              <div
                className={`mt-5 rounded-2xl border p-5 text-sm ${
                  awardState === "awarded"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : awardState === "not_awarded"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-dashed border-slate-300 bg-slate-50 text-slate-600"
                }`}
              >
                {getLockMessage(data.package.packageStatus, latestQuote?.status)}
              </div>
            ) : (
              <form onSubmit={handleSubmitQuote} className="mt-5 space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Currency
                    </label>
                    <input
                      value={currencyCode}
                      onChange={(event) => setCurrencyCode(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      placeholder="EUR"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Setup price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={setupPrice}
                      onChange={(event) => setSetupPrice(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Unit price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={unitPrice}
                      onChange={(event) => setUnitPrice(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Shipping price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={shippingPrice}
                      onChange={(event) => setShippingPrice(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Total price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={totalPrice}
                      onChange={(event) => setTotalPrice(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Lead time (days) *
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={estimatedLeadTimeDays}
                      onChange={(event) =>
                        setEstimatedLeadTimeDays(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Earliest start date
                    </label>
                    <input
                      type="date"
                      value={earliestStartDate}
                      onChange={(event) =>
                        setEarliestStartDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Estimated completion date
                    </label>
                    <input
                      type="date"
                      value={estimatedCompletionDate}
                      onChange={(event) =>
                        setEstimatedCompletionDate(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Quote valid until
                    </label>
                    <input
                      type="date"
                      value={quoteValidUntil}
                      onChange={(event) => setQuoteValidUntil(event.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Quote notes
                    </label>
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      rows={5}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                      placeholder="Add commercial notes, assumptions, or scope context."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Exceptions
                    </label>
                    <textarea
                      value={exceptions}
                      onChange={(event) => setExceptions(event.target.value)}
                      rows={5}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                      placeholder="Add exclusions, deviations, or conditions."
                    />
                  </div>
                </div>

                {submitError ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {submitError}
                  </div>
                ) : null}

                {submitSuccess ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {submitSuccess}
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? "Submitting..."
                      : latestQuote
                        ? "Submit revised quote"
                        : "Submit quote"}
                  </button>

                  {latestQuote ? (
                    <button
                      type="button"
                      onClick={() => router.push(`/quotes/${latestQuote.id}`)}
                      className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open formal quote
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => router.push("/provider/requests")}
                    className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Back to inbox
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Invoices
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Issue a full or partial invoice after award. Each invoice can store its own invoice
                  number, amount, and official PDF so customers can receipt against the correct amount.
                </p>
              </div>

              <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {data.invoices.length} invoice{data.invoices.length === 1 ? "" : "s"}
              </div>
            </div>

            {awardState !== "awarded" ? (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                Invoices become available after the package is awarded to your organization.
              </div>
            ) : (
              <div className="mt-5 space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">
                        Purchase order summary
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        Each invoice is recorded separately. Partial invoices can be
                        issued now, and additional invoices can be added later until
                        the full PO value is reached.
                      </p>
                    </div>

                    <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700">
                      {invoiceKindPreview}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Full PO amount
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrencyValue(
                          fullPoAmount,
                          invoiceCurrencyCode || undefined,
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Already invoiced
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrencyValue(
                          alreadyInvoicedAmount,
                          invoiceCurrencyCode || undefined,
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Remaining before this invoice
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrencyValue(
                          remainingInvoiceAmount,
                          invoiceCurrencyCode || undefined,
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="text-xs uppercase tracking-wide text-slate-500">
                        Remaining after this invoice
                      </div>
                      <div className="mt-2 text-lg font-semibold text-slate-900">
                        {formatCurrencyValue(
                          remainingAfterCurrentInvoice,
                          invoiceCurrencyCode || undefined,
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleCreateInvoice}
                  className="space-y-5 rounded-2xl border border-slate-200 p-5"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Invoice source
                      </label>
                      <select
                        value={invoiceSource}
                        onChange={(event) =>
                          setInvoiceSource(
                            event.target.value as
                              | "kordyne_generated"
                              | "provider_uploaded",
                          )
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      >
                        <option value="kordyne_generated">
                          Kordyne generated invoice
                        </option>
                        <option value="provider_uploaded">
                          Upload provider invoice PDF
                        </option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Invoice number *
                      </label>
                      <input
                        value={invoiceNumber}
                        onChange={(event) => setInvoiceNumber(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        placeholder="INV-2026-001"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Currency
                      </label>
                      <input
                        value={invoiceCurrencyCode}
                        onChange={(event) =>
                          setInvoiceCurrencyCode(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        placeholder="EUR"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Subtotal
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceSubtotal}
                        onChange={(event) => setInvoiceSubtotal(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Tax
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceTax}
                        onChange={(event) => setInvoiceTax(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Current invoice amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={invoiceTotal}
                        onChange={(event) => setInvoiceTotal(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Issue date
                      </label>
                      <input
                        type="date"
                        value={invoiceIssuedAt}
                        onChange={(event) => setInvoiceIssuedAt(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Due date
                      </label>
                      <input
                        type="date"
                        value={invoiceDueDate}
                        onChange={(event) => setInvoiceDueDate(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                      />
                    </div>
                  </div>

                  {invoiceSource === "provider_uploaded" ? (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">
                        Upload invoice PDF *
                      </label>
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleInvoiceFileChange}
                        className="block w-full text-sm text-slate-700"
                      />
                      <p className="text-xs text-slate-500">
                        Upload one official PDF for this invoice only. If you invoice another portion later,
                        create a new invoice with its own invoice number and PDF.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                      Kordyne will generate the invoice document using the invoice data you enter here.
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={invoiceNotes}
                      onChange={(event) => setInvoiceNotes(event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
                      placeholder="Payment instructions, bank reference, VAT notes, or internal billing notes."
                    />
                  </div>

                  {invoiceError ? (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                      {invoiceError}
                    </div>
                  ) : null}

                  {invoiceSuccess ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      {invoiceSuccess}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      disabled={invoiceSubmitting}
                      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {invoiceSubmitting
                        ? "Creating..."
                        : invoiceSource === "provider_uploaded"
                          ? "Upload invoice"
                          : "Generate invoice"}
                    </button>
                  </div>
                </form>

                {data.invoices.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
                    No invoices have been created for this awarded package yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.invoices.map((invoice) => (
                      <div
                        key={invoice.id}
                        className="rounded-2xl border border-slate-200 p-4"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-semibold text-slate-900">
                                {invoice.invoiceNumber}
                              </h3>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                                {invoice.invoiceSource.replace("_", " ")}
                              </span>
                              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 capitalize">
                                {invoice.status}
                              </span>
                            </div>

                            <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                              <p>
                                Issued: {formatDate(invoice.issuedAt)}
                              </p>
                              <p>
                                Due: {formatDate(invoice.dueDate)}
                              </p>
                              <p>
                                Total:{" "}
                                {formatCurrencyValue(
                                  invoice.totalAmount,
                                  invoice.currencyCode ?? undefined,
                                )}
                              </p>
                              <p>
                                Paid: {formatDate(invoice.paidAt)}
                              </p>
                              {invoice.uploadedFileName ? (
                                <p className="md:col-span-2">
                                  File: {invoice.uploadedFileName}
                                </p>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              type="button"
                              onClick={() => router.push(`/invoices/${invoice.id}`)}
                              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                              Open invoice
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Shared files
            </h2>

            {data.files.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No files were shared in this package.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.files.map((file) => (
                  <div
                    key={file.id}
                    className="rounded-2xl border border-slate-200 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900">
                          {file.fileName}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            {providerFileSourceTypeLabels[
                              file.sourceType as keyof typeof providerFileSourceTypeLabels
                            ] ?? file.sourceType}
                          </span>
                          {file.assetCategory ? (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                              {file.assetCategory}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            {file.fileType || "Unknown type"}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                            {formatBytes(file.fileSizeBytes)}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        Shared {formatDateTime(file.sharedAt || file.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Quote history
            </h2>

            {data.quotes.length === 0 ? (
              <p className="mt-4 text-sm text-slate-600">
                No quote history yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {data.quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className={`rounded-2xl border p-4 ${
                      quote.status === "accepted"
                        ? "border-emerald-200 bg-emerald-50/40"
                        : quote.status === "rejected"
                          ? "border-amber-200 bg-amber-50/40"
                          : "border-slate-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium text-slate-900">
                        {quote.quoteReference
                          ? `${quote.quoteReference} v${quote.quoteVersion}`
                          : `Quote v${quote.quoteVersion}`}
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                          providerQuoteStatusTones[
                            quote.status as keyof typeof providerQuoteStatusTones
                          ],
                        )}`}
                      >
                        {getProviderQuoteStatusLabel(
                          quote.status as Parameters<
                            typeof getProviderQuoteStatusLabel
                          >[0],
                        )}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-slate-500">Total</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatCurrencyValue(
                            quote.totalPrice,
                            quote.currencyCode ?? undefined,
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Lead time</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatLeadTime(quote.estimatedLeadTimeDays)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Valid until</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDate(quote.quoteValidUntil)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Submitted</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDateTime(quote.submittedAt)}
                        </div>
                      </div>
                    </div>

                    {quote.notes ? (
                      <div className="mt-3 text-sm text-slate-600">
                        {quote.notes}
                      </div>
                    ) : null}

                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => router.push(`/quotes/${quote.id}`)}
                        className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Open formal quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
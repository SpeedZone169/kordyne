"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

export default function Client({ data }: Props) {
  const router = useRouter();
  const latestQuote = data.quotes[0] ?? null;
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
                    providerPackageStatusTones[data.package.packageStatus],
                  )}`}
                >
                  {getProviderPackageStatusLabel(data.package.packageStatus)}
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
              is now the winning commercial response for this round.
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
                    providerQuoteStatusTones[latestQuote.status],
                  )}`}
                >
                  {getProviderQuoteStatusLabel(latestQuote.status)}
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
                            {providerFileSourceTypeLabels[file.sourceType]}
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
                          providerQuoteStatusTones[quote.status],
                        )}`}
                      >
                        {getProviderQuoteStatusLabel(quote.status)}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-slate-500">Total</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatCurrencyValue(
                            quote.totalPrice,
                            quote.currencyCode,
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
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatCurrencyValue,
  formatLeadTime,
  getProviderPackageStatusLabel,
  getProviderQuoteStatusLabel,
  getProviderRoundStatusLabel,
  getQuoteValueSignal,
  providerPackageStatusTones,
  providerQuoteStatusTones,
  providerRoundStatusTones,
} from "@/lib/providers";
import type { QuoteComparisonPageData } from "./types";

type Props = {
  data: QuoteComparisonPageData;
};

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
  }).format(date);
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

export default function Client({ data }: Props) {
  const router = useRouter();
  const selectedRound = data.selectedRound;

  const [awardingPackageId, setAwardingPackageId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const sortedRows = useMemo(() => {
    return [...data.rows].sort((a, b) => {
      if (a.isAwarded && !b.isAwarded) return -1;
      if (!a.isAwarded && b.isAwarded) return 1;

      const aSubmitted = a.quoteStatus === "submitted";
      const bSubmitted = b.quoteStatus === "submitted";

      if (aSubmitted && !bSubmitted) return -1;
      if (!aSubmitted && bSubmitted) return 1;

      if (
        typeof a.totalPrice === "number" &&
        typeof b.totalPrice === "number" &&
        a.totalPrice !== b.totalPrice
      ) {
        return a.totalPrice - b.totalPrice;
      }

      return a.providerName.localeCompare(b.providerName);
    });
  }, [data.rows]);

  function handleRoundChange(roundId: string) {
    const params = new URLSearchParams();
    params.set("roundId", roundId);
    router.push(`/dashboard/requests/${data.request.id}/quotes?${params.toString()}`);
  }

  async function handleAwardProvider(packageId: string, providerName: string) {
    if (!selectedRound) return;

    const confirmed = window.confirm(
      `Award this request to ${providerName}?`,
    );

    if (!confirmed) return;

    setActionError(null);
    setActionSuccess(null);
    setAwardingPackageId(packageId);

    try {
      const response = await fetch(
        `/api/providers/quote-rounds/${selectedRound.id}/award`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerRequestPackageId: packageId,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to award provider.");
      }

      setActionSuccess(`Awarded ${providerName} successfully.`);
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Failed to award provider.",
      );
    } finally {
      setAwardingPackageId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">
              Provider collaboration
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Quote comparison
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Compare provider responses internally before selecting an award.
              Providers cannot see competitor quotes or this internal comparison.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <div className="text-slate-500">Request</div>
              <div className="font-medium text-slate-900">
                {data.request.title ||
                  data.request.requestedItemName ||
                  "Untitled request"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Type</div>
              <div className="font-medium capitalize text-slate-900">
                {data.request.requestType ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Rounds</div>
              <div className="font-medium text-slate-900">
                {data.rounds.length}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Quotes in view</div>
              <div className="font-medium text-slate-900">
                {data.rows.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {data.rounds.length === 0 || !selectedRound ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No quote rounds yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Create a provider quote round from the routing page first.
          </p>
          <button
            onClick={() =>
              router.push(`/dashboard/requests/${data.request.id}/providers`)
            }
            className="mt-5 inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            Go to provider routing
          </button>
        </div>
      ) : (
        <div className="grid gap-8 xl:grid-cols-[0.72fr_1.28fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Active round
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Switch between quote rounds for this request.
                  </p>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="roundId"
                    className="text-sm font-medium text-slate-700"
                  >
                    Quote round
                  </label>
                  <select
                    id="roundId"
                    value={selectedRound.id}
                    onChange={(event) => handleRoundChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {data.rounds.map((round) => (
                      <option key={round.id} value={round.id}>
                        Round {round.roundNumber} ·{" "}
                        {round.mode === "competitive_quote"
                          ? "Request quotes"
                          : "Direct award"}
                      </option>
                    ))}
                  </select>
                </div>

                <dl className="grid gap-4 text-sm">
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Status</dt>
                    <dd>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                          providerRoundStatusTones[selectedRound.status],
                        )}`}
                      >
                        {getProviderRoundStatusLabel(selectedRound.status)}
                      </span>
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Target due date</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatDate(selectedRound.targetDueDate)}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Requested quantity</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {selectedRound.requestedQuantity ?? "—"}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Published</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatDateTime(selectedRound.publishedAt)}
                    </dd>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-slate-500">Awarded</dt>
                    <dd className="text-right font-medium text-slate-900">
                      {formatDateTime(selectedRound.awardedAt)}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Comparison signals
              </h2>
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
                  Cheapest
                </span>
                <span className="rounded-full bg-sky-100 px-2.5 py-1 font-medium text-sky-700">
                  Quickest
                </span>
                <span className="rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700">
                  Meets due date
                </span>
                <span className="rounded-full bg-violet-100 px-2.5 py-1 font-medium text-violet-700">
                  Awarded
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Provider quotes
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Internal comparison only.
                </p>
              </div>

              <button
                onClick={() =>
                  router.push(`/dashboard/requests/${data.request.id}/providers`)
                }
                className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Manage routing
              </button>
            </div>

            {actionError ? (
              <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}

            {actionSuccess ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {actionSuccess}
              </div>
            ) : null}

            {sortedRows.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
                No provider packages found for this round yet.
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {sortedRows.map((row) => {
                  const signals = getQuoteValueSignal(row);
                  const awardDisabled =
                    !row.quoteId ||
                    row.isAwarded ||
                    selectedRound.status === "awarded" ||
                    awardingPackageId !== null;

                  return (
                    <div
                      key={row.packageId}
                      className={`rounded-2xl border p-5 ${
                        row.isAwarded
                          ? "border-violet-300 bg-violet-50/40"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="space-y-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-lg font-semibold text-slate-900">
                                {row.providerName}
                              </h3>

                              <span
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                                  providerPackageStatusTones[row.packageStatus],
                                )}`}
                              >
                                {getProviderPackageStatusLabel(row.packageStatus)}
                              </span>

                              {row.quoteStatus ? (
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                                    providerQuoteStatusTones[row.quoteStatus],
                                  )}`}
                                >
                                  {getProviderQuoteStatusLabel(row.quoteStatus)}
                                </span>
                              ) : null}

                              {row.isAwarded ? (
                                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                                  Awarded
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-sm text-slate-600">
                              {row.packageTitle || "Provider package"}
                            </p>

                            {row.quoteReference ? (
                              <p className="mt-1 text-sm text-slate-600">
                                {row.quoteReference}
                                {row.quoteVersion ? ` v${row.quoteVersion}` : ""}
                              </p>
                            ) : null}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {signals.map((signal) => (
                              <span
                                key={signal}
                                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                  signal === "Cheapest"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : signal === "Quickest"
                                      ? "bg-sky-100 text-sky-700"
                                      : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {signal}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-slate-500">Total price</div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatCurrencyValue(
                                row.totalPrice,
                                row.currencyCode,
                              )}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-slate-500">Lead time</div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatLeadTime(row.estimatedLeadTimeDays)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-slate-500">Start date</div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatDate(row.earliestStartDate)}
                            </div>
                          </div>

                          <div className="rounded-2xl bg-slate-50 p-3">
                            <div className="text-slate-500">
                              Completion date
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {formatDate(row.estimatedCompletionDate)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                        <div>
                          <div className="text-slate-500">Viewed</div>
                          <div className="mt-1 font-medium text-slate-900">
                            {formatDateTime(row.viewedAt)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500">Responded</div>
                          <div className="mt-1 font-medium text-slate-900">
                            {formatDateTime(row.providerRespondedAt)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500">Quote submitted</div>
                          <div className="mt-1 font-medium text-slate-900">
                            {formatDateTime(row.quoteSubmittedAt)}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500">Customer status</div>
                          <div className="mt-1 font-medium text-slate-900">
                            {row.customerVisibleStatus || "—"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                        <div className="text-xs uppercase tracking-wide text-slate-500">
                          Quote notes
                        </div>
                        <p className="mt-2 text-sm text-slate-700">
                          {row.quoteNotes || "—"}
                        </p>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        {row.quoteId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/quotes/${row.quoteId}`)}
                            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Open formal quote
                          </button>
                        ) : null}

                        <button
                          type="button"
                          disabled={awardDisabled}
                          onClick={() =>
                            handleAwardProvider(row.packageId, row.providerName)
                          }
                          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {row.isAwarded
                            ? "Awarded"
                            : awardingPackageId === row.packageId
                              ? "Awarding..."
                              : "Award provider"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
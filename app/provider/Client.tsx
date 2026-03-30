"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  formatCurrencyValue,
  formatLeadTime,
  getProviderPackageStatusLabel,
  getProviderQuoteStatusLabel,
  providerPackageStatusTones,
  providerQuoteStatusTones,
} from "@/lib/providers";
import type { ProviderDashboardData } from "./types";

type Props = {
  data: ProviderDashboardData;
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
  const readinessLabel = useMemo(() => {
    const percent = data.stats.profileCompletionPercent;
    if (percent >= 100) return "Complete";
    if (percent >= 70) return "Almost ready";
    if (percent >= 40) return "In progress";
    return "Needs setup";
  }, [data.stats.profileCompletionPercent]);

  const openRows = useMemo(
    () =>
      data.rows.filter(
        (row) =>
          !["awarded", "not_awarded", "closed", "cancelled"].includes(
            row.packageStatus,
          ),
      ),
    [data.rows],
  );

  const awardedRows = useMemo(
    () => data.rows.filter((row) => row.packageStatus === "awarded"),
    [data.rows],
  );

  const recentRows = useMemo(
    () =>
      [...data.rows]
        .sort(
          (a, b) =>
            new Date(b.publishedAt ?? b.createdAt).getTime() -
            new Date(a.publishedAt ?? a.createdAt).getTime(),
        )
        .slice(0, 4),
    [data.rows],
  );

  const activeFamilies = useMemo(
    () =>
      new Set(
        data.capabilities
          .filter((cap) => cap.active)
          .map((cap) => cap.processFamily)
          .filter(Boolean),
      ).size,
    [data.capabilities],
  );

  const responseRate =
    data.stats.packageCount > 0
      ? Math.round((data.stats.respondedCount / data.stats.packageCount) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Provider home
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              {data.organization?.name || "Provider workspace"}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Manage requests, maintain a client-ready company profile, structure your
              capabilities, and prepare your schedule foundation in one premium workspace.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Role: {data.organization?.memberRole || "member"}
              </span>
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Readiness: {readinessLabel}
              </span>
              <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                Active capability families: {activeFamilies}
              </span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/provider/requests"
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
              >
                Open inbox
              </Link>
              <Link
                href="/provider/company"
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Update company profile
              </Link>
              <Link
                href="/provider/capabilities"
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Manage capabilities
              </Link>
              <Link
                href="/provider/schedule"
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Open schedule
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Readiness score
            </p>
            <p className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {data.stats.profileCompletionPercent}%
            </p>

            <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-200">
              <div
                className="h-full rounded-full bg-slate-950"
                style={{ width: `${data.stats.profileCompletionPercent}%` }}
              />
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              Complete your company profile and capability register so your quotes and
              provider identity look premium to customers.
            </p>

            <div className="mt-5 space-y-2">
              {data.stats.missingItems.length > 0 ? (
                data.stats.missingItems.map((item) => (
                  <div
                    key={item}
                    className="rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  Your profile is ready for customer-facing work.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Packages</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {data.stats.packageCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Awaiting response</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {data.stats.awaitingResponseCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Responded</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {data.stats.respondedCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Awarded</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {data.stats.awardedCount}
          </p>
        </div>

        <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">Active capabilities</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">
            {data.stats.activeCapabilityCount}
          </p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Performance snapshot
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                Provider KPIs
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                A high-level view of demand, response activity, and award conversion across
                your current provider workspace.
              </p>
            </div>

            <div className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-4 py-2 text-sm font-medium text-slate-700">
              Response rate: {responseRate}%
            </div>
          </div>

          <div className="mt-8 space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-slate-600">Responded packages</span>
                <span className="font-medium text-slate-900">
                  {data.stats.respondedCount} / {data.stats.packageCount || 0}
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-slate-950"
                  style={{ width: `${responseRate}%` }}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <div className="text-sm text-slate-500">Open inbox</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {openRows.length}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Active opportunities requiring commercial attention.
                </div>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <div className="text-sm text-slate-500">Awarded work</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {awardedRows.length}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Work packages ready for invoice and schedule handoff.
                </div>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <div className="text-sm text-slate-500">Submitted quotes</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.latestSubmittedQuoteCount}
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  Latest package quotes currently in a submitted state.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Guidance
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Next best actions
          </h3>

          <div className="mt-6 space-y-3">
            <Link
              href="/provider/company"
              className="block rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-5 transition hover:border-zinc-300"
            >
              <div className="text-sm font-medium text-slate-900">
                Company profile and branding
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Keep company profile, certifications, branding, and commercial identity up
                to date so formal documents stay customer-ready.
              </div>
            </Link>

            <Link
              href="/provider/capabilities"
              className="block rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-5 transition hover:border-zinc-300"
            >
              <div className="text-sm font-medium text-slate-900">
                Capability mapping for routing and scheduling
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Structured capabilities will power better routing now and support work
                center scheduling next.
              </div>
            </Link>

            <Link
              href="/provider/schedule"
              className="block rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-5 transition hover:border-zinc-300"
            >
              <div className="text-sm font-medium text-slate-900">
                Prepare schedule foundation
              </div>
              <div className="mt-2 text-sm leading-6 text-slate-600">
                Scheduling will connect awarded work to capabilities, equipment, and time
                windows in one premium planning surface.
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Recent opportunities
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Latest inbox activity
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Recent provider packages, their current commercial state, and the latest quote
              context.
            </p>
          </div>

          <Link
            href="/provider/requests"
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            View full inbox
          </Link>
        </div>

        {recentRows.length === 0 ? (
          <div className="mt-8 rounded-[28px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
            No provider packages have been published to this organization yet.
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {recentRows.map((row) => (
              <div
                key={row.packageId}
                className="rounded-[28px] border border-zinc-200 bg-white p-6"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-950">
                          {row.packageTitle || "Provider package"}
                        </h4>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                            providerPackageStatusTones[
                              row.packageStatus as keyof typeof providerPackageStatusTones
                            ],
                          )}`}
                        >
                          {getProviderPackageStatusLabel(
                            row.packageStatus as Parameters<
                              typeof getProviderPackageStatusLabel
                            >[0],
                          )}
                        </span>

                        {row.latestQuoteStatus ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                              providerQuoteStatusTones[
                                row.latestQuoteStatus as keyof typeof providerQuoteStatusTones
                              ],
                            )}`}
                          >
                            {getProviderQuoteStatusLabel(
                              row.latestQuoteStatus as Parameters<
                                typeof getProviderQuoteStatusLabel
                              >[0],
                            )}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">
                        Customer: {row.customerOrgName}
                      </p>
                    </div>

                    <div className="grid gap-2 text-sm text-slate-600 md:grid-cols-2">
                      <p>Response deadline: {formatDateTime(row.responseDeadline)}</p>
                      <p>Target due date: {formatDate(row.targetDueDate)}</p>
                      <p>Requested quantity: {row.requestedQuantity ?? "—"}</p>
                      <p>Published: {formatDateTime(row.publishedAt)}</p>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Latest total</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatCurrencyValue(
                          row.latestTotalPrice,
                          row.latestCurrencyCode ?? undefined,
                        )}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Lead time</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatLeadTime(row.latestLeadTimeDays)}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Submitted</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(row.latestQuoteSubmittedAt)}
                      </div>
                    </div>

                    <div className="rounded-[20px] bg-[#fafaf9] p-4">
                      <div className="text-slate-500">Awarded</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(row.awardedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link
                    href={`/provider/requests/${row.packageId}`}
                    className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Open package
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
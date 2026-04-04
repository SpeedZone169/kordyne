"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  formatCurrencyValue,
  formatLeadTime,
  getProviderPackageStatusLabel,
  getProviderQuoteStatusLabel,
  providerPackageStatusTones,
  providerQuoteStatusTones,
} from "@/lib/providers";
import type { ProviderInboxData } from "./types";

type Props = {
  data: ProviderInboxData;
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

function canRespondToPackage(packageStatus: string) {
  return ["published", "viewed", "awaiting_provider_response"].includes(
    packageStatus,
  );
}

export default function Client({ data }: Props) {
  const router = useRouter();

  const rows = useMemo(() => {
    return [...data.rows].sort((a, b) => {
      if (a.packageStatus === "awarded" && b.packageStatus !== "awarded") {
        return -1;
      }
      if (a.packageStatus !== "awarded" && b.packageStatus === "awarded") {
        return 1;
      }

      return (
        new Date(b.publishedAt ?? b.createdAt).getTime() -
        new Date(a.publishedAt ?? a.createdAt).getTime()
      );
    });
  }, [data.rows]);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">Provider portal</p>
            <h1 className="text-2xl font-semibold text-slate-900">
              Incoming requests
            </h1>
            <p className="max-w-3xl text-sm text-slate-600">
              Review packages shared with your organization, check quote status,
              and move into response and scheduling workflows.
            </p>
          </div>

          <div className="grid min-w-[240px] grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <div className="text-slate-500">Packages</div>
              <div className="font-medium text-slate-900">{rows.length}</div>
            </div>
            <div>
              <div className="text-slate-500">Awaiting response</div>
              <div className="font-medium text-slate-900">
                {
                  rows.filter((row) =>
                    ["published", "viewed", "awaiting_provider_response"].includes(
                      row.packageStatus,
                    ),
                  ).length
                }
              </div>
            </div>
            <div>
              <div className="text-slate-500">Quote submitted</div>
              <div className="font-medium text-slate-900">
                {rows.filter((row) => row.latestQuoteStatus === "submitted").length}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Awarded</div>
              <div className="font-medium text-slate-900">
                {rows.filter((row) => row.packageStatus === "awarded").length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            No provider packages yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Once a customer publishes a package to your provider organization,
            it will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => {
            const detailHref = `/provider/requests/${row.packageId}`;
            const canRespond = canRespondToPackage(row.packageStatus);

            return (
              <div
                key={row.packageId}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-slate-900">
                          {row.packageTitle || "Provider package"}
                        </h2>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                            providerPackageStatusTones[row.packageStatus],
                          )}`}
                        >
                          {getProviderPackageStatusLabel(row.packageStatus)}
                        </span>

                        {row.latestQuoteStatus ? (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                              providerQuoteStatusTones[row.latestQuoteStatus],
                            )}`}
                          >
                            {getProviderQuoteStatusLabel(row.latestQuoteStatus)}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1 text-sm text-slate-600">
                        Customer: {row.customerOrgName}
                      </p>
                    </div>

                    <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <div className="text-slate-500">Due date</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDate(row.targetDueDate)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Quantity</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {row.requestedQuantity ?? "—"}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Response deadline</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDateTime(row.responseDeadline)}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-500">Published</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDateTime(row.publishedAt)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-[280px] grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-slate-500">Latest quote</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatCurrencyValue(
                          row.latestTotalPrice,
                          row.latestCurrencyCode ?? "EUR",
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-slate-500">Lead time</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatLeadTime(row.latestLeadTimeDays)}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-slate-500">Quote version</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {row.latestQuoteVersion ?? "—"}
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-3">
                      <div className="text-slate-500">Quote submitted</div>
                      <div className="mt-1 font-semibold text-slate-900">
                        {formatDateTime(row.latestQuoteSubmittedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-4">
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
                    <div className="text-slate-500">Awarded</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {formatDateTime(row.awardedAt)}
                    </div>
                  </div>

                  <div>
                    <div className="text-slate-500">Customer status</div>
                    <div className="mt-1 font-medium text-slate-900">
                      {row.customerVisibleStatus || "—"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(detailHref)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open package
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(detailHref)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open messages
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (canRespond) router.push(detailHref);
                    }}
                    disabled={!canRespond}
                    className={`rounded-xl px-4 py-2 text-sm font-medium text-white ${
                      canRespond
                        ? "bg-slate-900 hover:bg-slate-800"
                        : "bg-slate-900 opacity-60"
                    }`}
                    title={
                      canRespond
                        ? "Open provider package detail"
                        : "This package is not currently open for response"
                    }
                  >
                    Respond to request
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  InternalScheduleBacklogItem,
  InternalScheduleRecommendation,
  InternalScheduleResource,
} from "./types";

type Props = {
  item: InternalScheduleBacklogItem;
  resources: InternalScheduleResource[];
  recommendation: InternalScheduleRecommendation | null;
};

function fieldClasses() {
  return "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/25 focus:ring-4 focus:ring-[#0b1633]/5";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultEndDate(minutes: number | null | undefined) {
  const days = Math.max(1, Math.ceil((minutes ?? 480) / 480));
  const end = new Date();
  end.setDate(end.getDate() + days - 1);
  return end.toISOString().slice(0, 10);
}

export default function CreateInternalAssignmentForm({
  item,
  resources,
  recommendation,
}: Props) {
  const router = useRouter();

  const activeResources = useMemo(
    () => resources.filter((resource) => resource.active),
    [resources],
  );

  const defaultResourceId =
    recommendation?.suggestedResourceId &&
    activeResources.some((resource) => resource.id === recommendation.suggestedResourceId)
      ? recommendation.suggestedResourceId
      : activeResources[0]?.id ?? "";

  const [isOpen, setIsOpen] = useState(false);
  const [resourceId, setResourceId] = useState(defaultResourceId);
  const [startDate, setStartDate] = useState(
    recommendation?.suggestedStartDate ?? getTodayInputValue(),
  );
  const [endDate, setEndDate] = useState(
    recommendation?.suggestedEndDate ?? getDefaultEndDate(item.estimatedTotalMinutes),
  );
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resourceId) {
      setErrorMessage("Please select a resource.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/internal-manufacturing/assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          operationId: item.operationId,
          resourceId,
          startDate,
          endDate,
          confidence: recommendation?.confidence ?? null,
          riskLevel: recommendation?.riskLevel ?? null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create internal assignment.");
      }

      setSuccessMessage("Internal assignment created.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create internal assignment.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => {
          setIsOpen((value) => !value);
          setSuccessMessage(null);
          setErrorMessage(null);
        }}
        className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-[#0b1633] transition hover:bg-zinc-50"
      >
        {isOpen ? "Close assignment" : "Create assignment"}
      </button>

      {isOpen ? (
        <div className="mt-4 rounded-[22px] border border-zinc-200 bg-white p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Resource
                </label>
                <select
                  className={fieldClasses()}
                  value={resourceId}
                  onChange={(event) => setResourceId(event.target.value)}
                  disabled={activeResources.length === 0}
                >
                  {activeResources.length > 0 ? (
                    activeResources.map((resource) => (
                      <option key={resource.id} value={resource.id}>
                        {resource.name}
                      </option>
                    ))
                  ) : (
                    <option value="">No active resources available</option>
                  )}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Start date
                </label>
                <input
                  type="date"
                  className={fieldClasses()}
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  End date
                </label>
                <input
                  type="date"
                  className={fieldClasses()}
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </div>

            {recommendation ? (
              <div className="rounded-2xl border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-600">
                <div>
                  Suggested resource:{" "}
                  <span className="font-medium text-slate-900">
                    {recommendation.suggestedResourceName ?? "—"}
                  </span>
                </div>
                <div className="mt-1">
                  Suggested window:{" "}
                  <span className="font-medium text-slate-900">
                    {recommendation.suggestedStartDate ?? "—"} →{" "}
                    {recommendation.suggestedEndDate ?? "—"}
                  </span>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {errorMessage}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {successMessage}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-slate-500">
                This will place the internal operation onto a resource lane.
              </p>

              <button
                type="submit"
                disabled={submitting || activeResources.length === 0}
                className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Creating..." : "Create assignment"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
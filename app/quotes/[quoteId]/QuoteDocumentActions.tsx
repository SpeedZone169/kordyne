"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  quoteId: string;
  canFinalizeSnapshot: boolean;
  hasSnapshot: boolean;
  snapshotFinalizedAt: string | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function QuoteDocumentActions({
  quoteId,
  canFinalizeSnapshot,
  hasSnapshot,
  snapshotFinalizedAt,
}: Props) {
  const router = useRouter();
  const [finalizing, setFinalizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFinalize() {
    if (!canFinalizeSnapshot || finalizing) return;

    setFinalizing(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/${quoteId}/finalize`, {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to finalize quote snapshot.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to finalize quote snapshot.",
      );
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div className="w-full max-w-[320px] rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-500">Snapshot</p>
          <p className="mt-1 font-medium text-slate-900">
            {hasSnapshot ? "Finalized" : "Not finalized"}
          </p>
          {hasSnapshot ? (
            <p className="mt-1 text-xs text-slate-500">
              Frozen on {formatDateTime(snapshotFinalizedAt)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Freeze the quote before sending or saving the final PDF.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Save as PDF
        </button>
      </div>

      {canFinalizeSnapshot && !hasSnapshot ? (
        <div className="mt-4">
          <button
            type="button"
            onClick={handleFinalize}
            disabled={finalizing}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finalizing ? "Finalizing..." : "Finalize quote snapshot"}
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
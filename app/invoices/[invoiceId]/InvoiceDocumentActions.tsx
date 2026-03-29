"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  invoiceId: string;
  status: string;
  canManageStatus: boolean;
  canFinalizeSnapshot: boolean;
  finalizedAt: string | null;
  invoiceSource: "kordyne_generated" | "provider_uploaded";
  uploadedInvoiceUrl: string | null;
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

export default function InvoiceDocumentActions({
  invoiceId,
  status,
  canManageStatus,
  canFinalizeSnapshot,
  finalizedAt,
  invoiceSource,
  uploadedInvoiceUrl,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(nextStatus: "sent" | "viewed" | "paid" | "cancelled") {
    if (loading) return;

    setLoading(nextStatus);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update invoice status.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update invoice status.",
      );
    } finally {
      setLoading(null);
    }
  }

  async function finalizeInvoice() {
    if (loading) return;

    setLoading("finalize");
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/finalize`, {
        method: "POST",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to finalize invoice snapshot.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to finalize invoice snapshot.",
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-[340px] rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
      <p className="text-slate-500">Invoice controls</p>

      <p className="mt-2 font-medium text-slate-900 capitalize">
        Current status: {status}
      </p>

      <p className="mt-2 text-xs text-slate-500">
        Snapshot: {finalizedAt ? `finalized on ${formatDateTime(finalizedAt)}` : "not finalized"}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {invoiceSource === "provider_uploaded" && uploadedInvoiceUrl ? (
          <a
            href={uploadedInvoiceUrl}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
          >
            Download PDF
          </a>
        ) : null}

        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
        >
          Save as PDF
        </button>

        {canFinalizeSnapshot ? (
          <button
            type="button"
            onClick={finalizeInvoice}
            disabled={loading === "finalize"}
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "finalize" ? "Finalizing..." : "Finalize snapshot"}
          </button>
        ) : null}
      </div>

      {canManageStatus ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => updateStatus("sent")}
            disabled={loading !== null || status === "sent"}
            className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "sent" ? "Saving..." : "Mark sent"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("paid")}
            disabled={loading !== null || status === "paid"}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "paid" ? "Saving..." : "Mark paid"}
          </button>

          <button
            type="button"
            onClick={() => updateStatus("cancelled")}
            disabled={loading !== null || status === "cancelled"}
            className="rounded-full border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-800 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading === "cancelled" ? "Saving..." : "Cancel invoice"}
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
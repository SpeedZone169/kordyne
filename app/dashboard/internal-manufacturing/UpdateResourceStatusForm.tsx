"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type UpdateResourceStatusFormProps = {
  resourceId: string;
  resourceName: string;
};

const STATUS_OPTIONS = [
  { value: "idle", label: "Idle" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "paused", label: "Paused" },
  { value: "blocked", label: "Blocked" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline", label: "Offline" },
  { value: "complete", label: "Complete" },
];

function fieldClasses() {
  return "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/25 focus:ring-4 focus:ring-[#0b1633]/5";
}

function normalizeReasonCodeInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function UpdateResourceStatusForm({
  resourceId,
  resourceName,
}: UpdateResourceStatusFormProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState("idle");
  const [reasonCode, setReasonCode] = useState("");
  const [reasonDetail, setReasonDetail] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/internal-manufacturing/status-events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId,
          status,
          reasonCode,
          reasonDetail,
          effectiveAt: effectiveAt || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update resource status.");
      }

      setReasonCode("");
      setReasonDetail("");
      setEffectiveAt("");
      setSuccessMessage("Resource status updated.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to update resource status.";
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
        {isOpen ? "Close status update" : "Update status"}
      </button>

      {isOpen ? (
        <div className="mt-4 rounded-[24px] border border-zinc-200 bg-white p-5">
          <div>
            <h4 className="text-[16px] font-semibold text-[#0b1633]">
              Update status for {resourceName}
            </h4>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              Add a manual operational update for this internal resource.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Status
                </label>
                <select
                  className={fieldClasses()}
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Effective at
                </label>
                <input
                  className={fieldClasses()}
                  type="datetime-local"
                  value={effectiveAt}
                  onChange={(event) => setEffectiveAt(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Reason code
              </label>
              <input
                className={fieldClasses()}
                value={reasonCode}
                onChange={(event) =>
                  setReasonCode(normalizeReasonCodeInput(event.target.value))
                }
                placeholder="material_wait"
                maxLength={120}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Reason detail
              </label>
              <textarea
                className={`${fieldClasses()} min-h-[96px] resize-y`}
                value={reasonDetail}
                onChange={(event) => setReasonDetail(event.target.value)}
                placeholder="Optional operational context for this status update."
                maxLength={2000}
              />
            </div>

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

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-sm text-slate-500">
                This creates a status event and updates the resource’s current status.
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save status"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
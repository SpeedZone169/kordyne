"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  providerRelationshipStatusLabels,
  providerRoundModeOptions,
  providerTrustStatusLabels,
  type ProviderRoundMode,
} from "@/lib/providers";
import type {
  PreviousRound,
  ProviderCandidate,
  ServiceRequestSummary,
  ShareableRequestFile,
} from "./types";

type Props = {
  request: ServiceRequestSummary;
  providers: ProviderCandidate[];
  shareableFiles: ShareableRequestFile[];
  previousRounds: PreviousRound[];
};

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

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
  }).format(date);
}

export default function ProviderRoutingComposer({
  request,
  providers,
  shareableFiles,
  previousRounds,
}: Props) {
  const router = useRouter();

  const [mode, setMode] = useState<ProviderRoundMode>("competitive_quote");
  const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);
  const [selectedFileKeys, setSelectedFileKeys] = useState<string[]>([]);
  const [targetDueDate, setTargetDueDate] = useState(request.dueDate ?? "");
  const [requestedQuantity, setRequestedQuantity] = useState(
    request.quantity?.toString() ?? "",
  );
  const [responseDeadline, setResponseDeadline] = useState("");
  const [customerNotes, setCustomerNotes] = useState(request.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileKeyMap = useMemo(() => {
    return new Map(
      shareableFiles.map((file) => [`${file.sourceType}:${file.id}`, file]),
    );
  }, [shareableFiles]);

  const selectedProviders = useMemo(() => {
    const selected = new Set(selectedProviderIds);
    return providers.filter((provider) => selected.has(provider.relationshipId));
  }, [providers, selectedProviderIds]);

  const maxProviders = mode === "competitive_quote" ? 3 : 1;

  function toggleProvider(relationshipId: string) {
    setSelectedProviderIds((current) => {
      const exists = current.includes(relationshipId);

      if (exists) {
        return current.filter((id) => id !== relationshipId);
      }

      if (mode === "direct_award") {
        return [relationshipId];
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, relationshipId];
    });
  }

  function toggleFile(fileKey: string) {
    setSelectedFileKeys((current) =>
      current.includes(fileKey)
        ? current.filter((key) => key !== fileKey)
        : [...current, fileKey],
    );
  }

  function handleModeChange(event: ChangeEvent<HTMLInputElement>) {
    const nextMode = event.target.value as ProviderRoundMode;
    setMode(nextMode);

    setSelectedProviderIds((current) => {
      if (nextMode === "direct_award") {
        return current.slice(0, 1);
      }
      return current.slice(0, 3);
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (selectedProviderIds.length === 0) {
      setError("Select at least one provider.");
      return;
    }

    if (mode === "direct_award" && selectedProviderIds.length !== 1) {
      setError("Direct award requires exactly one provider.");
      return;
    }

    if (mode === "competitive_quote" && selectedProviderIds.length > 3) {
      setError("Quote rounds are limited to three providers in this workflow.");
      return;
    }

    if (selectedFileKeys.length === 0) {
      setError("Select at least one file to share with providers.");
      return;
    }

    setSubmitting(true);

    try {
      const providerSelections = selectedProviderIds
        .map((relationshipId) =>
          providers.find((provider) => provider.relationshipId === relationshipId),
        )
        .filter(Boolean)
        .map((provider) => ({
          providerRelationshipId: provider!.relationshipId,
          providerOrgId: provider!.providerOrgId,
        }));

      const fileSelections = selectedFileKeys
        .map((key) => fileKeyMap.get(key))
        .filter(Boolean)
        .map((file) => ({
          id: file!.id,
          sourceType: file!.sourceType,
        }));

      const response = await fetch("/api/providers/quote-rounds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceRequestId: request.id,
          mode,
          providerSelections,
          fileSelections,
          targetDueDate: targetDueDate || null,
          requestedQuantity: requestedQuantity ? Number(requestedQuantity) : null,
          responseDeadline: responseDeadline || null,
          customerNotes: customerNotes || null,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create provider round.");
      }

      router.push(
        `/dashboard/requests/${request.id}/quotes?roundId=${payload.roundId}`,
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-900">
          Build provider package
        </h2>
        <p className="text-sm text-slate-600">
          Choose how this request should leave your internal workspace, which
          providers will receive it, and which files are explicitly shared.
        </p>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="text-sm text-slate-600">
          Providers available: {providers.length} · Files available:{" "}
          {shareableFiles.length} · Previous rounds: {previousRounds.length}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            {providerRoundModeOptions.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-2xl border p-4 transition ${
                  mode === option.value
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="round-mode"
                    value={option.value}
                    checked={mode === option.value}
                    onChange={handleModeChange}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-slate-900">
                      {option.label}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="grid gap-3">
            {providers.map((provider) => {
              const checked = selectedProviderIds.includes(provider.relationshipId);
              const disabled =
                !checked &&
                ((mode === "direct_award" && selectedProviderIds.length >= 1) ||
                  (mode === "competitive_quote" &&
                    selectedProviderIds.length >= 3));

              return (
                <label
                  key={provider.relationshipId}
                  className={`rounded-2xl border p-4 transition ${
                    checked
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white"
                  } ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-slate-300"}`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggleProvider(provider.relationshipId)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">
                        {provider.providerName}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {providerRelationshipStatusLabels[
                            provider.relationshipStatus
                          ] || provider.relationshipStatus}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {providerTrustStatusLabels[provider.trustStatus] ||
                            provider.trustStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid gap-3">
            {shareableFiles.map((file) => {
              const fileKey = `${file.sourceType}:${file.id}`;
              const checked = selectedFileKeys.includes(fileKey);

              return (
                <label
                  key={fileKey}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    checked
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleFile(fileKey)}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">
                        {file.fileName}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {file.sourceType === "part_file"
                            ? "Vault file"
                            : "Request upload"}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          {formatBytes(file.fileSizeBytes)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                          Added {formatDate(file.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="date"
              value={targetDueDate}
              onChange={(event) => setTargetDueDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={1}
              value={requestedQuantity}
              onChange={(event) => setRequestedQuantity(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              placeholder="Quantity"
            />
            <input
              type="datetime-local"
              value={responseDeadline}
              onChange={(event) => setResponseDeadline(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <textarea
            value={customerNotes}
            onChange={(event) => setCustomerNotes(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm"
            placeholder="Notes shared with provider"
          />

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Publishing..." : "Publish provider package"}
          </button>
        </form>
      </div>
    </div>
  );
}
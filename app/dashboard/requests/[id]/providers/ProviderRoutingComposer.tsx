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
    <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-900">
            Build provider package
          </h2>
          <p className="text-sm text-slate-600">
            Choose how this request should leave your internal workspace, which
            providers will receive it, and which files are explicitly shared.
          </p>
        </div>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              1. Choose route type
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Use a quote round for price and lead-time comparison, or direct
              award when you already know the provider.
            </p>
          </div>

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
                    <div className="mt-1 text-sm text-slate-600">
                      {option.value === "competitive_quote"
                        ? "Send this request to up to three providers and compare quotes internally."
                        : "Send directly to one provider without a competitive quote round."}
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                2. Select providers
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {mode === "competitive_quote"
                  ? "Choose up to three providers for this round."
                  : "Choose the single provider that will receive this direct award."}
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {selectedProviderIds.length} / {maxProviders} selected
            </div>
          </div>

          {providers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              No provider relationships are available yet. Add provider
              relationships first before routing requests externally.
            </div>
          ) : (
            <div className="grid gap-3">
              {providers.map((provider) => {
                const checked = selectedProviderIds.includes(
                  provider.relationshipId,
                );
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
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-slate-900">
                            {provider.providerName}
                          </span>
                          {provider.isPreferred ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Preferred
                            </span>
                          ) : null}
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
                          {provider.providerCode ? (
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-700">
                              Code: {provider.providerCode}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              3. Select shared files
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Providers only see the files selected here. Internal files remain
              private unless explicitly shared.
            </p>
          </div>

          {shareableFiles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-600">
              No shareable files found for this request yet.
            </div>
          ) : (
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
          )}
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 p-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              4. Package details
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Add timeline and quantity context to help providers respond
              accurately.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="targetDueDate"
                className="text-sm font-medium text-slate-700"
              >
                Target due date
              </label>
              <input
                id="targetDueDate"
                type="date"
                value={targetDueDate}
                onChange={(event) => setTargetDueDate(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="requestedQuantity"
                className="text-sm font-medium text-slate-700"
              >
                Requested quantity
              </label>
              <input
                id="requestedQuantity"
                type="number"
                min={1}
                value={requestedQuantity}
                onChange={(event) => setRequestedQuantity(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
                placeholder="e.g. 10"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="responseDeadline"
                className="text-sm font-medium text-slate-700"
              >
                Response deadline
              </label>
              <input
                id="responseDeadline"
                type="datetime-local"
                value={responseDeadline}
                onChange={(event) => setResponseDeadline(event.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-0 focus:border-slate-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="customerNotes"
              className="text-sm font-medium text-slate-700"
            >
              Notes shared with provider
            </label>
            <textarea
              id="customerNotes"
              value={customerNotes}
              onChange={(event) => setCustomerNotes(event.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-500"
              placeholder="Add process expectations, special handling notes, due date context, or quote instructions."
            />
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
          <p className="text-sm text-slate-600">
            {mode === "competitive_quote"
              ? "Publishing creates one quote round and one private package per provider."
              : "Publishing creates one direct-award package for the selected provider."}
          </p>

          <button
            type="submit"
            disabled={submitting || providers.length === 0}
            className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Publishing..." : "Publish provider package"}
          </button>
        </div>
      </form>

      <div className="space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Current package summary
          </h3>

          <dl className="mt-4 grid gap-4 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Request</dt>
              <dd className="text-right font-medium text-slate-900">
                {request.title || request.requestedItemName || "Untitled request"}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Route type</dt>
              <dd className="text-right font-medium text-slate-900">
                {mode === "competitive_quote" ? "Request quotes" : "Direct award"}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Providers</dt>
              <dd className="text-right font-medium text-slate-900">
                {selectedProviders.length > 0
                  ? selectedProviders.map((provider) => provider.providerName).join(", ")
                  : "None selected"}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Files selected</dt>
              <dd className="text-right font-medium text-slate-900">
                {selectedFileKeys.length}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Target due date</dt>
              <dd className="text-right font-medium text-slate-900">
                {targetDueDate ? formatDate(targetDueDate) : "—"}
              </dd>
            </div>

            <div className="flex items-start justify-between gap-4">
              <dt className="text-slate-500">Requested quantity</dt>
              <dd className="text-right font-medium text-slate-900">
                {requestedQuantity || "—"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">
            Previous rounds
          </h3>

          {previousRounds.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No provider rounds have been created for this request yet.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {previousRounds.map((round) => (
                <div
                  key={round.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        Round {round.roundNumber}
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        {round.mode === "competitive_quote"
                          ? "Request quotes"
                          : "Direct award"}
                      </div>
                    </div>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {round.status.replaceAll("_", " ")}
                    </span>
                  </div>

                  <div className="mt-3 text-xs text-slate-500">
                    Created {formatDate(round.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
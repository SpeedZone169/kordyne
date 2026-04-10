"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type {
  InternalManufacturingCapability,
  InternalManufacturingResource,
} from "./types";

type MapCapabilityFormProps = {
  resources: InternalManufacturingResource[];
  capabilities: InternalManufacturingCapability[];
};

function fieldClasses() {
  return "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/25 focus:ring-4 focus:ring-[#0b1633]/5";
}

export default function MapCapabilityForm({
  resources,
  capabilities,
}: MapCapabilityFormProps) {
  const router = useRouter();

  const availableResources = useMemo(
    () =>
      [...resources].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [resources],
  );

  const availableCapabilities = useMemo(
    () =>
      [...capabilities].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      ),
    [capabilities],
  );

  const [resourceId, setResourceId] = useState(availableResources[0]?.id ?? "");
  const [capabilityId, setCapabilityId] = useState(availableCapabilities[0]?.id ?? "");
  const [priorityRank, setPriorityRank] = useState("");
  const [setupMinutes, setSetupMinutes] = useState("");
  const [runMinutesPerUnit, setRunMinutesPerUnit] = useState("");
  const [minimumBatchQty, setMinimumBatchQty] = useState("");
  const [maximumBatchQty, setMaximumBatchQty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resourceId || !capabilityId) {
      setErrorMessage("Please select both a resource and a capability.");
      return;
    }

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch(
        "/api/internal-manufacturing/resource-capabilities",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId,
            capabilityId,
            priorityRank: priorityRank ? Number(priorityRank) : null,
            setupMinutes: setupMinutes ? Number(setupMinutes) : null,
            runMinutesPerUnit: runMinutesPerUnit
              ? Number(runMinutesPerUnit)
              : null,
            minimumBatchQty: minimumBatchQty ? Number(minimumBatchQty) : null,
            maximumBatchQty: maximumBatchQty ? Number(maximumBatchQty) : null,
          }),
        },
      );

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to map capability.");
      }

      setPriorityRank("");
      setSetupMinutes("");
      setRunMinutesPerUnit("");
      setMinimumBatchQty("");
      setMaximumBatchQty("");
      setSuccessMessage("Capability mapped successfully.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to map capability.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  const formDisabled =
    availableResources.length === 0 || availableCapabilities.length === 0;

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-[20px] font-semibold tracking-tight text-[#0b1633]">
          Map capability
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Attach a process capability to a resource so Kordyne can route and plan
          internal work more intelligently.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Resource
            </label>
            <select
              className={fieldClasses()}
              value={resourceId}
              onChange={(event) => setResourceId(event.target.value)}
              disabled={formDisabled}
            >
              {availableResources.length > 0 ? (
                availableResources.map((resource) => (
                  <option key={resource.id} value={resource.id}>
                    {resource.name}
                  </option>
                ))
              ) : (
                <option value="">No resources available</option>
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Capability
            </label>
            <select
              className={fieldClasses()}
              value={capabilityId}
              onChange={(event) => setCapabilityId(event.target.value)}
              disabled={formDisabled}
            >
              {availableCapabilities.length > 0 ? (
                availableCapabilities.map((capability) => (
                  <option key={capability.id} value={capability.id}>
                    {capability.name} ({capability.code})
                  </option>
                ))
              ) : (
                <option value="">No capabilities available</option>
              )}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Priority rank
            </label>
            <input
              className={fieldClasses()}
              value={priorityRank}
              onChange={(event) => setPriorityRank(event.target.value)}
              inputMode="numeric"
              placeholder="1"
              disabled={formDisabled}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Setup minutes
            </label>
            <input
              className={fieldClasses()}
              value={setupMinutes}
              onChange={(event) => setSetupMinutes(event.target.value)}
              inputMode="numeric"
              placeholder="20"
              disabled={formDisabled}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Run mins / unit
            </label>
            <input
              className={fieldClasses()}
              value={runMinutesPerUnit}
              onChange={(event) => setRunMinutesPerUnit(event.target.value)}
              inputMode="decimal"
              placeholder="45"
              disabled={formDisabled}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Min batch qty
            </label>
            <input
              className={fieldClasses()}
              value={minimumBatchQty}
              onChange={(event) => setMinimumBatchQty(event.target.value)}
              inputMode="numeric"
              placeholder="1"
              disabled={formDisabled}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Max batch qty
            </label>
            <input
              className={fieldClasses()}
              value={maximumBatchQty}
              onChange={(event) => setMaximumBatchQty(event.target.value)}
              inputMode="numeric"
              placeholder="50"
              disabled={formDisabled}
            />
          </div>
        </div>

        {formDisabled ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            You need at least one resource and one capability before creating a
            mapping.
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

        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-slate-500">
            Use this to link internal equipment or service capacity to real shop
            capabilities.
          </p>

          <button
            type="submit"
            disabled={submitting || formDisabled}
            className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Mapping..." : "Map capability"}
          </button>
        </div>
      </form>
    </div>
  );
}
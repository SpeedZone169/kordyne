"use client";

import {
  createAutoMetadata,
  createDefaultDisplayName,
  getDiscoveredMachineId,
  getDiscoveredMachineMetaLines,
  getDiscoveredMachineName,
  getDiscoveredMachineStatus,
  getDiscoveredMachineSubtitle,
} from "./discoveryHelpers";
import type { DiscoveredMachine, ProviderUiPreset } from "./connectorUi";
import { formatLabel, getStatusBadgeClasses } from "./connectorUi";

export default function DiscoveryResultsPanel({
  discoveredMachines,
  selectedDiscoveredIds,
  setSelectedDiscoveredIds,
  externalResourceId,
  setExternalResourceId,
  setDisplayName,
  setStructuredMetadata,
  resource,
  providerKey,
  preset,
  credentialProfileId,
  bulkCreating,
  handleBulkCreate,
  isDiscoveredSelected,
  toggleDiscoveredSelected,
  creatingFromDiscoveryId,
  handleCreateFromDiscoveredMachine,
}: {
  discoveredMachines: DiscoveredMachine[];
  selectedDiscoveredIds: string[];
  setSelectedDiscoveredIds: React.Dispatch<React.SetStateAction<string[]>>;
  externalResourceId: string;
  setExternalResourceId: (value: string) => void;
  setDisplayName: (value: string) => void;
  setStructuredMetadata: (value: Record<string, unknown>) => void;
  resource: any;
  providerKey: any;
  preset: ProviderUiPreset;
  credentialProfileId: string;
  bulkCreating: null | "resources" | "resources_capabilities" | "resources_connectors" | "full";
  handleBulkCreate: (
    mode: "resources" | "resources_capabilities" | "resources_connectors" | "full",
  ) => void;
  isDiscoveredSelected: (machine: DiscoveredMachine) => boolean;
  toggleDiscoveredSelected: (machine: DiscoveredMachine) => void;
  creatingFromDiscoveryId: string | null;
  handleCreateFromDiscoveredMachine: (
    machine: DiscoveredMachine,
    mode:
      | "resource_only"
      | "resource_and_capability"
      | "resource_and_connector"
      | "resource_capability_and_connector",
  ) => void;
}) {
  if (discoveredMachines.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        Discovered machines
      </div>

      <div className="rounded-[16px] border border-slate-200 bg-white p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-950">
              {selectedDiscoveredIds.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-slate-950">
              {discoveredMachines.length}
            </span>{" "}
            discovered machine{discoveredMachines.length === 1 ? "" : "s"} selected
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedDiscoveredIds(
                  discoveredMachines.map((machine) => getDiscoveredMachineId(machine)),
                )
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Select all
            </button>

            <button
              type="button"
              onClick={() => setSelectedDiscoveredIds([])}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => handleBulkCreate("resources")}
              disabled={bulkCreating !== null || selectedDiscoveredIds.length === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {bulkCreating === "resources" ? "Creating..." : "Bulk create resources"}
            </button>

            <button
              type="button"
              onClick={() => handleBulkCreate("resources_capabilities")}
              disabled={bulkCreating !== null || selectedDiscoveredIds.length === 0}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {bulkCreating === "resources_capabilities"
                ? "Creating..."
                : "Bulk create + capabilities"}
            </button>

            <button
              type="button"
              onClick={() => handleBulkCreate("resources_connectors")}
              disabled={
                bulkCreating !== null ||
                selectedDiscoveredIds.length === 0 ||
                (preset.requiresCredentialProfile && !credentialProfileId)
              }
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {bulkCreating === "resources_connectors"
                ? "Creating..."
                : "Bulk create + connectors"}
            </button>

            <button
              type="button"
              onClick={() => handleBulkCreate("full")}
              disabled={
                bulkCreating !== null ||
                selectedDiscoveredIds.length === 0 ||
                (preset.requiresCredentialProfile && !credentialProfileId)
              }
              className="rounded-full bg-slate-950 px-3 py-2 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {bulkCreating === "full" ? "Creating..." : "Bulk create all"}
            </button>
          </div>
        </div>

        {preset.requiresCredentialProfile && !credentialProfileId ? (
          <div className="mt-2 text-[11px] text-amber-600">
            Select saved credentials above to enable bulk connector creation.
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        {discoveredMachines.map((machine) => {
          const discoveredId = getDiscoveredMachineId(machine);
          const selected = externalResourceId === discoveredId;
          const isChecked = isDiscoveredSelected(machine);

          return (
            <button
              key={discoveredId}
              type="button"
              onClick={() => {
                setExternalResourceId(discoveredId);
                setDisplayName(createDefaultDisplayName(resource, machine, providerKey));
                setStructuredMetadata(createAutoMetadata(machine));
              }}
              className={`w-full rounded-3xl border p-4 text-left transition ${
                selected
                  ? "border-[#0b1633] bg-[#0f172a] text-white"
                  : isChecked
                    ? "border-slate-300 bg-slate-50 text-slate-900"
                    : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <label
                  className="mr-2 mt-0.5 inline-flex items-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleDiscoveredSelected(machine)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </label>

                <div>
                  <div className="text-sm font-semibold">
                    {getDiscoveredMachineName(machine)}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      selected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {getDiscoveredMachineSubtitle(machine)}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    selected
                      ? "bg-white/10 text-white"
                      : getStatusBadgeClasses(getDiscoveredMachineStatus(machine))
                  }`}
                >
                  {formatLabel(getDiscoveredMachineStatus(machine))}
                </span>
              </div>

              <div
                className={`mt-3 grid gap-1 text-xs ${
                  selected ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {getDiscoveredMachineMetaLines(machine).map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFromDiscoveredMachine(machine, "resource_only");
                  }}
                  disabled={creatingFromDiscoveryId === discoveredId}
                  className={`rounded-full px-3 py-2 text-[11px] font-medium transition ${
                    selected
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {creatingFromDiscoveryId === discoveredId
                    ? "Creating..."
                    : "Create resource"}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFromDiscoveredMachine(machine, "resource_and_capability");
                  }}
                  disabled={creatingFromDiscoveryId === discoveredId}
                  className={`rounded-full px-3 py-2 text-[11px] font-medium transition ${
                    selected
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {creatingFromDiscoveryId === discoveredId
                    ? "Creating..."
                    : "Create + capability"}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFromDiscoveredMachine(machine, "resource_and_connector");
                  }}
                  disabled={
                    creatingFromDiscoveryId === discoveredId ||
                    (preset.requiresCredentialProfile && !credentialProfileId)
                  }
                  className={`rounded-full px-3 py-2 text-[11px] font-medium transition ${
                    selected
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {creatingFromDiscoveryId === discoveredId
                    ? "Creating..."
                    : "Create + connector"}
                </button>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleCreateFromDiscoveredMachine(
                      machine,
                      "resource_capability_and_connector",
                    );
                  }}
                  disabled={
                    creatingFromDiscoveryId === discoveredId ||
                    (preset.requiresCredentialProfile && !credentialProfileId)
                  }
                  className={`rounded-full px-3 py-2 text-[11px] font-medium transition ${
                    selected
                      ? "bg-white/10 text-white hover:bg-white/15"
                      : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                  } disabled:opacity-60`}
                >
                  {creatingFromDiscoveryId === discoveredId
                    ? "Creating..."
                    : "Create + capability + connector"}
                </button>
              </div>

              {preset.requiresCredentialProfile && !credentialProfileId ? (
                <div
                  className={`mt-3 text-[11px] ${
                    selected ? "text-slate-300" : "text-amber-600"
                  }`}
                >
                  Select saved credentials above to enable connector creation.
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
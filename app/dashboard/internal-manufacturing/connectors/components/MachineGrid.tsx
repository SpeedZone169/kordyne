"use client";

import type { InternalResourceConnection } from "../types";
import {
  formatDateTime,
  formatLabel,
  getInitials,
  getStatusBadgeClasses,
  getSyncBadgeClasses,
} from "./connectorUi";
import { InfoTile } from "./uiBits";

type MachineGridItem = {
  resource: { id: string; name: string };
  connection: Pick<
    InternalResourceConnection,
    "displayName" | "lastSyncStatus"
  > | null;
  providerLabel: string;
  technology: string;
  currentStatus: string;
  externalMachineLabel: string | null;
  currentMaterial: string | null;
  currentJobName: string | null;
  rawVendorStatus: string | null;
  lastPingedAt: string | null;
};

export default function MachineGrid({
  filteredMachines,
  selectedResourceId,
  setSelectedResourceId,
}: {
  filteredMachines: MachineGridItem[];
  selectedResourceId: string | null;
  setSelectedResourceId: (value: string) => void;
}) {
  return (
    <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {filteredMachines.map((machine) => {
        const selected = selectedResourceId === machine.resource.id;

        return (
          <button
            key={machine.resource.id}
            type="button"
            onClick={() => setSelectedResourceId(machine.resource.id)}
            className={`rounded-[28px] border p-5 text-left transition ${
              selected
                ? "border-[#0b1633] bg-[#0f172a] text-white shadow-lg"
                : "border-slate-200 bg-white text-slate-900 shadow-sm hover:-translate-y-0.5 hover:shadow-md"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold ${
                    selected ? "bg-white/10 text-white" : "bg-slate-50 text-slate-900"
                  }`}
                >
                  {getInitials(machine.connection?.displayName ?? machine.resource.name)}
                </div>

                <div>
                  <div className="text-sm font-semibold">
                    {machine.connection?.displayName ?? machine.resource.name}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      selected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {machine.providerLabel} · {machine.technology}
                  </div>
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  selected
                    ? "bg-white/10 text-white"
                    : getStatusBadgeClasses(machine.currentStatus)
                }`}
              >
                {formatLabel(machine.currentStatus)}
              </span>
            </div>

            <div
              className={`mt-5 grid grid-cols-2 gap-3 text-xs ${
                selected ? "text-slate-200" : "text-slate-600"
              }`}
            >
              <InfoTile
                selected={selected}
                label="External ID"
                value={machine.externalMachineLabel ?? "—"}
              />
              <InfoTile
                selected={selected}
                label="Provider"
                value={machine.providerLabel}
              />
              <InfoTile
                selected={selected}
                label="Material"
                value={machine.currentMaterial ?? "—"}
              />
              <InfoTile
                selected={selected}
                label="Job"
                value={machine.currentJobName ?? "—"}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                  selected
                    ? "bg-white/10 text-white"
                    : getSyncBadgeClasses(machine.connection?.lastSyncStatus ?? null)
                }`}
              >
                Sync {machine.connection?.lastSyncStatus ?? "manual"}
              </span>

              {machine.rawVendorStatus ? (
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                    selected
                      ? "bg-white/10 text-white"
                      : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                  }`}
                >
                  Vendor {machine.rawVendorStatus}
                </span>
              ) : null}
            </div>

            {machine.lastPingedAt ? (
              <div
                className={`mt-4 text-xs ${
                  selected ? "text-slate-300" : "text-slate-500"
                }`}
              >
                Last ping {formatDateTime(machine.lastPingedAt)}
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
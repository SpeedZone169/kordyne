"use client";

import type { InternalResourceConnection } from "../types";
import {
  formatDateTime,
  getInitials,
} from "./connectorUi";

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

function normalizeStatusLabel(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();

  if (value.includes("run") || value.includes("print")) return "Printing";
  if (value.includes("queue")) return "Queued";
  if (value.includes("pause")) return "Paused";
  if (value.includes("block") || value.includes("error") || value.includes("fail")) {
    return "Warning";
  }
  if (value.includes("maint")) return "Maintenance";
  if (value.includes("off")) return "Offline";
  if (value.includes("complete")) return "Complete";
  return "Idle";
}

function normalizeTechnologyLabel(value: string | null | undefined) {
  const text = (value ?? "").trim();
  if (!text) return "Additive";

  const lower = text.toLowerCase();
  if (lower.includes("composite")) return "Composite";
  if (lower.includes("fff")) return "FFF";
  if (lower.includes("fdm")) return "FDM";
  if (lower.includes("sla")) return "SLA";
  if (lower.includes("sls")) return "SLS";
  if (lower.includes("scan")) return "Scanning";
  if (lower.includes("cnc")) return "CNC";

  return text.length > 18 ? text.slice(0, 18) : text;
}

function normalizeMachineTitle(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 38 ? `${trimmed.slice(0, 35)}...` : trimmed;
}

function normalizeSecondaryLine(providerLabel: string, technology: string) {
  return `${providerLabel} · ${normalizeTechnologyLabel(technology)}`;
}

function normalizeMaterial(value: string | null | undefined) {
  if (!value) return "—";
  return value.length > 16 ? `${value.slice(0, 13)}...` : value;
}

function normalizeJobName(value: string | null | undefined) {
  if (!value) return "—";
  return value.length > 18 ? `${value.slice(0, 15)}...` : value;
}

function normalizeExternalId(value: string | null | undefined) {
  if (!value) return "—";
  return value.length > 14 ? `${value.slice(0, 11)}...` : value;
}

function normalizeLastSeen(value: string | null | undefined) {
  const formatted = formatDateTime(value);
  return formatted === "—" ? "—" : formatted;
}

function getStatusChipClasses(status: string) {
  switch (status) {
    case "Printing":
      return "border-sky-400/20 bg-sky-500/15 text-sky-300";
    case "Queued":
      return "border-violet-400/20 bg-violet-500/15 text-violet-300";
    case "Paused":
      return "border-amber-400/20 bg-amber-500/15 text-amber-300";
    case "Warning":
      return "border-rose-400/20 bg-rose-500/15 text-rose-300";
    case "Maintenance":
      return "border-orange-400/20 bg-orange-500/15 text-orange-300";
    case "Offline":
      return "border-slate-400/20 bg-slate-500/15 text-slate-300";
    case "Complete":
      return "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
    case "Idle":
    default:
      return "border-emerald-400/20 bg-emerald-500/15 text-emerald-300";
  }
}

function getSyncDotClasses(status: string | null | undefined) {
  switch (status) {
    case "ok":
      return "bg-emerald-400";
    case "error":
      return "bg-rose-400";
    case "pending":
      return "bg-amber-400";
    case "disabled":
      return "bg-slate-400";
    default:
      return "bg-slate-500";
  }
}

function CompactStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 h-10 overflow-hidden text-sm font-medium leading-5 text-white">
        {value}
      </div>
    </div>
  );
}

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
    <div className="mt-5 grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
      {filteredMachines.map((machine) => {
        const selected = selectedResourceId === machine.resource.id;
        const displayTitle = normalizeMachineTitle(
          machine.connection?.displayName ?? machine.resource.name,
        );
        const displayStatus = normalizeStatusLabel(machine.currentStatus);
        const displayVendorStatus = normalizeStatusLabel(machine.rawVendorStatus);
        const secondaryLine = normalizeSecondaryLine(
          machine.providerLabel,
          machine.technology,
        );

        return (
          <button
            key={machine.resource.id}
            type="button"
            onClick={() => setSelectedResourceId(machine.resource.id)}
            className={`h-[420px] rounded-[24px] border p-5 text-left transition ${
              selected
                ? "border-sky-500/40 bg-[linear-gradient(180deg,#0d1a2c_0%,#0a1322_100%)] shadow-[0_20px_40px_rgba(2,8,23,0.45)]"
                : "border-white/10 bg-[linear-gradient(180deg,#0f1b2d_0%,#0b1524_100%)] shadow-[0_14px_30px_rgba(2,8,23,0.28)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(2,8,23,0.4)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
                    {getInitials(displayTitle)}
                  </div>

                  <div className="min-w-0">
                    <div className="line-clamp-2 min-h-[52px] text-lg font-semibold leading-6 text-white">
                      {displayTitle}
                    </div>
                    <div className="mt-1 h-5 overflow-hidden text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      {secondaryLine}
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusChipClasses(
                    displayStatus,
                  )}`}
                >
                  {displayStatus}
                </span>
              </div>

              <div className="mt-5 flex-1 rounded-[22px] border border-white/5 bg-black/10 p-4">
                <div className="flex h-full flex-col justify-between">
                  <div className="grid grid-cols-2 gap-3">
                    <CompactStat
                      label="External ID"
                      value={normalizeExternalId(machine.externalMachineLabel)}
                    />
                    <CompactStat
                      label="Provider"
                      value={machine.providerLabel}
                    />
                    <CompactStat
                      label="Material"
                      value={normalizeMaterial(machine.currentMaterial)}
                    />
                    <CompactStat
                      label="Job"
                      value={normalizeJobName(machine.currentJobName)}
                    />
                  </div>

                  <div className="mt-5 space-y-3 border-t border-white/10 pt-4">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="uppercase tracking-[0.18em] text-slate-500">
                        Vendor state
                      </span>
                      <span className="font-medium text-slate-300">
                        {displayVendorStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="uppercase tracking-[0.18em] text-slate-500">
                        Last seen
                      </span>
                      <span className="font-medium text-slate-300">
                        {normalizeLastSeen(machine.lastPingedAt)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="uppercase tracking-[0.18em] text-slate-500">
                        Sync
                      </span>
                      <span className="inline-flex items-center gap-2 font-medium text-slate-300">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${getSyncDotClasses(
                            machine.connection?.lastSyncStatus ?? null,
                          )}`}
                        />
                        {machine.connection?.lastSyncStatus ?? "manual"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-3 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                  {machine.resource.name.length > 18
                    ? `${machine.resource.name.slice(0, 15)}...`
                    : machine.resource.name}
                </span>

                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                  {normalizeTechnologyLabel(machine.technology)}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
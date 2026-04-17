"use client";

import type { InternalResourceConnection } from "../types";
import { formatDateTime, getInitials } from "./connectorUi";

type MachineGridItem = {
  resource: {
    id: string;
    name: string;
    currentStatus?: string | null;
    metadata?: Record<string, unknown> | null;
    latestStatusEvent?: {
      effectiveAt?: string | null;
      payload?: unknown;
    } | null;
  };
  connection: Pick<
    InternalResourceConnection,
    "displayName" | "lastSyncStatus" | "metadata"
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function clampText(value: string | null | undefined, max: number, fallback = "—") {
  const text = (value ?? "").trim();
  if (!text) return fallback;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
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
  if (lower.includes("mjf")) return "MJF";
  if (lower.includes("cnc")) return "CNC";
  if (lower.includes("scan")) return "Scanning";
  return clampText(text, 18, "Additive");
}

function normalizeStatusLabel(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();

  if (value.includes("maintenance")) return "Maintenance";
  if (value.includes("blocked")) return "Blocked";
  if (value.includes("unreachable")) return "Unreachable";
  if (value.includes("offline")) return "Offline";
  if (value.includes("paused")) return "Paused";
  if (value.includes("queue")) return "Queued";
  if (value.includes("run") || value.includes("print")) return "Printing";
  if (value.includes("complete")) return "Complete";
  return "Idle";
}

function getStatusChipClasses(status: string) {
  switch (status) {
    case "Printing":
      return "border-sky-400/20 bg-sky-500/15 text-sky-300";
    case "Queued":
      return "border-violet-400/20 bg-violet-500/15 text-violet-300";
    case "Paused":
      return "border-amber-400/20 bg-amber-500/15 text-amber-300";
    case "Blocked":
      return "border-rose-400/20 bg-rose-500/15 text-rose-300";
    case "Maintenance":
      return "border-orange-400/20 bg-orange-500/15 text-orange-300";
    case "Offline":
    case "Unreachable":
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

function inferMetricType(technology: string) {
  const lower = technology.toLowerCase();
  if (lower.includes("fdm") || lower.includes("fff") || lower.includes("composite")) {
    return "fdm";
  }
  if (lower.includes("sla")) return "sla";
  if (lower.includes("sls") || lower.includes("mjf")) return "powder";
  if (lower.includes("cnc")) return "cnc";
  if (lower.includes("scan")) return "scan";
  return "generic";
}

function extractPayload(resource: MachineGridItem["resource"]) {
  return asRecord(resource.latestStatusEvent?.payload);
}

function extractPrinter(payload: Record<string, unknown>) {
  return asRecord(payload.printer);
}

function extractProgress(
  payload: Record<string, unknown>,
  printer: Record<string, unknown>,
) {
  return (
    readNumber(payload.progress_percent) ??
    readNumber(printer.progressPercent) ??
    readNumber(asRecord(printer.printerStatus).progressPercent) ??
    null
  );
}

function extractQueueCount(payload: Record<string, unknown>, printer: Record<string, unknown>) {
  return (
    readNumber(payload.queue_count) ??
    readNumber(printer.queueCount) ??
    readNumber(asRecord(printer.printerStatus).queueCount) ??
    null
  );
}

function extractRemainingTime(
  payload: Record<string, unknown>,
  printer: Record<string, unknown>,
) {
  return (
    readString(payload.remaining_time_label) ??
    readString(printer.remainingTimeLabel) ??
    readString(asRecord(printer.printerStatus).remainingTimeLabel) ??
    null
  );
}

function extractEffectiveStatusInfo(machine: MachineGridItem) {
  const payload = extractPayload(machine.resource);
  const printer = extractPrinter(payload);

  const manualOverrideStatus =
    readString(payload.manual_override_status) ??
    readString(machine.resource.metadata?.manual_override_status) ??
    readString(machine.connection?.metadata?.manual_override_status);

  const manualOverrideUntil =
    readString(payload.manual_override_expires_at) ??
    readString(machine.resource.metadata?.manual_override_expires_at) ??
    readString(machine.connection?.metadata?.manual_override_expires_at);

  const effectiveStatus =
    manualOverrideStatus ??
    readString(payload.effective_status) ??
    machine.currentStatus ??
    "idle";

  const effectiveStatusSource =
    manualOverrideStatus
      ? "Manual override"
      : readString(payload.effective_status_source) ??
        (machine.rawVendorStatus ? "Vendor" : "Resource");

  const vendorStatus =
    machine.rawVendorStatus ??
    readString(payload.vendor_status) ??
    readString(printer.rawStatus);

  return {
    effectiveStatus: normalizeStatusLabel(effectiveStatus),
    effectiveStatusSource,
    vendorStatus: vendorStatus ? normalizeStatusLabel(vendorStatus) : "—",
    manualOverrideUntil: manualOverrideUntil ? formatDateTime(manualOverrideUntil) : null,
  };
}

function metricRows(machine: MachineGridItem) {
  const payload = extractPayload(machine.resource);
  const printer = extractPrinter(payload);
  const type = inferMetricType(machine.technology);

  const progress = extractProgress(payload, printer);
  const queueCount = extractQueueCount(payload, printer);
  const remainingTime = extractRemainingTime(payload, printer);

  const common = {
    job: clampText(machine.currentJobName, 18),
    queue: queueCount == null ? "—" : String(queueCount),
    eta: clampText(remainingTime, 12),
    material: clampText(machine.currentMaterial, 16),
  };

  if (type === "fdm") {
    return [
      { label: "Material", value: common.material },
      {
        label: "Progress",
        value: progress == null ? "—" : `${Math.max(0, Math.min(100, Math.round(progress)))}%`,
      },
      { label: "Job", value: common.job },
      { label: "Queue", value: common.queue },
      { label: "Remaining", value: common.eta },
      { label: "Technology", value: normalizeTechnologyLabel(machine.technology) },
    ];
  }

  if (type === "sla") {
    return [
      { label: "Resin", value: common.material },
      {
        label: "Progress",
        value: progress == null ? "—" : `${Math.max(0, Math.min(100, Math.round(progress)))}%`,
      },
      { label: "Job", value: common.job },
      { label: "Queue", value: common.queue },
      { label: "Remaining", value: common.eta },
      { label: "Build Type", value: "SLA" },
    ];
  }

  if (type === "powder") {
    return [
      { label: "Material", value: common.material },
      {
        label: "Build %",
        value: progress == null ? "—" : `${Math.max(0, Math.min(100, Math.round(progress)))}%`,
      },
      { label: "Build Job", value: common.job },
      { label: "Queue", value: common.queue },
      { label: "Remaining", value: common.eta },
      { label: "Process", value: normalizeTechnologyLabel(machine.technology) },
    ];
  }

  if (type === "cnc") {
    return [
      { label: "Program", value: common.job },
      { label: "Queue", value: common.queue },
      { label: "Remaining", value: common.eta },
      { label: "Status", value: normalizeStatusLabel(machine.currentStatus) },
      { label: "Resource", value: clampText(machine.resource.name, 16) },
      { label: "Process", value: "CNC" },
    ];
  }

  if (type === "scan") {
    return [
      { label: "Scan Job", value: common.job },
      { label: "Queue", value: common.queue },
      { label: "Remaining", value: common.eta },
      { label: "Mode", value: "Scanning" },
      { label: "Provider", value: clampText(machine.providerLabel, 16) },
      { label: "Resource", value: clampText(machine.resource.name, 16) },
    ];
  }

  return [
    { label: "Material", value: common.material },
    { label: "Job", value: common.job },
    { label: "Queue", value: common.queue },
    { label: "Remaining", value: common.eta },
    { label: "Provider", value: clampText(machine.providerLabel, 16) },
    { label: "Technology", value: normalizeTechnologyLabel(machine.technology) },
  ];
}

function CompactStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[10px] border border-white/5 bg-white/[0.03] px-3 py-3">
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
    <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
      {filteredMachines.map((machine) => {
        const selected = selectedResourceId === machine.resource.id;
        const title = clampText(
          machine.connection?.displayName ?? machine.resource.name,
          38,
          "Machine",
        );
        const subtitle = `${clampText(machine.providerLabel, 14)} · ${normalizeTechnologyLabel(machine.technology)}`;
        const effective = extractEffectiveStatusInfo(machine);
        const stats = metricRows(machine);

        return (
          <button
            key={machine.resource.id}
            type="button"
            onClick={() => setSelectedResourceId(machine.resource.id)}
            className={`h-[430px] rounded-[16px] border p-4 text-left transition ${
              selected
                ? "border-sky-500/40 bg-[linear-gradient(180deg,#0d1a2c_0%,#0a1322_100%)] shadow-[0_20px_40px_rgba(2,8,23,0.45)]"
                : "border-white/10 bg-[linear-gradient(180deg,#0f1b2d_0%,#0b1524_100%)] shadow-[0_14px_30px_rgba(2,8,23,0.28)] hover:-translate-y-0.5 hover:border-white/20 hover:shadow-[0_20px_40px_rgba(2,8,23,0.4)]"
            }`}
          >
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-white/[0.05] text-sm font-semibold text-white">
                    {getInitials(title)}
                  </div>

                  <div className="min-w-0">
                    <div className="line-clamp-2 min-h-[48px] text-lg font-semibold leading-6 text-white">
                      {title}
                    </div>
                    <div className="mt-1 h-5 overflow-hidden text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                      {subtitle}
                    </div>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getStatusChipClasses(
                    effective.effectiveStatus,
                  )}`}
                >
                  {effective.effectiveStatus}
                </span>
              </div>

              <div className="mt-4 rounded-[14px] border border-white/5 bg-black/10 p-4">
                <div className="flex h-[76px] items-center justify-between rounded-[12px] border border-white/5 bg-white/[0.03] px-4">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Effective status
                    </div>
                    <div className="mt-2 text-base font-semibold text-white">
                      {effective.effectiveStatus}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      Source: {effective.effectiveStatusSource}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Vendor
                    </div>
                    <div className="mt-2 text-sm font-medium text-slate-300">
                      {effective.vendorStatus}
                    </div>
                    {effective.manualOverrideUntil ? (
                      <div className="mt-1 text-xs text-amber-300">
                        Until {effective.manualOverrideUntil}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid flex-1 grid-cols-2 gap-3">
                {stats.slice(0, 4).map((item) => (
                  <CompactStat key={item.label} label={item.label} value={item.value} />
                ))}
              </div>

              <div className="mt-4 rounded-[12px] border border-white/10 bg-white/[0.03] px-3 py-3">
                <div className="grid gap-2 text-xs text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.18em] text-slate-500">
                      External ID
                    </span>
                    <span className="truncate text-right text-slate-300">
                      {clampText(machine.externalMachineLabel, 18)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="uppercase tracking-[0.18em] text-slate-500">
                      Last seen
                    </span>
                    <span className="text-right text-slate-300">
                      {formatDateTime(machine.lastPingedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3">
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

              <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                  {clampText(machine.resource.name, 18)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                  {stats[4]?.value ?? "—"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 font-medium text-slate-300">
                  {stats[5]?.value ?? "—"}
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
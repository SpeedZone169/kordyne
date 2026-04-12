"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type {
  FormlabsDiscoveredPrinter,
  InternalConnectorCredentialProfile,
  InternalConnectorResource,
  InternalResourceConnection,
  InternalResourceConnectionsData,
} from "./types";

type Props = {
  data: InternalResourceConnectionsData;
};

type FleetCategory =
  | "All equipment"
  | "3D printers"
  | "CNC"
  | "Inspection & QA"
  | "Finishing"
  | "General";

type ViewMode = "grid" | "table";

type MachineRow = {
  resource: InternalConnectorResource;
  connection: InternalResourceConnection | null;
  category: FleetCategory;
  technology: string;
  providerKey: string;
  providerLabel: string;
  location: string;
  currentStatus: InternalConnectorResource["currentStatus"];
  currentJobName: string | null;
  currentJobStatus: string | null;
  currentMaterial: string | null;
  remainingTimeMs: number | null;
  rawVendorStatus: string | null;
  machineTypeLabel: string | null;
  externalMachineLabel: string | null;
};

const providerOptions = [
  "formlabs",
  "ultimaker",
  "markforged",
  "stratasys",
  "hp",
  "mtconnect",
  "opc_ua",
  "manual",
  "other",
] as const;

const connectionModeOptions = [
  "api_key",
  "oauth",
  "agent_url",
  "manual",
] as const;

const FORMLABS_BASE_URL = "https://api.formlabs.com";

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDurationMs(value?: number | null) {
  if (!value || value <= 0) return "—";

  const totalMinutes = Math.floor(value / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readPath(root: unknown, path: string[]) {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function getSyncBadgeClasses(
  status:
    | InternalResourceConnection["lastSyncStatus"]
    | InternalConnectorCredentialProfile["lastTestStatus"],
) {
  switch (status) {
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    case "disabled":
      return "bg-zinc-200 text-zinc-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBadgeClasses(status: InternalConnectorResource["currentStatus"]) {
  switch (status) {
    case "running":
      return "bg-sky-100 text-sky-700";
    case "queued":
      return "bg-violet-100 text-violet-700";
    case "paused":
      return "bg-amber-100 text-amber-700";
    case "blocked":
      return "bg-rose-100 text-rose-700";
    case "maintenance":
      return "bg-orange-100 text-orange-700";
    case "offline":
      return "bg-zinc-200 text-zinc-700";
    case "complete":
      return "bg-emerald-100 text-emerald-700";
    case "idle":
    default:
      return "bg-emerald-50 text-emerald-700";
  }
}

function maskProviderLabel(value: string) {
  if (value === "manual") return "Manual";
  if (value === "mtconnect") return "MTConnect";
  if (value === "opc_ua") return "OPC UA";
  return formatLabel(value);
}

function deriveCategory(resource: InternalConnectorResource): FleetCategory {
  if (
    resource.serviceDomain === "additive" ||
    resource.resourceType === "printer"
  ) {
    return "3D printers";
  }

  if (
    resource.serviceDomain === "cnc" ||
    resource.resourceType === "cnc_machine"
  ) {
    return "CNC";
  }

  if (
    resource.serviceDomain === "qa" ||
    resource.serviceDomain === "scanning" ||
    resource.resourceType === "scanner" ||
    resource.resourceType === "inspection_station"
  ) {
    return "Inspection & QA";
  }

  if (
    resource.serviceDomain === "finishing" ||
    resource.serviceDomain === "assembly" ||
    resource.resourceType === "finishing_station" ||
    resource.resourceType === "oven"
  ) {
    return "Finishing";
  }

  return "General";
}

function deriveTechnology(
  resource: InternalConnectorResource,
  connection: InternalResourceConnection | null,
) {
  const resourceMetadata = resource.metadata ?? {};
  const connectionMetadata = connection?.metadata ?? {};

  const metadataCandidates = [
    readString(resourceMetadata.technology),
    readString(resourceMetadata.technologyLabel),
    readString(resourceMetadata.processTechnology),
    readString(resourceMetadata.manufacturingTechnology),
    readString(connectionMetadata.technology),
    readString(connectionMetadata.technologyLabel),
    readString(connectionMetadata.processTechnology),
  ].filter(Boolean) as string[];

  if (metadataCandidates.length > 0) {
    return metadataCandidates[0];
  }

  const machineTypeId =
    readString(
      readPath(resource.latestStatusEvent?.payload, ["printer", "machineTypeId"]),
    ) ?? readString(connectionMetadata.machineTypeId);

  const normalizedMachineType = machineTypeId?.toLowerCase() ?? "";

  if (
    normalizedMachineType.includes("form-2") ||
    normalizedMachineType.includes("form-3") ||
    normalizedMachineType.includes("form-4")
  ) {
    return "SLA";
  }

  if (normalizedMachineType.includes("fuse")) {
    return "SLS";
  }

  if (
    normalizedMachineType.includes("jet fusion") ||
    normalizedMachineType.includes("mjf")
  ) {
    return "MJF";
  }

  if (resource.serviceDomain === "additive") {
    return "Additive";
  }

  if (resource.serviceDomain === "cnc") {
    return "CNC";
  }

  if (resource.serviceDomain === "qa") {
    return "Inspection";
  }

  if (resource.serviceDomain === "scanning") {
    return "Scanning";
  }

  if (resource.serviceDomain === "finishing") {
    return "Finishing";
  }

  return formatLabel(resource.resourceType);
}

function buildMachineRow(
  resource: InternalConnectorResource,
  connection: InternalResourceConnection | null,
): MachineRow {
  const payload = asRecord(resource.latestStatusEvent?.payload ?? {});
  const providerKey = connection?.providerKey ?? "manual";

  return {
    resource,
    connection,
    category: deriveCategory(resource),
    technology: deriveTechnology(resource, connection),
    providerKey,
    providerLabel: maskProviderLabel(providerKey),
    location: resource.locationLabel || "Unassigned",
    currentStatus: resource.currentStatus,
    currentJobName: readString(
      readPath(payload, ["printer", "printerStatus", "currentPrintRun", "name"]),
    ),
    currentJobStatus: readString(
      readPath(payload, ["printer", "printerStatus", "currentPrintRun", "status"]),
    ),
    currentMaterial:
      readString(
        readPath(payload, [
          "printer",
          "printerStatus",
          "currentPrintRun",
          "material",
        ]),
      ) ??
      readString(readPath(payload, ["printer", "previousPrintRun", "material"])),
    remainingTimeMs: readNumber(
      readPath(payload, [
        "printer",
        "printerStatus",
        "currentPrintRun",
        "estimatedTimeRemainingMs",
      ]),
    ),
    rawVendorStatus: readString(payload.raw_status),
    machineTypeLabel: readString(readPath(payload, ["printer", "machineTypeId"])),
    externalMachineLabel:
      connection?.externalResourceId ??
      readString(readPath(payload, ["printer", "serial"])),
  };
}

function getInitials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "MC";
}

function sortByLabel(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

export default function Client({ data }: Props) {
  const router = useRouter();

  const connectionsByResourceId = useMemo(() => {
    const map = new Map<string, InternalResourceConnection>();

    for (const connection of data.connections) {
      if (connection.resourceId) {
        map.set(connection.resourceId, connection);
      }
    }

    return map;
  }, [data.connections]);

  const machines = useMemo(
    () =>
      data.resources.map((resource) =>
        buildMachineRow(resource, connectionsByResourceId.get(resource.id) ?? null),
      ),
    [data.resources, connectionsByResourceId],
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    machines.find((machine) => machine.connection)?.resource.id ??
      machines[0]?.resource.id ??
      null,
  );

  const [activeCategory, setActiveCategory] =
    useState<FleetCategory>("All equipment");
  const [activeTechnology, setActiveTechnology] = useState<string>(
    "All technologies",
  );
  const [activeProvider, setActiveProvider] = useState<string>("All providers");
  const [activeLocation, setActiveLocation] = useState<string>("All locations");
  const [activeStatus, setActiveStatus] = useState<string>("All statuses");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    if (
      selectedResourceId &&
      machines.some((machine) => machine.resource.id === selectedResourceId)
    ) {
      return;
    }

    setSelectedResourceId(
      machines.find((machine) => machine.connection)?.resource.id ??
        machines[0]?.resource.id ??
        null,
    );
  }, [machines, selectedResourceId]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<FleetCategory, number>();

    for (const machine of machines) {
      counts.set(machine.category, (counts.get(machine.category) ?? 0) + 1);
    }

    return counts;
  }, [machines]);

  const technologiesForCategory = useMemo(() => {
    const scoped =
      activeCategory === "All equipment"
        ? machines
        : machines.filter((machine) => machine.category === activeCategory);

    return sortByLabel([...new Set(scoped.map((machine) => machine.technology))]);
  }, [machines, activeCategory]);

  const providersForCategory = useMemo(() => {
    const scoped =
      activeCategory === "All equipment"
        ? machines
        : machines.filter((machine) => machine.category === activeCategory);

    return sortByLabel([...new Set(scoped.map((machine) => machine.providerLabel))]);
  }, [machines, activeCategory]);

  const locations = useMemo(
    () => sortByLabel([...new Set(machines.map((machine) => machine.location))]),
    [machines],
  );

  const filteredMachines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return machines.filter((machine) => {
      if (
        activeCategory !== "All equipment" &&
        machine.category !== activeCategory
      ) {
        return false;
      }

      if (
        activeTechnology !== "All technologies" &&
        machine.technology !== activeTechnology
      ) {
        return false;
      }

      if (
        activeProvider !== "All providers" &&
        machine.providerLabel !== activeProvider
      ) {
        return false;
      }

      if (
        activeLocation !== "All locations" &&
        machine.location !== activeLocation
      ) {
        return false;
      }

      if (
        activeStatus !== "All statuses" &&
        machine.currentStatus !== activeStatus
      ) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchable = [
        machine.resource.name,
        machine.connection?.displayName ?? "",
        machine.externalMachineLabel ?? "",
        machine.providerLabel,
        machine.technology,
        machine.location,
        machine.currentJobName ?? "",
        machine.currentMaterial ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [
    activeCategory,
    activeLocation,
    activeProvider,
    activeStatus,
    activeTechnology,
    machines,
    search,
  ]);

  const selectedMachine =
    filteredMachines.find((machine) => machine.resource.id === selectedResourceId) ??
    machines.find((machine) => machine.resource.id === selectedResourceId) ??
    null;

  const connectedCount = machines.filter((machine) => machine.connection).length;
  const runningCount = machines.filter(
    (machine) => machine.currentStatus === "running",
  ).length;
  const idleCount = machines.filter(
    (machine) => machine.currentStatus === "idle",
  ).length;
  const attentionCount = machines.filter(
    (machine) =>
      machine.currentStatus === "blocked" ||
      machine.currentStatus === "offline" ||
      machine.currentStatus === "maintenance" ||
      machine.connection?.lastSyncStatus === "error",
  ).length;

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Internal connectors
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Machine integrations
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Manage machine providers, discover devices, and monitor live status
              across technologies, locations, and internal resource lanes.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/internal-manufacturing"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Back to overview
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Open setup
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/schedule"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open schedule
            </Link>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-800">
              Some connector data could not be loaded completely.
            </div>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              {data.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)_390px]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Categories
            </div>

            <div className="mt-4 space-y-2">
              {(
                [
                  "All equipment",
                  "3D printers",
                  "CNC",
                  "Inspection & QA",
                  "Finishing",
                  "General",
                ] as FleetCategory[]
              ).map((category) => {
                const count =
                  category === "All equipment"
                    ? machines.length
                    : categoryCounts.get(category) ?? 0;

                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => {
                      setActiveCategory(category);
                      setActiveTechnology("All technologies");
                      setActiveProvider("All providers");
                    }}
                    className={`flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm transition ${
                      activeCategory === category
                        ? "bg-slate-950 text-white"
                        : "bg-[#fafaf9] text-slate-900 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{category}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        activeCategory === category
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Technology
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <FilterChip
                active={activeTechnology === "All technologies"}
                onClick={() => setActiveTechnology("All technologies")}
              >
                All
              </FilterChip>

              {technologiesForCategory.map((technology) => (
                <FilterChip
                  key={technology}
                  active={activeTechnology === technology}
                  onClick={() => setActiveTechnology(technology)}
                >
                  {technology}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Providers
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <FilterChip
                active={activeProvider === "All providers"}
                onClick={() => setActiveProvider("All providers")}
              >
                All
              </FilterChip>

              {providersForCategory.map((provider) => (
                <FilterChip
                  key={provider}
                  active={activeProvider === provider}
                  onClick={() => setActiveProvider(provider)}
                >
                  {provider}
                </FilterChip>
              ))}
            </div>
          </div>
        </aside>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard label="Connected machines" value={connectedCount} />
            <StatCard label="Running" value={runningCount} />
            <StatCard label="Idle" value={idleCount} />
            <StatCard label="Attention needed" value={attentionCount} />
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">
                  Fleet workspace
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Filter by location, technology, provider, and live status. Switch
                  between grid and table views depending on fleet size.
                </p>
              </div>

              <div className="flex rounded-full border border-zinc-300 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    viewMode === "grid"
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-zinc-50"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    viewMode === "table"
                      ? "bg-slate-950 text-white"
                      : "text-slate-700 hover:bg-zinc-50"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search machine, serial, job, material..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Location">
                <select
                  value={activeLocation}
                  onChange={(event) => setActiveLocation(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                >
                  <option value="All locations">All locations</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Status">
                <select
                  value={activeStatus}
                  onChange={(event) => setActiveStatus(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                >
                  <option value="All statuses">All statuses</option>
                  {[
                    "idle",
                    "queued",
                    "running",
                    "paused",
                    "blocked",
                    "maintenance",
                    "offline",
                    "complete",
                  ].map((status) => (
                    <option key={status} value={status}>
                      {formatLabel(status)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Selected segment">
                <div className="rounded-full border border-zinc-200 bg-[#fafaf9] px-4 py-3 text-sm text-slate-700">
                  {activeCategory}
                </div>
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-500">
                Showing{" "}
                <span className="font-semibold text-slate-900">
                  {filteredMachines.length}
                </span>{" "}
                machine{filteredMachines.length === 1 ? "" : "s"}
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setActiveCategory("All equipment");
                  setActiveTechnology("All technologies");
                  setActiveProvider("All providers");
                  setActiveLocation("All locations");
                  setActiveStatus("All statuses");
                }}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Reset filters
              </button>
            </div>

            {filteredMachines.length === 0 ? (
              <div className="mt-6 rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
                No machines match the current filters.
              </div>
            ) : viewMode === "grid" ? (
              <div className="mt-6 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredMachines.map((machine) => (
                  <button
                    key={machine.resource.id}
                    type="button"
                    onClick={() => setSelectedResourceId(machine.resource.id)}
                    className={`rounded-[26px] border p-5 text-left shadow-sm transition ${
                      selectedResourceId === machine.resource.id
                        ? "border-slate-950 bg-slate-950 text-white"
                        : "border-zinc-200 bg-[#fafaf9] text-slate-950 hover:border-zinc-300 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold ${
                            selectedResourceId === machine.resource.id
                              ? "bg-white/10 text-white"
                              : "bg-white text-slate-900"
                          }`}
                        >
                          {getInitials(
                            machine.connection?.displayName ?? machine.resource.name,
                          )}
                        </div>

                        <div>
                          <div className="text-base font-semibold">
                            {machine.connection?.displayName ?? machine.resource.name}
                          </div>
                          <div
                            className={`mt-1 text-sm ${
                              selectedResourceId === machine.resource.id
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {machine.providerLabel} · {machine.technology}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedResourceId === machine.resource.id
                            ? "bg-white/15 text-white"
                            : getStatusBadgeClasses(machine.currentStatus)
                        }`}
                      >
                        {formatLabel(machine.currentStatus)}
                      </span>
                    </div>

                    <div
                      className={`mt-4 grid gap-2 text-sm ${
                        selectedResourceId === machine.resource.id
                          ? "text-slate-200"
                          : "text-slate-600"
                      }`}
                    >
                      <div>Internal resource: {machine.resource.name}</div>
                      <div>Location: {machine.location}</div>
                      <div>External ID: {machine.externalMachineLabel ?? "—"}</div>
                      <div>Job: {machine.currentJobName ?? "—"}</div>
                      <div>Material: {machine.currentMaterial ?? "—"}</div>
                      <div>Remaining: {formatDurationMs(machine.remainingTimeMs)}</div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          selectedResourceId === machine.resource.id
                            ? "bg-white/10 text-white"
                            : getSyncBadgeClasses(
                                machine.connection?.lastSyncStatus ?? null,
                              )
                        }`}
                      >
                        Sync {machine.connection?.lastSyncStatus ?? "manual"}
                      </span>

                      {machine.rawVendorStatus ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            selectedResourceId === machine.resource.id
                              ? "bg-white/10 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          Vendor: {machine.rawVendorStatus}
                        </span>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-6 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                      <th className="px-4 py-2">Machine</th>
                      <th className="px-4 py-2">Provider</th>
                      <th className="px-4 py-2">Technology</th>
                      <th className="px-4 py-2">Location</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Current job</th>
                      <th className="px-4 py-2">Material</th>
                      <th className="px-4 py-2">Remaining</th>
                      <th className="px-4 py-2">Last sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMachines.map((machine) => (
                      <tr
                        key={machine.resource.id}
                        onClick={() => setSelectedResourceId(machine.resource.id)}
                        className={`cursor-pointer rounded-[20px] ${
                          selectedResourceId === machine.resource.id
                            ? "bg-slate-950 text-white"
                            : "bg-[#fafaf9] text-slate-900"
                        }`}
                      >
                        <td className="rounded-l-[20px] px-4 py-4">
                          <div className="font-semibold">
                            {machine.connection?.displayName ?? machine.resource.name}
                          </div>
                          <div
                            className={`mt-1 text-xs ${
                              selectedResourceId === machine.resource.id
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {machine.resource.name}
                          </div>
                        </td>
                        <td className="px-4 py-4">{machine.providerLabel}</td>
                        <td className="px-4 py-4">{machine.technology}</td>
                        <td className="px-4 py-4">{machine.location}</td>
                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              selectedResourceId === machine.resource.id
                                ? "bg-white/15 text-white"
                                : getStatusBadgeClasses(machine.currentStatus)
                            }`}
                          >
                            {formatLabel(machine.currentStatus)}
                          </span>
                        </td>
                        <td className="px-4 py-4">{machine.currentJobName ?? "—"}</td>
                        <td className="px-4 py-4">{machine.currentMaterial ?? "—"}</td>
                        <td className="px-4 py-4">
                          {formatDurationMs(machine.remainingTimeMs)}
                        </td>
                        <td className="rounded-r-[20px] px-4 py-4">
                          {formatDateTime(machine.connection?.lastSyncAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          {data.canManageConnectors ? (
            <>
              <FormlabsProfilesPanel
                organizationId={
                  data.resources[0]?.organizationId ??
                  data.formlabsProfiles[0]?.organizationId ??
                  null
                }
                profiles={data.formlabsProfiles}
                onSaved={() => router.refresh()}
              />

              {selectedMachine ? (
                <MachineActionPanel
                  resource={selectedMachine.resource}
                  existingConnection={selectedMachine.connection}
                  resources={data.resources}
                  formlabsProfiles={data.formlabsProfiles}
                  selectedResourceId={selectedResourceId}
                  onSelectedResourceChange={setSelectedResourceId}
                  onSaved={() => router.refresh()}
                  onDeleted={() => router.refresh()}
                />
              ) : null}
            </>
          ) : (
            <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-600">
                You are signed in as{" "}
                <span className="font-semibold text-slate-900">
                  {data.viewerRole ?? "viewer"}
                </span>
                . Connector setup and vendor credentials can be managed only by
                organization admins.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-slate-950 text-white"
          : "border border-zinc-200 bg-white text-slate-700 hover:bg-zinc-50"
      }`}
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

function FormlabsProfilesPanel({
  organizationId,
  profiles,
  onSaved,
}: {
  organizationId: string | null;
  profiles: InternalConnectorCredentialProfile[];
  onSaved: () => void;
}) {
  const [displayName, setDisplayName] = useState("Primary Formlabs Account");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editClientSecret, setEditClientSecret] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organizationId) {
      setError("No organization was found for this workspace.");
      return;
    }

    setCreating(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch("/api/internal-manufacturing/connector-profiles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          providerKey: "formlabs",
          displayName,
          clientId,
          clientSecret,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save credentials.");
      }

      setClientId("");
      setClientSecret("");
      setShowCreate(false);
      setInfo("Formlabs credentials saved.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save credentials.");
    } finally {
      setCreating(false);
    }
  }

  async function handleTest(profileId: string) {
    setTestingId(profileId);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${profileId}/test`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || "Failed to test credentials.",
        );
      }

      setInfo(payload.message || "Credential test completed.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test credentials.");
    } finally {
      setTestingId(null);
    }
  }

  function openEdit(profile: InternalConnectorCredentialProfile) {
    setEditingProfileId(profile.id);
    setEditDisplayName(profile.displayName);
    setEditClientId("");
    setEditClientSecret("");
    setError(null);
    setInfo(null);
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editingProfileId) return;

    setUpdating(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${editingProfileId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            displayName: editDisplayName,
            clientId: editClientId || null,
            clientSecret: editClientSecret || null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update credentials.");
      }

      setInfo("Saved credentials updated.");
      setEditingProfileId(null);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update credentials.");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Provider accounts
          </p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950">
            Formlabs credentials
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Save once per organization, then reuse across many printers. The
            secret stays encrypted and cannot be viewed again.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
        >
          {showCreate ? "Close" : "Add"}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-4 text-sm text-slate-600">
            No Formlabs credentials saved yet.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {profile.displayName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Client ID: {profile.clientIdPreview}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {profile.connectionCount} connected printer
                    {profile.connectionCount === 1 ? "" : "s"} · Last tested{" "}
                    {formatDateTime(profile.lastTestedAt)}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${getSyncBadgeClasses(
                    profile.lastTestStatus,
                  )}`}
                >
                  {profile.lastTestStatus || "untested"}
                </span>
              </div>

              {profile.lastTestError ? (
                <div className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {profile.lastTestError}
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(profile.id)}
                  disabled={testingId === profile.id}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {testingId === profile.id ? "Testing..." : "Test"}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(profile)}
                  className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                >
                  Replace
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {editingProfileId ? (
        <form
          onSubmit={handleUpdate}
          className="mt-5 space-y-4 rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-4"
        >
          <div className="text-sm font-semibold text-slate-950">
            Replace saved credentials
          </div>

          <Field label="Profile name">
            <input
              value={editDisplayName}
              onChange={(event) => setEditDisplayName(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <Field label="New client ID">
            <input
              value={editClientId}
              onChange={(event) => setEditClientId(event.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <Field label="New client secret">
            <input
              type="password"
              value={editClientSecret}
              onChange={(event) => setEditClientSecret(event.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={updating}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => setEditingProfileId(null)}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="mt-5 space-y-4 rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-4"
        >
          <div className="text-sm font-semibold text-slate-950">
            Add Formlabs credentials
          </div>

          <Field label="Profile name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <Field label="Formlabs client ID">
            <input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <Field label="Formlabs client secret">
            <input
              type="password"
              value={clientSecret}
              onChange={(event) => setClientSecret(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Saving..." : "Save Formlabs credentials"}
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {info}
        </div>
      ) : null}
    </div>
  );
}

function MachineActionPanel({
  resource,
  existingConnection,
  resources,
  formlabsProfiles,
  selectedResourceId,
  onSelectedResourceChange,
  onSaved,
  onDeleted,
}: {
  resource: InternalConnectorResource;
  existingConnection: InternalResourceConnection | null;
  resources: InternalConnectorResource[];
  formlabsProfiles: InternalConnectorCredentialProfile[];
  selectedResourceId: string | null;
  onSelectedResourceChange: (resourceId: string) => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [providerKey, setProviderKey] = useState<
    InternalResourceConnection["providerKey"]
  >(existingConnection?.providerKey ?? "formlabs");
  const [connectionMode, setConnectionMode] = useState<
    InternalResourceConnection["connectionMode"]
  >(existingConnection?.connectionMode ?? "oauth");
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? `${resource.name} Connector`,
  );
  const [vaultSecretName, setVaultSecretName] = useState(
    existingConnection?.vaultSecretName ?? "",
  );
  const [vaultSecretId, setVaultSecretId] = useState(
    existingConnection?.vaultSecretId ?? "",
  );
  const [credentialProfileId, setCredentialProfileId] = useState(
    existingConnection?.credentialProfileId ?? formlabsProfiles[0]?.id ?? "",
  );
  const [baseUrl, setBaseUrl] = useState(existingConnection?.baseUrl ?? "");
  const [externalResourceId, setExternalResourceId] = useState(
    existingConnection?.externalResourceId ?? "",
  );
  const [syncEnabled, setSyncEnabled] = useState(
    existingConnection?.syncEnabled ?? true,
  );
  const [metadataText, setMetadataText] = useState(
    JSON.stringify(existingConnection?.metadata ?? {}, null, 2),
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<
    FormlabsDiscoveredPrinter[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    setProviderKey(existingConnection?.providerKey ?? "formlabs");
    setConnectionMode(existingConnection?.connectionMode ?? "oauth");
    setDisplayName(existingConnection?.displayName ?? `${resource.name} Connector`);
    setVaultSecretName(existingConnection?.vaultSecretName ?? "");
    setVaultSecretId(existingConnection?.vaultSecretId ?? "");
    setCredentialProfileId(
      existingConnection?.credentialProfileId ?? formlabsProfiles[0]?.id ?? "",
    );
    setBaseUrl(existingConnection?.baseUrl ?? "");
    setExternalResourceId(existingConnection?.externalResourceId ?? "");
    setSyncEnabled(existingConnection?.syncEnabled ?? true);
    setMetadataText(JSON.stringify(existingConnection?.metadata ?? {}, null, 2));
    setDiscoveredPrinters([]);
    setError(null);
    setInfo(null);
  }, [existingConnection, formlabsProfiles, resource]);

  useEffect(() => {
    if (providerKey === "formlabs") {
      setConnectionMode("oauth");
      setBaseUrl(FORMLABS_BASE_URL);
      setMetadataText("{}");
    }
  }, [providerKey]);

  async function handleDiscoverPrinters() {
    if (!credentialProfileId) {
      setError("Select a saved Formlabs credential profile first.");
      return;
    }

    setDiscovering(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${credentialProfileId}/discover-printers`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || "Failed to discover printers.",
        );
      }

      const printers = Array.isArray(payload.printers) ? payload.printers : [];
      setDiscoveredPrinters(printers);
      setInfo(
        printers.length > 0
          ? `Loaded ${printers.length} printer(s).`
          : "Credentials are valid, but no printers were returned.",
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to discover printers.",
      );
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    try {
      let metadata: Record<string, unknown> = {};

      if (providerKey !== "formlabs") {
        try {
          metadata = metadataText.trim()
            ? (JSON.parse(metadataText) as Record<string, unknown>)
            : {};
        } catch {
          throw new Error("Metadata must be valid JSON.");
        }
      }

      if (
        providerKey === "formlabs" &&
        !credentialProfileId &&
        !vaultSecretName.trim()
      ) {
        throw new Error(
          "Select saved Formlabs credentials or supply a legacy fallback secret reference.",
        );
      }

      const url = existingConnection
        ? `/api/internal-manufacturing/resource-connections/${existingConnection.id}`
        : "/api/internal-manufacturing/resource-connections";

      const method = existingConnection ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resourceId: resource.id,
          providerKey,
          connectionMode: providerKey === "formlabs" ? "oauth" : connectionMode,
          displayName,
          vaultSecretName:
            providerKey === "formlabs" && credentialProfileId
              ? null
              : vaultSecretName || null,
          vaultSecretId:
            providerKey === "formlabs" && credentialProfileId
              ? null
              : vaultSecretId || null,
          credentialProfileId:
            providerKey === "formlabs" ? credentialProfileId || null : null,
          baseUrl: providerKey === "formlabs" ? FORMLABS_BASE_URL : baseUrl || null,
          externalResourceId: externalResourceId || null,
          syncEnabled,
          metadata,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save connector.");
      }

      setInfo(existingConnection ? "Connector updated." : "Connector created.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save connector.");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!existingConnection) {
      setError("Save the connector first before testing.");
      return;
    }

    setTesting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}/test`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || "Failed to test connector.",
        );
      }

      setInfo(payload.message || "Connector test finished.");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to test connector.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSync() {
    if (!existingConnection) {
      setError("Save the connector first before syncing.");
      return;
    }

    setSyncing(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}/sync`,
        {
          method: "POST",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload.error || payload.message || "Failed to sync connector.",
        );
      }

      setInfo(
        payload.status
          ? `Sync completed. Resource status set to ${payload.status}.`
          : "Sync completed.",
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sync connector.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleDelete() {
    if (!existingConnection) {
      setError("Connector does not exist yet.");
      return;
    }

    setDeleting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/resource-connections/${existingConnection.id}`,
        {
          method: "DELETE",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete connector.");
      }

      setInfo("Connector deleted.");
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete connector.");
    } finally {
      setDeleting(false);
    }
  }

  const isFormlabs = providerKey === "formlabs";

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Add / manage machine
        </p>
        <h3 className="mt-2 text-xl font-semibold text-slate-950">
          Connector details
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Select a resource, attach or update a machine connector, then test and
          sync it from this panel.
        </p>
      </div>

      <div className="mt-5 space-y-4">
        <Field label="Internal resource">
          <select
            value={selectedResourceId ?? ""}
            onChange={(event) => onSelectedResourceChange(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {resources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
          <div className="text-sm font-semibold text-slate-950">{resource.name}</div>
          <div className="mt-2 grid gap-1 text-xs text-slate-500">
            <div>Type: {formatLabel(resource.resourceType)}</div>
            <div>Domain: {formatLabel(resource.serviceDomain)}</div>
            <div>Location: {resource.locationLabel || "—"}</div>
            <div>Status: {formatLabel(resource.currentStatus)}</div>
          </div>
        </div>

        <Field label="Provider">
          <select
            value={providerKey}
            onChange={(event) =>
              setProviderKey(
                event.target.value as InternalResourceConnection["providerKey"],
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {providerOptions.map((value) => (
              <option key={value} value={value}>
                {maskProviderLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Connection mode">
            <select
              value={connectionMode}
              disabled={isFormlabs}
              onChange={(event) =>
                setConnectionMode(
                  event.target.value as InternalResourceConnection["connectionMode"],
                )
              }
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:bg-zinc-100"
            >
              {connectionModeOptions.map((value) => (
                <option key={value} value={value}>
                  {formatLabel(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Display name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>
        </div>

        <Field label={isFormlabs ? "Printer serial" : "External resource ID"}>
          <input
            value={externalResourceId}
            onChange={(event) => setExternalResourceId(event.target.value)}
            placeholder={
              isFormlabs ? "Formlabs printer serial" : "Remote machine/printer ID"
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        {isFormlabs ? (
          <div className="space-y-4 rounded-[22px] border border-zinc-200 bg-[#fafaf9] p-4">
            <div className="grid gap-4">
              <Field label="Saved Formlabs credentials">
                <select
                  value={credentialProfileId}
                  onChange={(event) => setCredentialProfileId(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                >
                  <option value="">Select credentials</option>
                  {formlabsProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName} · {profile.clientIdPreview}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Base URL">
                  <input
                    value={FORMLABS_BASE_URL}
                    disabled
                    className="w-full rounded-full border border-zinc-300 bg-zinc-100 px-4 py-3 text-sm text-slate-950 outline-none"
                  />
                </Field>

                <Field label="Legacy fallback secret name">
                  <input
                    value={vaultSecretName}
                    onChange={(event) => setVaultSecretName(event.target.value)}
                    placeholder="Only for legacy fallback"
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <input
                  id={`sync-enabled-${resource.id}`}
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(event) => setSyncEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <label
                  htmlFor={`sync-enabled-${resource.id}`}
                  className="text-sm text-slate-700"
                >
                  Sync enabled
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleDiscoverPrinters}
                  disabled={discovering || !credentialProfileId}
                  className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
                >
                  {discovering ? "Loading printers..." : "Discover printers"}
                </button>
              </div>

              {discoveredPrinters.length > 0 ? (
                <div className="grid gap-3">
                  {discoveredPrinters.map((printer) => {
                    const isSelected = externalResourceId === printer.serial;

                    return (
                      <button
                        key={printer.serial}
                        type="button"
                        onClick={() => {
                          setExternalResourceId(printer.serial);

                          if (
                            !displayName ||
                            displayName === `${resource.name} Connector`
                          ) {
                            setDisplayName(
                              printer.alias
                                ? `${resource.name} · ${printer.alias}`
                                : `${resource.name} · ${printer.serial}`,
                            );
                          }
                        }}
                        className={`rounded-[18px] border p-4 text-left transition ${
                          isSelected
                            ? "border-slate-950 bg-slate-950 text-white"
                            : "border-zinc-200 bg-white text-slate-900 hover:bg-zinc-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-sm font-semibold">
                              {printer.alias || printer.serial}
                            </div>
                            <div
                              className={`mt-1 text-xs ${
                                isSelected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {printer.serial} ·{" "}
                              {printer.machineTypeId || "Unknown model"}
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              isSelected
                                ? "bg-white/15 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {formatLabel(printer.mappedStatus)}
                          </span>
                        </div>

                        <div
                          className={`mt-3 grid gap-1 text-xs ${
                            isSelected ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          <div>Provider status: {printer.rawStatus || "—"}</div>
                          <div>Group: {printer.groupName || "—"}</div>
                          <div>Material: {printer.currentPrintMaterial || "—"}</div>
                          <div>Current job: {printer.currentPrintName || "—"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Vault secret name">
                <input
                  value={vaultSecretName}
                  onChange={(event) => setVaultSecretName(event.target.value)}
                  placeholder="Secret reference name"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Vault secret ID">
                <input
                  value={vaultSecretId}
                  onChange={(event) => setVaultSecretId(event.target.value)}
                  placeholder="Secret reference ID"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="Local agent or API base URL"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <div className="flex items-center gap-3">
                <input
                  id={`sync-enabled-${resource.id}`}
                  type="checkbox"
                  checked={syncEnabled}
                  onChange={(event) => setSyncEnabled(event.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                <label
                  htmlFor={`sync-enabled-${resource.id}`}
                  className="text-sm text-slate-700"
                >
                  Sync enabled
                </label>
              </div>
            </div>

            <Field label="Metadata JSON">
              <textarea
                value={metadataText}
                onChange={(event) => setMetadataText(event.target.value)}
                rows={6}
                className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none"
                placeholder={`{\n  "workspaceId": "",\n  "siteId": ""\n}`}
              />
            </Field>
          </>
        )}

        {error ? (
          <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {info}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {saving
              ? "Saving..."
              : existingConnection
                ? "Save connector"
                : "Create connector"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !existingConnection}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test connection"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !existingConnection}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync now"}
          </button>

          {existingConnection ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete connector"}
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
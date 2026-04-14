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
  InternalConnectorProviderKey,
  InternalConnectorResource,
  InternalResourceConnection,
  InternalResourceConnectionsData,
  InternalResourceStatus,
  MarkforgedDiscoveredPrinter,
  UltimakerDiscoveredPrinter,
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
  currentStatus: InternalResourceStatus;
  currentJobName: string | null;
  currentJobStatus: string | null;
  currentMaterial: string | null;
  remainingTimeMs: number | null;
  rawVendorStatus: string | null;
  machineTypeLabel: string | null;
  externalMachineLabel: string | null;
};

type DiscoveredMachine =
  | {
      providerKey: "formlabs";
      item: FormlabsDiscoveredPrinter;
    }
  | {
      providerKey: "ultimaker";
      item: UltimakerDiscoveredPrinter;
    }
  | {
      providerKey: "markforged";
      item: MarkforgedDiscoveredPrinter;
    };

const providerOptions: InternalConnectorProviderKey[] = [
  "formlabs",
  "ultimaker",
  "markforged",
  "stratasys",
  "hp",
  "mtconnect",
  "opc_ua",
  "manual",
  "other",
];

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

function formatProviderLabel(value: string) {
  if (value === "mtconnect") return "MTConnect";
  if (value === "opc_ua") return "OPC UA";
  return formatLabel(value);
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
  status: InternalResourceConnection["lastSyncStatus"] | null,
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

function getProfileBadgeClasses(
  status: InternalConnectorCredentialProfile["lastTestStatus"],
) {
  switch (status) {
    case "ok":
      return "bg-emerald-100 text-emerald-700";
    case "error":
      return "bg-rose-100 text-rose-700";
    case "pending":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusBadgeClasses(status: InternalResourceStatus) {
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
  const metadataCandidates = [
    readString(resource.metadata?.technology),
    readString(resource.metadata?.technologyLabel),
    readString(resource.metadata?.processTechnology),
    readString(resource.metadata?.manufacturingTechnology),
    readString(connection?.metadata?.technology),
    readString(connection?.metadata?.technologyLabel),
    readString(connection?.metadata?.processTechnology),
  ].filter(Boolean) as string[];

  if (metadataCandidates.length > 0) {
    return metadataCandidates[0];
  }

  const latestPayload = resource.latestStatusEvent?.payload;

  const machineTypeId =
    readString(readPath(latestPayload, ["printer", "machineTypeId"])) ??
    readString(connection?.metadata?.machineTypeId) ??
    readString(connection?.metadata?.printerType) ??
    readString(connection?.metadata?.model);

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

  if (normalizedMachineType.includes("ultimaker")) {
    return "FDM";
  }

  if (
    normalizedMachineType.includes("markforged") ||
    normalizedMachineType.includes("fx10") ||
    normalizedMachineType.includes("x7") ||
    normalizedMachineType.includes("x3") ||
    normalizedMachineType.includes("mark two")
  ) {
    return "Composite / FFF";
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
    providerLabel: formatProviderLabel(providerKey),
    location: resource.locationLabel || "Unassigned",
    currentStatus: resource.currentStatus,
    currentJobName:
      readString(
        readPath(payload, ["printer", "printerStatus", "currentPrintRun", "name"]),
      ) ??
      readString(readPath(payload, ["printer", "currentJobName"])) ??
      readString(readPath(payload, ["printer", "jobName"])),
    currentJobStatus:
      readString(
        readPath(payload, ["printer", "printerStatus", "currentPrintRun", "status"]),
      ) ??
      readString(readPath(payload, ["printer", "currentJobStatus"])) ??
      readString(readPath(payload, ["printer", "jobStatus"])),
    currentMaterial:
      readString(
        readPath(payload, ["printer", "printerStatus", "currentPrintRun", "material"]),
      ) ??
      readString(readPath(payload, ["printer", "previousPrintRun", "material"])) ??
      readString(readPath(payload, ["printer", "material"])),
    remainingTimeMs:
      readNumber(
        readPath(payload, [
          "printer",
          "printerStatus",
          "currentPrintRun",
          "estimatedTimeRemainingMs",
        ]),
      ) ??
      readNumber(readPath(payload, ["printer", "remainingTimeMs"])),
    rawVendorStatus:
      readString(payload.raw_status) ??
      readString(readPath(payload, ["printer", "rawStatus"])),
    machineTypeLabel:
      readString(readPath(payload, ["printer", "machineTypeId"])) ??
      readString(readPath(payload, ["printer", "printerType"])) ??
      readString(readPath(payload, ["printer", "model"])),
    externalMachineLabel:
      connection?.externalResourceId ??
      readString(readPath(payload, ["printer", "serial"])) ??
      readString(readPath(payload, ["printer", "id"])),
  };
}

function getInitials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return initials.join("") || "MC";
}

function sortByLabel(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

function getProviderDefaultConnectionMode(
  providerKey: InternalConnectorProviderKey,
): InternalResourceConnection["connectionMode"] {
  if (providerKey === "formlabs" || providerKey === "ultimaker") {
    return "oauth";
  }

  if (providerKey === "markforged") {
    return "api_key";
  }

  if (providerKey === "manual") {
    return "manual";
  }

  return "api_key";
}

function getProfileDisplaySecondary(profile: InternalConnectorCredentialProfile) {
  if (profile.providerKey === "ultimaker") {
    if (profile.tokenExpiresAt) {
      return `Token expires ${formatDateTime(profile.tokenExpiresAt)}`;
    }

    return profile.authMode ? `Auth: ${formatLabel(profile.authMode)}` : "Token auth";
  }

  return profile.clientIdPreview || "Stored credentials";
}

function getDiscoveredMachineId(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.serial;
  }

  if (machine.providerKey === "ultimaker") {
    return machine.item.id;
  }

  return machine.item.id;
}

function getDiscoveredMachineDisplayName(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.alias || machine.item.serial;
  }

  if (machine.providerKey === "ultimaker") {
    return machine.item.name;
  }

  return machine.item.name;
}

function getDiscoveredMachineSubtitle(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return `${machine.item.serial} · ${machine.item.machineTypeId || "Unknown model"}`;
  }

  if (machine.providerKey === "ultimaker") {
    return `${machine.item.id} · ${machine.item.printerType || "Ultimaker cluster"}`;
  }

  return `${machine.item.serial || machine.item.id} · ${machine.item.model || "Markforged device"}`;
}

function getDiscoveredMachineStatus(machine: DiscoveredMachine) {
  return machine.item.mappedStatus;
}

function getDiscoveredMachineMetaLines(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return [
      `Provider status: ${machine.item.rawStatus || "—"}`,
      `Group: ${machine.item.groupName || "—"}`,
      `Material: ${machine.item.currentPrintMaterial || "—"}`,
      `Current job: ${machine.item.currentPrintName || "—"}`,
    ];
  }

  if (machine.providerKey === "ultimaker") {
    return [
      `Cluster: ${machine.item.clusterName || machine.item.clusterId}`,
      `Technology: ${machine.item.technology || "—"}`,
      `Material: ${machine.item.material || "—"}`,
      `Provider status: ${machine.item.rawStatus || "—"}`,
    ];
  }

  return [
    `Serial: ${machine.item.serial || "—"}`,
    `Technology: ${machine.item.technology || "—"}`,
    `Location: ${machine.item.locationName || "—"}`,
    `Current job: ${machine.item.currentJobName || "—"}`,
  ];
}

function getDiscoveredMachineExternalId(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.serial;
  }

  if (machine.providerKey === "ultimaker") {
    return machine.item.id;
  }

  return machine.item.id;
}

function getDiscoveredMachineTechnology(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    const machineType = (machine.item.machineTypeId || "").toLowerCase();

    if (
      machineType.includes("form-2") ||
      machineType.includes("form-3") ||
      machineType.includes("form-4")
    ) {
      return "SLA";
    }

    if (machineType.includes("fuse")) {
      return "SLS";
    }

    return "Additive";
  }

  if (machine.providerKey === "ultimaker") {
    return machine.item.technology || "FDM";
  }

  return machine.item.technology || "Composite / FFF";
}

function getDiscoveredMachineModel(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.machineTypeId;
  }

  if (machine.providerKey === "ultimaker") {
    return machine.item.printerType;
  }

  return machine.item.model;
}

function getDefaultOrganizationId(
  data: InternalResourceConnectionsData,
  selectedResourceId: string | null,
) {
  const selectedResource =
    data.resources.find((resource) => resource.id === selectedResourceId) ?? null;

  return (
    selectedResource?.organizationId ??
    data.resources[0]?.organizationId ??
    data.credentialProfiles[0]?.organizationId ??
    null
  );
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
    <div className="space-y-6">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Internal connectors
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Machine integrations
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Manage connected machines, reuse vendor accounts across many resources,
              and monitor live fleet status from one workspace.
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
          <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 p-4">
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

      <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1.65fr)_320px]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
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
                    className={`flex w-full items-center justify-between rounded-[16px] px-4 py-3 text-left text-sm transition ${
                      activeCategory === category
                        ? "bg-slate-950 text-white"
                        : "bg-[#fafaf9] text-slate-900 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{category}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] ${
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

          <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
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

          <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
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

        <section className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Connected" value={connectedCount} />
            <StatCard label="Running" value={runningCount} />
            <StatCard label="Idle" value={idleCount} />
            <StatCard label="Attention" value={attentionCount} />
          </div>

          <div className="rounded-[30px] border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-slate-950">
                  Fleet workspace
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Browse your imported machines, filter by process and geography,
                  then drill into connector health on the right.
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

            <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))]">
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

              <Field label="Segment">
                <div className="rounded-full border border-zinc-200 bg-[#fafaf9] px-4 py-3 text-sm text-slate-700">
                  {activeCategory}
                </div>
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
              <div className="mt-5 rounded-[22px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
                No machines match the current filters.
              </div>
            ) : viewMode === "grid" ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
                {filteredMachines.map((machine) => {
                  const selected = selectedResourceId === machine.resource.id;

                  return (
                    <button
                      key={machine.resource.id}
                      type="button"
                      onClick={() => setSelectedResourceId(machine.resource.id)}
                      className={`rounded-[22px] border p-4 text-left transition ${
                        selected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-zinc-200 bg-[#fafaf9] text-slate-950 hover:border-zinc-300 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${
                              selected
                                ? "bg-white/10 text-white"
                                : "bg-white text-slate-900"
                            }`}
                          >
                            {getInitials(
                              machine.connection?.displayName ?? machine.resource.name,
                            )}
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
                              ? "bg-white/15 text-white"
                              : getStatusBadgeClasses(machine.currentStatus)
                          }`}
                        >
                          {formatLabel(machine.currentStatus)}
                        </span>
                      </div>

                      <div
                        className={`mt-3 grid gap-1 text-xs ${
                          selected ? "text-slate-200" : "text-slate-600"
                        }`}
                      >
                        <div>Internal resource: {machine.resource.name}</div>
                        <div>Location: {machine.location}</div>
                        <div>External ID: {machine.externalMachineLabel ?? "—"}</div>
                        <div>Job: {machine.currentJobName ?? "—"}</div>
                        <div>Material: {machine.currentMaterial ?? "—"}</div>
                        <div>Remaining: {formatDurationMs(machine.remainingTimeMs)}</div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                            selected
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
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                              selected
                                ? "bg-white/10 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            Vendor: {machine.rawVendorStatus}
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-500">
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
                    {filteredMachines.map((machine) => {
                      const selected = selectedResourceId === machine.resource.id;

                      return (
                        <tr
                          key={machine.resource.id}
                          onClick={() => setSelectedResourceId(machine.resource.id)}
                          className={`cursor-pointer ${
                            selected
                              ? "bg-slate-950 text-white"
                              : "bg-[#fafaf9] text-slate-900"
                          }`}
                        >
                          <td className="rounded-l-[18px] px-4 py-4">
                            <div className="font-semibold">
                              {machine.connection?.displayName ?? machine.resource.name}
                            </div>
                            <div
                              className={`mt-1 text-xs ${
                                selected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {machine.resource.name}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm">{machine.providerLabel}</td>
                          <td className="px-4 py-4 text-sm">{machine.technology}</td>
                          <td className="px-4 py-4 text-sm">{machine.location}</td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                                selected
                                  ? "bg-white/15 text-white"
                                  : getStatusBadgeClasses(machine.currentStatus)
                              }`}
                            >
                              {formatLabel(machine.currentStatus)}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {machine.currentJobName ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {machine.currentMaterial ?? "—"}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {formatDurationMs(machine.remainingTimeMs)}
                          </td>
                          <td className="rounded-r-[18px] px-4 py-4 text-sm">
                            {formatDateTime(machine.connection?.lastSyncAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {data.canManageConnectors ? (
            <>
              <MachineActionPanel
                resource={selectedMachine?.resource ?? null}
                existingConnection={selectedMachine?.connection ?? null}
                resources={data.resources}
                credentialProfiles={data.credentialProfiles}
                selectedResourceId={selectedResourceId}
                onSelectedResourceChange={setSelectedResourceId}
                defaultOrganizationId={getDefaultOrganizationId(data, selectedResourceId)}
                onSaved={() => router.refresh()}
                onDeleted={() => router.refresh()}
              />

              <CredentialProfilesPanel
                organizationId={getDefaultOrganizationId(data, selectedResourceId)}
                profiles={data.credentialProfiles}
                onSaved={() => router.refresh()}
              />
            </>
          ) : (
            <div className="rounded-[26px] border border-zinc-200 bg-white p-6 shadow-sm">
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
    <div className="rounded-[22px] border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
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

function CredentialProfilesPanel({
  organizationId,
  profiles,
  onSaved,
}: {
  organizationId: string | null;
  profiles: InternalConnectorCredentialProfile[];
  onSaved: () => void;
}) {
  const [providerKey, setProviderKey] =
    useState<InternalConnectorProviderKey>("formlabs");
  const [displayName, setDisplayName] = useState("Primary Formlabs Account");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProviderKey, setEditProviderKey] =
    useState<InternalConnectorProviderKey>("formlabs");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editClientSecret, setEditClientSecret] = useState("");
  const [editAccessToken, setEditAccessToken] = useState("");
  const [editRefreshToken, setEditRefreshToken] = useState("");
  const [editTokenExpiresAt, setEditTokenExpiresAt] = useState("");
  const [updating, setUpdating] = useState(false);
  const [showCreate, setShowCreate] = useState(profiles.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (providerKey === "formlabs") {
      setDisplayName("Primary Formlabs Account");
    } else if (providerKey === "ultimaker") {
      setDisplayName("Primary Ultimaker Account");
    } else if (providerKey === "markforged") {
      setDisplayName("Primary Markforged Account");
    }
  }, [providerKey]);

  function buildCreateBody() {
    return {
      organizationId,
      providerKey,
      displayName,
      authMode:
        providerKey === "ultimaker"
          ? "oauth"
          : providerKey === "markforged"
            ? "api_key"
            : "oauth",
      clientId:
        providerKey === "formlabs" || providerKey === "markforged"
          ? clientId
          : null,
      clientSecret:
        providerKey === "formlabs" || providerKey === "markforged"
          ? clientSecret
          : null,
      accessToken: providerKey === "ultimaker" ? accessToken : null,
      refreshToken: providerKey === "ultimaker" ? refreshToken || null : null,
      tokenExpiresAt: providerKey === "ultimaker" ? tokenExpiresAt || null : null,
    };
  }

  function buildUpdateBody() {
    return {
      displayName: editDisplayName,
      providerKey: editProviderKey,
      authMode:
        editProviderKey === "ultimaker"
          ? "oauth"
          : editProviderKey === "markforged"
            ? "api_key"
            : "oauth",
      clientId:
        editProviderKey === "formlabs" || editProviderKey === "markforged"
          ? editClientId || null
          : null,
      clientSecret:
        editProviderKey === "formlabs" || editProviderKey === "markforged"
          ? editClientSecret || null
          : null,
      accessToken: editProviderKey === "ultimaker" ? editAccessToken || null : null,
      refreshToken:
        editProviderKey === "ultimaker" ? editRefreshToken || null : null,
      tokenExpiresAt:
        editProviderKey === "ultimaker" ? editTokenExpiresAt || null : null,
    };
  }

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
        body: JSON.stringify(buildCreateBody()),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to save credentials.");
      }

      setClientId("");
      setClientSecret("");
      setAccessToken("");
      setRefreshToken("");
      setTokenExpiresAt("");
      setShowCreate(false);
      setInfo(`${formatProviderLabel(providerKey)} credentials saved.`);
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
    setEditProviderKey(profile.providerKey);
    setEditDisplayName(profile.displayName);
    setEditClientId("");
    setEditClientSecret("");
    setEditAccessToken("");
    setEditRefreshToken("");
    setEditTokenExpiresAt(profile.tokenExpiresAt ?? "");
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
          body: JSON.stringify(buildUpdateBody()),
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
    <div className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            Provider accounts
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-950">
            Saved credentials
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Reuse one provider account across many connected machines.
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

      <div className="mt-4 space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-zinc-300 bg-[#fafaf9] p-4 text-sm text-slate-600">
            No provider accounts saved yet.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-[18px] border border-zinc-200 bg-[#fafaf9] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {profile.displayName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatProviderLabel(profile.providerKey)} ·{" "}
                    {getProfileDisplaySecondary(profile)}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {profile.connectionCount} connected machine
                    {profile.connectionCount === 1 ? "" : "s"} · Last tested{" "}
                    {formatDateTime(profile.lastTestedAt)}
                  </div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-medium ${getProfileBadgeClasses(
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

              <div className="mt-3 flex flex-wrap gap-2">
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
          className="mt-4 space-y-4 rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
        >
          <div className="text-sm font-semibold text-slate-950">
            Replace saved credentials
          </div>

          <Field label="Provider">
            <div className="rounded-full border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700">
              {formatProviderLabel(editProviderKey)}
            </div>
          </Field>

          <Field label="Profile name">
            <input
              value={editDisplayName}
              onChange={(event) => setEditDisplayName(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          {editProviderKey === "ultimaker" ? (
            <>
              <Field label="New access token">
                <input
                  type="password"
                  value={editAccessToken}
                  onChange={(event) => setEditAccessToken(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="New refresh token">
                <input
                  type="password"
                  value={editRefreshToken}
                  onChange={(event) => setEditRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={editTokenExpiresAt}
                  onChange={(event) => setEditTokenExpiresAt(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label={
                  editProviderKey === "markforged"
                    ? "New API access key"
                    : "New client ID"
                }
              >
                <input
                  value={editClientId}
                  onChange={(event) => setEditClientId(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field
                label={
                  editProviderKey === "markforged"
                    ? "New API secret key"
                    : "New client secret"
                }
              >
                <input
                  type="password"
                  value={editClientSecret}
                  onChange={(event) => setEditClientSecret(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>
            </>
          )}

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
          className="mt-4 space-y-4 rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
        >
          <div className="text-sm font-semibold text-slate-950">
            Add provider account
          </div>

          <Field label="Provider">
            <select
              value={providerKey}
              onChange={(event) =>
                setProviderKey(event.target.value as InternalConnectorProviderKey)
              }
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            >
              {(["formlabs", "ultimaker", "markforged"] as const).map((value) => (
                <option key={value} value={value}>
                  {formatProviderLabel(value)}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Profile name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </Field>

          {providerKey === "ultimaker" ? (
            <>
              <Field label="Access token">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Refresh token">
                <input
                  type="password"
                  value={refreshToken}
                  onChange={(event) => setRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={tokenExpiresAt}
                  onChange={(event) => setTokenExpiresAt(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>
            </>
          ) : (
            <>
              <Field
                label={
                  providerKey === "markforged" ? "API access key" : "Client ID"
                }
              >
                <input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>

              <Field
                label={
                  providerKey === "markforged" ? "API secret key" : "Client secret"
                }
              >
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
          >
            {creating ? "Saving..." : `Save ${formatProviderLabel(providerKey)} credentials`}
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
  credentialProfiles,
  selectedResourceId,
  onSelectedResourceChange,
  defaultOrganizationId,
  onSaved,
  onDeleted,
}: {
  resource: InternalConnectorResource | null;
  existingConnection: InternalResourceConnection | null;
  resources: InternalConnectorResource[];
  credentialProfiles: InternalConnectorCredentialProfile[];
  selectedResourceId: string | null;
  onSelectedResourceChange: (resourceId: string) => void;
  defaultOrganizationId: string | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [providerKey, setProviderKey] =
    useState<InternalConnectorProviderKey>(existingConnection?.providerKey ?? "formlabs");
  const [connectionMode, setConnectionMode] = useState<
    InternalResourceConnection["connectionMode"]
  >(existingConnection?.connectionMode ?? "oauth");
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`,
  );
  const [vaultSecretName, setVaultSecretName] = useState(
    existingConnection?.vaultSecretName ?? "",
  );
  const [vaultSecretId, setVaultSecretId] = useState(
    existingConnection?.vaultSecretId ?? "",
  );
  const [credentialProfileId, setCredentialProfileId] = useState(
    existingConnection?.credentialProfileId ??
      credentialProfiles.find((profile) => profile.providerKey === providerKey)?.id ??
      "",
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
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const scopedProfiles = useMemo(
    () =>
      credentialProfiles.filter((profile) => profile.providerKey === providerKey),
    [credentialProfiles, providerKey],
  );

  useEffect(() => {
    setProviderKey(existingConnection?.providerKey ?? "formlabs");
    setConnectionMode(
      existingConnection?.connectionMode ??
        getProviderDefaultConnectionMode(existingConnection?.providerKey ?? "formlabs"),
    );
    setDisplayName(
      existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`,
    );
    setVaultSecretName(existingConnection?.vaultSecretName ?? "");
    setVaultSecretId(existingConnection?.vaultSecretId ?? "");
    setCredentialProfileId(
      existingConnection?.credentialProfileId ??
        credentialProfiles.find(
          (profile) => profile.providerKey === (existingConnection?.providerKey ?? "formlabs"),
        )?.id ??
        "",
    );
    setBaseUrl(existingConnection?.baseUrl ?? "");
    setExternalResourceId(existingConnection?.externalResourceId ?? "");
    setSyncEnabled(existingConnection?.syncEnabled ?? true);
    setMetadataText(JSON.stringify(existingConnection?.metadata ?? {}, null, 2));
    setDiscoveredMachines([]);
    setError(null);
    setInfo(null);
  }, [credentialProfiles, existingConnection, resource]);

  useEffect(() => {
    const defaultMode = getProviderDefaultConnectionMode(providerKey);
    setConnectionMode(defaultMode);

    if (providerKey === "formlabs") {
      setBaseUrl(FORMLABS_BASE_URL);
    }

    if (providerKey === "formlabs" || providerKey === "ultimaker" || providerKey === "markforged") {
      setMetadataText("{}");
    }

    setCredentialProfileId((current) => {
      if (
        current &&
        credentialProfiles.some(
          (profile) => profile.id === current && profile.providerKey === providerKey,
        )
      ) {
        return current;
      }

      return (
        credentialProfiles.find((profile) => profile.providerKey === providerKey)?.id ??
        ""
      );
    });

    setDiscoveredMachines([]);
  }, [credentialProfiles, providerKey]);

  async function handleDiscoverMachines() {
    if (!credentialProfileId) {
      setError(`Select a saved ${formatProviderLabel(providerKey)} credential profile first.`);
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
          payload.error || payload.message || "Failed to discover machines.",
        );
      }

      const rawItems: unknown[] = Array.isArray(payload.printers)
        ? payload.printers
        : [];

      const normalized: DiscoveredMachine[] =
        providerKey === "ultimaker"
          ? rawItems.map((item: unknown) => ({
              providerKey: "ultimaker" as const,
              item: item as UltimakerDiscoveredPrinter,
            }))
          : providerKey === "markforged"
            ? rawItems.map((item: unknown) => ({
                providerKey: "markforged" as const,
                item: item as MarkforgedDiscoveredPrinter,
              }))
            : rawItems.map((item: unknown) => ({
                providerKey: "formlabs" as const,
                item: item as FormlabsDiscoveredPrinter,
              }));

      setDiscoveredMachines(normalized);
      setInfo(
        normalized.length > 0
          ? `Loaded ${normalized.length} machine(s).`
          : "Credentials are valid, but no machines were returned.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to discover machines.");
    } finally {
      setDiscovering(false);
    }
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setInfo(null);

    if (!resource) {
      setSaving(false);
      setError("Select a machine first.");
      return;
    }

    try {
      let metadata: Record<string, unknown> = {};

      try {
        metadata = metadataText.trim()
          ? (JSON.parse(metadataText) as Record<string, unknown>)
          : {};
      } catch {
        throw new Error("Metadata must be valid JSON.");
      }

      const url = existingConnection
        ? `/api/internal-manufacturing/resource-connections/${existingConnection.id}`
        : "/api/internal-manufacturing/resource-connections";

      const method = existingConnection ? "PATCH" : "POST";

      const body = {
        resourceId: resource.id,
        providerKey,
        connectionMode,
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
          providerKey === "formlabs" ||
          providerKey === "ultimaker" ||
          providerKey === "markforged"
            ? credentialProfileId || null
            : null,
        baseUrl: baseUrl || null,
        externalResourceId: externalResourceId || null,
        syncEnabled,
        metadata,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
  const isUltimaker = providerKey === "ultimaker";
  const isMarkforged = providerKey === "markforged";
  const isVendorProvider = isFormlabs || isUltimaker || isMarkforged;

  return (
    <form
      onSubmit={handleSave}
      className="rounded-[26px] border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
          Machine connector
        </p>
        <h3 className="mt-2 text-lg font-semibold text-slate-950">
          Selected machine
        </h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Keep the page layout fixed and switch only the connector fields for the
          chosen provider.
        </p>
      </div>

      <div className="mt-4 space-y-4">
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

        {resource ? (
          <div className="rounded-[18px] border border-zinc-200 bg-[#fafaf9] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  {resource.name}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatLabel(resource.resourceType)} · {formatLabel(resource.serviceDomain)}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${getStatusBadgeClasses(
                  resource.currentStatus,
                )}`}
              >
                {formatLabel(resource.currentStatus)}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              <div>Location: {resource.locationLabel || "—"}</div>
              <div>Timezone: {resource.timezone || "—"}</div>
              <div>Status source: {formatLabel(resource.statusSource)}</div>
              <div>
                Latest update: {formatDateTime(resource.latestStatusEvent?.effectiveAt)}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-[18px] border border-dashed border-zinc-300 bg-[#fafaf9] p-4 text-sm text-slate-600">
            Select a machine to manage its connector.
          </div>
        )}

        <Field label="Provider">
          <select
            value={providerKey}
            onChange={(event) =>
              setProviderKey(event.target.value as InternalConnectorProviderKey)
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {providerOptions.map((value) => (
              <option key={value} value={value}>
                {formatProviderLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Connection mode">
            <select
              value={connectionMode}
              disabled={isVendorProvider}
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

        <Field
          label={
            isFormlabs
              ? "Printer serial"
              : isUltimaker
                ? "Cluster or printer ID"
                : isMarkforged
                  ? "Device ID"
                  : "External resource ID"
          }
        >
          <input
            value={externalResourceId}
            onChange={(event) => setExternalResourceId(event.target.value)}
            placeholder={
              isFormlabs
                ? "Formlabs printer serial"
                : isUltimaker
                  ? "Ultimaker cluster/printer ID"
                  : isMarkforged
                    ? "Markforged device ID"
                    : "Remote machine/printer ID"
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </Field>

        {isVendorProvider ? (
          <div className="space-y-4 rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
            <Field
              label={`${formatProviderLabel(providerKey)} credentials`}
            >
              <select
                value={credentialProfileId}
                onChange={(event) => setCredentialProfileId(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="">Select credentials</option>
                {scopedProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.displayName}
                  </option>
                ))}
              </select>
            </Field>

            {isFormlabs ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Base URL">
                  <input
                    value={baseUrl || FORMLABS_BASE_URL}
                    onChange={(event) => setBaseUrl(event.target.value)}
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                  />
                </Field>

                <Field label="Legacy fallback secret name">
                  <input
                    value={vaultSecretName}
                    onChange={(event) => setVaultSecretName(event.target.value)}
                    placeholder="Optional legacy fallback"
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                  />
                </Field>
              </div>
            ) : (
              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder={
                    isUltimaker
                      ? "Optional override"
                      : isMarkforged
                        ? "Optional override"
                        : "Optional override"
                  }
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </Field>
            )}

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(event) => setSyncEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Sync enabled
            </label>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleDiscoverMachines}
                disabled={discovering || !credentialProfileId}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
              >
                {discovering ? "Loading..." : `Discover ${formatProviderLabel(providerKey)} machines`}
              </button>
            </div>

            {discoveredMachines.length > 0 ? (
              <div className="grid gap-3">
                {discoveredMachines.map((machine) => {
                  const discoveredId = getDiscoveredMachineId(machine);
                  const isSelected = externalResourceId === discoveredId;

                  return (
                    <button
                      key={discoveredId}
                      type="button"
                      onClick={() => {
                        setExternalResourceId(getDiscoveredMachineExternalId(machine));

                        const currentDefaultLabel =
                          resource?.name ? `${resource.name} Connector` : "Machine Connector";

                        if (!displayName || displayName === currentDefaultLabel) {
                          setDisplayName(
                            resource?.name
                              ? `${resource.name} · ${getDiscoveredMachineDisplayName(machine)}`
                              : getDiscoveredMachineDisplayName(machine),
                          );
                        }

                        const nextMetadata = {
                          technology: getDiscoveredMachineTechnology(machine),
                          machineTypeId: getDiscoveredMachineModel(machine),
                          discoveredFrom: providerKey,
                        };

                        setMetadataText(JSON.stringify(nextMetadata, null, 2));
                      }}
                      className={`rounded-[16px] border p-4 text-left transition ${
                        isSelected
                          ? "border-slate-950 bg-slate-950 text-white"
                          : "border-zinc-200 bg-white text-slate-900 hover:bg-zinc-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {getDiscoveredMachineDisplayName(machine)}
                          </div>
                          <div
                            className={`mt-1 text-xs ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            {getDiscoveredMachineSubtitle(machine)}
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                            isSelected
                              ? "bg-white/15 text-white"
                              : getStatusBadgeClasses(getDiscoveredMachineStatus(machine))
                          }`}
                        >
                          {formatLabel(getDiscoveredMachineStatus(machine))}
                        </span>
                      </div>

                      <div
                        className={`mt-3 grid gap-1 text-xs ${
                          isSelected ? "text-slate-200" : "text-slate-500"
                        }`}
                      >
                        {getDiscoveredMachineMetaLines(machine).map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : null}
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
            </div>

            <Field label="Base URL">
              <input
                value={baseUrl}
                onChange={(event) => setBaseUrl(event.target.value)}
                placeholder="Local agent or API base URL"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </Field>

            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(event) => setSyncEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              Sync enabled
            </label>
          </>
        )}

        <Field label="Metadata JSON">
          <textarea
            value={metadataText}
            onChange={(event) => setMetadataText(event.target.value)}
            rows={5}
            className="w-full rounded-[18px] border border-zinc-300 bg-white px-4 py-3 font-mono text-sm text-slate-950 outline-none"
            placeholder={`{\n  "technology": "",\n  "machineTypeId": ""\n}`}
          />
        </Field>

        {defaultOrganizationId ? null : (
          <div className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No customer organization context was found for creating new connectors.
          </div>
        )}

        {error ? (
          <div className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {info}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || !resource}
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
            {testing ? "Testing..." : "Test"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !existingConnection}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          {existingConnection ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {existingConnection ? (
          <div className="rounded-[18px] border border-zinc-200 bg-[#fafaf9] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">
                  Connection health
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatProviderLabel(existingConnection.providerKey)} ·{" "}
                  {formatLabel(existingConnection.connectionMode)}
                </div>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-[11px] font-medium ${getSyncBadgeClasses(
                  existingConnection.lastSyncStatus,
                )}`}
              >
                {existingConnection.lastSyncStatus || "unknown"}
              </span>
            </div>

            <div className="mt-3 grid gap-1 text-xs text-slate-500">
              <div>Last sync: {formatDateTime(existingConnection.lastSyncAt)}</div>
              <div>
                External ID: {existingConnection.externalResourceId || "—"}
              </div>
              <div>
                Sync enabled: {existingConnection.syncEnabled ? "Yes" : "No"}
              </div>
            </div>

            {existingConnection.lastError ? (
              <div className="mt-3 rounded-[14px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {existingConnection.lastError}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </form>
  );
}
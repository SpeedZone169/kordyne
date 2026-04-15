"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  StratasysDiscoveredPrinter,
  UltimakerDiscoveredPrinter,
} from "./types";
import type { InternalManufacturingCapability } from "../types";

type Props = {
  data: InternalResourceConnectionsData;
  capabilities?: InternalManufacturingCapability[];
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
  currentMaterial: string | null;
  rawVendorStatus: string | null;
  machineTypeLabel: string | null;
  externalMachineLabel: string | null;
  lastPingedAt: string | null;
};

type DiscoveredMachine =
  | { providerKey: "formlabs"; item: FormlabsDiscoveredPrinter }
  | { providerKey: "ultimaker"; item: UltimakerDiscoveredPrinter }
  | { providerKey: "markforged"; item: MarkforgedDiscoveredPrinter }
  | { providerKey: "stratasys"; item: StratasysDiscoveredPrinter };

type ProviderUiPreset = {
  providerKey: InternalConnectorProviderKey;
  label: string;
  connectionMode: InternalResourceConnection["connectionMode"];
  defaultBaseUrl: string;
  externalIdLabel: string;
  externalIdPlaceholder: string;
  credentialsLabel: string;
  discoveryButtonLabel: string;
  supportsDiscovery: boolean;
  requiresCredentialProfile: boolean;
  allowLegacyFallback: boolean;
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

const connectionModeOptions = ["api_key", "oauth", "agent_url", "manual"] as const;

const PROVIDER_PRESETS: Record<string, ProviderUiPreset> = {
  formlabs: {
    providerKey: "formlabs",
    label: "Formlabs",
    connectionMode: "oauth",
    defaultBaseUrl: "https://api.formlabs.com",
    externalIdLabel: "Printer serial",
    externalIdPlaceholder: "Formlabs printer serial",
    credentialsLabel: "Formlabs credentials",
    discoveryButtonLabel: "Discover Formlabs machines",
    supportsDiscovery: true,
    requiresCredentialProfile: true,
    allowLegacyFallback: true,
  },
  ultimaker: {
    providerKey: "ultimaker",
    label: "Ultimaker",
    connectionMode: "oauth",
    defaultBaseUrl: "",
    externalIdLabel: "Cluster or printer ID",
    externalIdPlaceholder: "Ultimaker cluster/printer ID",
    credentialsLabel: "Ultimaker credentials",
    discoveryButtonLabel: "Discover Ultimaker machines",
    supportsDiscovery: true,
    requiresCredentialProfile: true,
    allowLegacyFallback: false,
  },
  markforged: {
    providerKey: "markforged",
    label: "Markforged",
    connectionMode: "api_key",
    defaultBaseUrl: "",
    externalIdLabel: "Device ID",
    externalIdPlaceholder: "Markforged device ID",
    credentialsLabel: "Markforged credentials",
    discoveryButtonLabel: "Discover Markforged devices",
    supportsDiscovery: true,
    requiresCredentialProfile: true,
    allowLegacyFallback: false,
  },
  stratasys: {
    providerKey: "stratasys",
    label: "Stratasys",
    connectionMode: "api_key",
    defaultBaseUrl: "",
    externalIdLabel: "Machine ID",
    externalIdPlaceholder: "Stratasys machine ID",
    credentialsLabel: "Stratasys credentials",
    discoveryButtonLabel: "Discover Stratasys machines",
    supportsDiscovery: true,
    requiresCredentialProfile: true,
    allowLegacyFallback: false,
  },
  hp: {
    providerKey: "hp",
    label: "HP",
    connectionMode: "api_key",
    defaultBaseUrl: "",
    externalIdLabel: "Machine ID",
    externalIdPlaceholder: "HP machine ID",
    credentialsLabel: "HP credentials",
    discoveryButtonLabel: "Discover HP machines",
    supportsDiscovery: false,
    requiresCredentialProfile: true,
    allowLegacyFallback: false,
  },
  mtconnect: {
    providerKey: "mtconnect",
    label: "MTConnect",
    connectionMode: "agent_url",
    defaultBaseUrl: "",
    externalIdLabel: "External resource ID",
    externalIdPlaceholder: "Remote machine / asset ID",
    credentialsLabel: "MTConnect connection",
    discoveryButtonLabel: "Discover machines",
    supportsDiscovery: false,
    requiresCredentialProfile: false,
    allowLegacyFallback: false,
  },
  opc_ua: {
    providerKey: "opc_ua",
    label: "OPC UA",
    connectionMode: "agent_url",
    defaultBaseUrl: "",
    externalIdLabel: "External resource ID",
    externalIdPlaceholder: "Remote machine / node ID",
    credentialsLabel: "OPC UA connection",
    discoveryButtonLabel: "Discover machines",
    supportsDiscovery: false,
    requiresCredentialProfile: false,
    allowLegacyFallback: false,
  },
  manual: {
    providerKey: "manual",
    label: "Manual",
    connectionMode: "manual",
    defaultBaseUrl: "",
    externalIdLabel: "External resource ID",
    externalIdPlaceholder: "Optional remote identifier",
    credentialsLabel: "Manual connection",
    discoveryButtonLabel: "Discover machines",
    supportsDiscovery: false,
    requiresCredentialProfile: false,
    allowLegacyFallback: false,
  },
  other: {
    providerKey: "other",
    label: "Other",
    connectionMode: "api_key",
    defaultBaseUrl: "",
    externalIdLabel: "External resource ID",
    externalIdPlaceholder: "Remote machine / asset ID",
    credentialsLabel: "Provider credentials",
    discoveryButtonLabel: "Discover machines",
    supportsDiscovery: false,
    requiresCredentialProfile: false,
    allowLegacyFallback: false,
  },
};

function getProviderPreset(providerKey: InternalConnectorProviderKey): ProviderUiPreset {
  return PROVIDER_PRESETS[providerKey] ?? PROVIDER_PRESETS.other;
}

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

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
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

function getStatusBadgeClasses(status: InternalResourceStatus) {
  switch (status) {
    case "running":
      return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
    case "queued":
      return "bg-violet-50 text-violet-700 ring-1 ring-violet-200";
    case "paused":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "blocked":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "maintenance":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    case "offline":
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
    case "complete":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "idle":
    default:
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }
}

function getSyncBadgeClasses(
  status: InternalResourceConnection["lastSyncStatus"] | null,
) {
  switch (status) {
    case "ok":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "error":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "disabled":
      return "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getProfileBadgeClasses(
  status: InternalConnectorCredentialProfile["lastTestStatus"],
) {
  switch (status) {
    case "ok":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "error":
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    case "pending":
      return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    default:
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function deriveCategory(resource: InternalConnectorResource): FleetCategory {
  if (resource.serviceDomain === "additive" || resource.resourceType === "printer") {
    return "3D printers";
  }

  if (resource.serviceDomain === "cnc" || resource.resourceType === "cnc_machine") {
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
    readString(connection?.metadata?.technology),
    readString(connection?.metadata?.technologyLabel),
    readString(connection?.metadata?.machineTypeId),
    readString(connection?.metadata?.model),
  ].filter(Boolean) as string[];

  if (metadataCandidates.length > 0) {
    const first = metadataCandidates[0];
    const lower = first.toLowerCase();

    if (
      lower.includes("form 4") ||
      lower.includes("form-4") ||
      lower.includes("form 3") ||
      lower.includes("form-3") ||
      lower.includes("form 2") ||
      lower.includes("form-2")
    ) {
      return "SLA";
    }

    if (lower.includes("fuse")) return "SLS";
    if (lower.includes("fx10")) return "Composite / FFF";
    if (lower.includes("markforged")) return "Composite / FFF";
    if (lower.includes("ultimaker")) return "FDM";

    return first;
  }

  if (resource.serviceDomain === "additive") return "Additive";
  if (resource.serviceDomain === "cnc") return "CNC";
  if (resource.serviceDomain === "qa") return "Inspection";
  if (resource.serviceDomain === "scanning") return "Scanning";
  if (resource.serviceDomain === "finishing") return "Finishing";

  return formatLabel(resource.resourceType);
}

function buildMachineRow(
  resource: InternalConnectorResource,
  connection: InternalResourceConnection | null,
): MachineRow {
  const payload = asRecord(resource.latestStatusEvent?.payload ?? {});
  const printer = asRecord(readPath(payload, ["printer"]));
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
      readString(readPath(printer, ["printerStatus", "currentPrintRun", "name"])) ??
      readString(printer.currentJobName) ??
      null,
    currentMaterial:
      readString(readPath(printer, ["printerStatus", "currentPrintRun", "material"])) ??
      readString(printer.material) ??
      null,
    rawVendorStatus:
      readString(payload.raw_status) ?? readString(printer.rawStatus) ?? null,
    machineTypeLabel:
      readString(printer.machineTypeId) ??
      readString(printer.printerType) ??
      readString(printer.model) ??
      null,
    externalMachineLabel:
      connection?.externalResourceId ??
      readString(printer.serial) ??
      readString(printer.id) ??
      null,
    lastPingedAt: readString(readPath(printer, ["printerStatus", "lastPingedAt"])),
  };
}

function getInitials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "MC"
  );
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
  if (machine.providerKey === "formlabs") return machine.item.serial;
  return machine.item.id;
}

function getDiscoveredMachineName(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.alias || machine.item.serial;
  }

  return machine.item.name;
}

function getDiscoveredMachineModel(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") return machine.item.machineTypeId;
  if (machine.providerKey === "ultimaker") return machine.item.printerType;
  return machine.item.model;
}

function getDiscoveredMachineTechnology(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    const value = (machine.item.machineTypeId || "").toLowerCase();
    if (value.includes("form")) return "SLA";
    if (value.includes("fuse")) return "SLS";
    return "Additive";
  }

  if (machine.providerKey === "ultimaker") return machine.item.technology || "FDM";
  if (machine.providerKey === "markforged") return machine.item.technology || "Composite / FFF";
  return machine.item.technology || "Additive";
}

function getDiscoveredMachineStatus(machine: DiscoveredMachine) {
  return machine.item.mappedStatus;
}

function getDiscoveredMachineSubtitle(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return `${machine.item.serial} · ${machine.item.machineTypeId || "Unknown model"}`;
  }

  if (machine.providerKey === "ultimaker") {
    return `${machine.item.id} · ${machine.item.printerType || "Ultimaker cluster"}`;
  }

  if (machine.providerKey === "markforged") {
    return `${machine.item.serial || machine.item.id} · ${machine.item.model || "Markforged device"}`;
  }

  return `${machine.item.serial || machine.item.id} · ${machine.item.model || "Stratasys machine"}`;
}

function getDiscoveredMachineMetaLines(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return [
      `Status: ${machine.item.rawStatus || "—"}`,
      `Group: ${machine.item.groupName || "—"}`,
      `Material: ${machine.item.currentPrintMaterial || "—"}`,
      `Last ping: ${formatDateTime(machine.item.lastPingedAt)}`,
    ];
  }

  if (machine.providerKey === "ultimaker") {
    return [
      `Cluster: ${machine.item.clusterName || machine.item.clusterId}`,
      `Technology: ${machine.item.technology || "—"}`,
      `Material: ${machine.item.material || "—"}`,
      `Status: ${machine.item.rawStatus || "—"}`,
    ];
  }

  if (machine.providerKey === "markforged") {
    return [
      `Serial: ${machine.item.serial || "—"}`,
      `Technology: ${machine.item.technology || "—"}`,
      `Location: ${machine.item.locationName || "—"}`,
      `Job: ${machine.item.currentJobName || "—"}`,
    ];
  }

  return [
    `Serial: ${machine.item.serial || "—"}`,
    `Technology: ${machine.item.technology || "—"}`,
    `Location: ${machine.item.locationName || "—"}`,
    `Job: ${machine.item.currentJobName || "—"}`,
  ];
}

function createAutoMetadata(machine: DiscoveredMachine): Record<string, unknown> {
  return {
    technology: getDiscoveredMachineTechnology(machine),
    model: getDiscoveredMachineModel(machine),
    providerDiscoveredName: getDiscoveredMachineName(machine),
    providerDiscoveredId: getDiscoveredMachineId(machine),
    discoveredFrom: machine.providerKey,
  };
}

function createDefaultDisplayName(
  resource: InternalConnectorResource | null,
  machine: DiscoveredMachine | null,
  providerKey: InternalConnectorProviderKey,
) {
  if (machine && resource?.name) {
    return `${resource.name} · ${getDiscoveredMachineName(machine)}`;
  }

  if (machine) {
    return getDiscoveredMachineName(machine);
  }

  if (resource) {
    return `${resource.name} Connector`;
  }

  return `${formatProviderLabel(providerKey)} Connector`;
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

export default function Client({ data, capabilities = [] }: Props) {
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

  const [activeCategory, setActiveCategory] = useState<FleetCategory>("All equipment");
  const [activeProvider, setActiveProvider] = useState<string>("All providers");
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

  const filteredMachines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return machines.filter((machine) => {
      if (activeCategory !== "All equipment" && machine.category !== activeCategory) {
        return false;
      }

      if (activeProvider !== "All providers" && machine.providerLabel !== activeProvider) {
        return false;
      }

      if (activeStatus !== "All statuses" && machine.currentStatus !== activeStatus) {
        return false;
      }

      if (!normalizedSearch) return true;

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
  }, [activeCategory, activeProvider, activeStatus, machines, search]);

  const selectedMachine =
    filteredMachines.find((machine) => machine.resource.id === selectedResourceId) ??
    machines.find((machine) => machine.resource.id === selectedResourceId) ??
    null;

  const providers = useMemo(
    () => [...new Set(machines.map((machine) => machine.providerLabel))].sort(),
    [machines],
  );

  const connectedCount = machines.filter((machine) => machine.connection).length;
  const runningCount = machines.filter((machine) => machine.currentStatus === "running").length;
  const idleCount = machines.filter((machine) => machine.currentStatus === "idle").length;
  const attentionCount = machines.filter(
    (machine) =>
      machine.currentStatus === "blocked" ||
      machine.currentStatus === "offline" ||
      machine.currentStatus === "maintenance" ||
      machine.connection?.lastSyncStatus === "error",
  ).length;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Internal connectors
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Fleet command
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Connect provider accounts, discover one or many machines, and manage
              machine health from a cleaner operational workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/internal-manufacturing"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Back to overview
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Setup
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/schedule"
              className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a]"
            >
              Schedule
            </Link>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
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

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1.6fr)_360px]">
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <SideMenuSection title="Categories">
            {(
              [
                "All equipment",
                "3D printers",
                "CNC",
                "Inspection & QA",
                "Finishing",
                "General",
              ] as FleetCategory[]
            ).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
                  activeCategory === category
                    ? "bg-[#0b1633] text-white"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <span>{category}</span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    activeCategory === category
                      ? "bg-white/15 text-white"
                      : "bg-white text-slate-500"
                  }`}
                >
                  {category === "All equipment"
                    ? machines.length
                    : machines.filter((machine) => machine.category === category).length}
                </span>
              </button>
            ))}
          </SideMenuSection>

          <SideMenuSection title="Providers">
            <FilterChip
              active={activeProvider === "All providers"}
              onClick={() => setActiveProvider("All providers")}
            >
              All providers
            </FilterChip>

            {providers.map((provider) => (
              <FilterChip
                key={provider}
                active={activeProvider === provider}
                onClick={() => setActiveProvider(provider)}
              >
                {provider}
              </FilterChip>
            ))}
          </SideMenuSection>
        </aside>

        <section className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Connected" value={connectedCount} />
            <StatCard label="Running" value={runningCount} />
            <StatCard label="Idle" value={idleCount} />
            <StatCard label="Attention" value={attentionCount} />
          </div>

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Active machines
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Browse machine state, provider health, and connection status in one
                  place.
                </p>
              </div>

              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    viewMode === "grid"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    viewMode === "table"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,220px)_minmax(180px,220px)]">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search machine, provider, material, job..."
                  className={inputClasses()}
                />
              </Field>

              <Field label="Status">
                <select
                  value={activeStatus}
                  onChange={(event) => setActiveStatus(event.target.value)}
                  className={inputClasses()}
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

              <Field label="Reset">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setActiveCategory("All equipment");
                    setActiveProvider("All providers");
                    setActiveStatus("All statuses");
                  }}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Reset filters
                </button>
              </Field>
            </div>

            <div className="mt-5 text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">{filteredMachines.length}</span>{" "}
              machine{filteredMachines.length === 1 ? "" : "s"}
            </div>

            {filteredMachines.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
                No machines match the current filters.
              </div>
            ) : viewMode === "grid" ? (
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
            ) : (
              <div className="mt-5 overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
                      <th className="px-4 py-2">Machine</th>
                      <th className="px-4 py-2">Provider</th>
                      <th className="px-4 py-2">Technology</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Vendor</th>
                      <th className="px-4 py-2">Job</th>
                      <th className="px-4 py-2">Material</th>
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
                            selected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          <td
                            className={`rounded-l-3xl px-4 py-4 ${
                              selected ? "bg-[#0f172a]" : "bg-white"
                            }`}
                          >
                            <div className="font-semibold">
                              {machine.connection?.displayName ?? machine.resource.name}
                            </div>
                            <div
                              className={`mt-1 text-xs ${
                                selected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              {machine.externalMachineLabel ?? machine.resource.name}
                            </div>
                          </td>
                          <td className={`px-4 py-4 text-sm ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            {machine.providerLabel}
                          </td>
                          <td className={`px-4 py-4 text-sm ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            {machine.technology}
                          </td>
                          <td className={`px-4 py-4 ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                                selected
                                  ? "bg-white/10 text-white"
                                  : getStatusBadgeClasses(machine.currentStatus)
                              }`}
                            >
                              {formatLabel(machine.currentStatus)}
                            </span>
                          </td>
                          <td className={`px-4 py-4 text-sm ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            {machine.rawVendorStatus ?? "—"}
                          </td>
                          <td className={`px-4 py-4 text-sm ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            {machine.currentJobName ?? "—"}
                          </td>
                          <td className={`px-4 py-4 text-sm ${selected ? "bg-[#0f172a]" : "bg-white"}`}>
                            {machine.currentMaterial ?? "—"}
                          </td>
                          <td
                            className={`rounded-r-3xl px-4 py-4 text-sm ${
                              selected ? "bg-[#0f172a]" : "bg-white"
                            }`}
                          >
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

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {data.canManageConnectors ? (
            <>
              <MachineActionPanel
  resource={selectedMachine?.resource ?? null}
  existingConnection={selectedMachine?.connection ?? null}
  resources={data.resources}
  credentialProfiles={data.credentialProfiles}
  capabilities={capabilities}
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-600">
                You are signed in as{" "}
                <span className="font-semibold text-slate-900">
                  {data.viewerRole ?? "viewer"}
                </span>
                . Connector setup and provider credentials can be managed only by
                organization admins.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function inputClasses() {
  return "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/20 focus:ring-4 focus:ring-[#0b1633]/5";
}

function SideMenuSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
        {title}
      </div>
      <div className="mt-4 space-y-2">{children}</div>
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
      className={`rounded-full px-3 py-2 text-xs font-medium transition ${
        active
          ? "bg-[#0b1633] text-white"
          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
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
      <label className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
  selected,
}: {
  label: string;
  value: string;
  selected: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 ${selected ? "bg-white/5" : "bg-slate-50"}`}>
      <div className={`text-[11px] uppercase tracking-[0.18em] ${selected ? "text-slate-400" : "text-slate-400"}`}>
        {label}
      </div>
      <div className={`mt-1 text-sm font-medium ${selected ? "text-white" : "text-slate-900"}`}>
        {value}
      </div>
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
  const [providerKey, setProviderKey] = useState<InternalConnectorProviderKey>("formlabs");
  const [displayName, setDisplayName] = useState("Primary Formlabs Account");
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [refreshToken, setRefreshToken] = useState("");
  const [tokenExpiresAt, setTokenExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editProviderKey, setEditProviderKey] = useState<InternalConnectorProviderKey>("formlabs");
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
    if (providerKey === "formlabs") setDisplayName("Primary Formlabs Account");
    else if (providerKey === "ultimaker") setDisplayName("Primary Ultimaker Account");
    else if (providerKey === "markforged") setDisplayName("Primary Markforged Account");
    else if (providerKey === "stratasys") setDisplayName("Primary Stratasys Account");
    else if (providerKey === "hp") setDisplayName("Primary HP Account");
  }, [providerKey]);

  function buildCreateBody() {
    return {
      organizationId,
      providerKey,
      displayName,
      authMode:
        providerKey === "ultimaker"
          ? "oauth"
          : "api_key",
      clientId:
        providerKey === "ultimaker" ? null : clientId,
      clientSecret:
        providerKey === "ultimaker" ? null : clientSecret,
      accessToken: providerKey === "ultimaker" ? accessToken : null,
      refreshToken: providerKey === "ultimaker" ? refreshToken || null : null,
      tokenExpiresAt: providerKey === "ultimaker" ? tokenExpiresAt || null : null,
    };
  }

  function buildUpdateBody() {
    return {
      displayName: editDisplayName,
      providerKey: editProviderKey,
      authMode: editProviderKey === "ultimaker" ? "oauth" : "api_key",
      clientId: editProviderKey === "ultimaker" ? null : editClientId || null,
      clientSecret: editProviderKey === "ultimaker" ? null : editClientSecret || null,
      accessToken: editProviderKey === "ultimaker" ? editAccessToken || null : null,
      refreshToken: editProviderKey === "ultimaker" ? editRefreshToken || null : null,
      tokenExpiresAt: editProviderKey === "ultimaker" ? editTokenExpiresAt || null : null,
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
        headers: { "Content-Type": "application/json" },
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
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to test credentials.");
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
          headers: { "Content-Type": "application/json" },
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

  const creatableProviders = ["formlabs", "ultimaker", "markforged", "stratasys", "hp"] as const;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Provider accounts
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
            Saved credentials
          </h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Reuse one provider account across many connected machines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((current) => !current)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
        >
          {showCreate ? "Close" : "Add"}
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {profiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            No provider accounts saved yet.
          </div>
        ) : (
          profiles.map((profile) => (
            <div
              key={profile.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-950">
                    {profile.displayName}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {formatProviderLabel(profile.providerKey)} · {getProfileDisplaySecondary(profile)}
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
                <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {profile.lastTestError}
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleTest(profile.id)}
                  disabled={testingId === profile.id}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {testingId === profile.id ? "Testing..." : "Test"}
                </button>

                <button
                  type="button"
                  onClick={() => openEdit(profile)}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
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
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-semibold text-slate-950">Replace saved credentials</div>

          <Field label="Provider">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              {formatProviderLabel(editProviderKey)}
            </div>
          </Field>

          <Field label="Profile name">
            <input
              value={editDisplayName}
              onChange={(event) => setEditDisplayName(event.target.value)}
              className={inputClasses()}
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
                  className={inputClasses()}
                />
              </Field>

              <Field label="New refresh token">
                <input
                  type="password"
                  value={editRefreshToken}
                  onChange={(event) => setEditRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className={inputClasses()}
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={editTokenExpiresAt}
                  onChange={(event) => setEditTokenExpiresAt(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="New client / access key">
                <input
                  value={editClientId}
                  onChange={(event) => setEditClientId(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClasses()}
                />
              </Field>

              <Field label="New secret">
                <input
                  type="password"
                  value={editClientSecret}
                  onChange={(event) => setEditClientSecret(event.target.value)}
                  placeholder="Leave blank to keep current"
                  className={inputClasses()}
                />
              </Field>
            </>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={updating}
              className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
            >
              {updating ? "Saving..." : "Save changes"}
            </button>

            <button
              type="button"
              onClick={() => setEditingProfileId(null)}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="mt-4 space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4"
        >
          <div className="text-sm font-semibold text-slate-950">Add provider account</div>

          <Field label="Provider">
            <select
              value={providerKey}
              onChange={(event) =>
                setProviderKey(event.target.value as InternalConnectorProviderKey)
              }
              className={inputClasses()}
            >
              {creatableProviders.map((value) => (
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
              className={inputClasses()}
            />
          </Field>

          {providerKey === "ultimaker" ? (
            <>
              <Field label="Access token">
                <input
                  type="password"
                  value={accessToken}
                  onChange={(event) => setAccessToken(event.target.value)}
                  className={inputClasses()}
                />
              </Field>

              <Field label="Refresh token">
                <input
                  type="password"
                  value={refreshToken}
                  onChange={(event) => setRefreshToken(event.target.value)}
                  placeholder="Optional"
                  className={inputClasses()}
                />
              </Field>

              <Field label="Token expires at">
                <input
                  type="datetime-local"
                  value={tokenExpiresAt}
                  onChange={(event) => setTokenExpiresAt(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          ) : (
            <>
              <Field label="Client / access key">
                <input
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                  className={inputClasses()}
                />
              </Field>

              <Field label="Secret">
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  className={inputClasses()}
                />
              </Field>
            </>
          )}

          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
          >
            {creating ? "Saving..." : `Save ${formatProviderLabel(providerKey)} credentials`}
          </button>
        </form>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {info ? (
        <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
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
  capabilities,
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
  capabilities: InternalManufacturingCapability[];
  selectedResourceId: string | null;
  onSelectedResourceChange: (resourceId: string) => void;
  defaultOrganizationId: string | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const [providerKey, setProviderKey] = useState<InternalConnectorProviderKey>(
    existingConnection?.providerKey ?? "formlabs",
  );
  const [connectionMode, setConnectionMode] = useState<InternalResourceConnection["connectionMode"]>(
    existingConnection?.connectionMode ?? getProviderPreset("formlabs").connectionMode,
  );
  const [displayName, setDisplayName] = useState(
    existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`,
  );
  const [credentialProfileId, setCredentialProfileId] = useState(
    existingConnection?.credentialProfileId ??
      credentialProfiles.find((profile) => profile.providerKey === (existingConnection?.providerKey ?? "formlabs"))?.id ??
      "",
  );
  const [baseUrl, setBaseUrl] = useState(existingConnection?.baseUrl ?? "");
  const [externalResourceId, setExternalResourceId] = useState(
    existingConnection?.externalResourceId ?? "",
  );
  const [syncEnabled, setSyncEnabled] = useState(existingConnection?.syncEnabled ?? true);
  const [vaultSecretName, setVaultSecretName] = useState(
    existingConnection?.vaultSecretName ?? "",
  );
  const [vaultSecretId, setVaultSecretId] = useState(existingConnection?.vaultSecretId ?? "");
  const [structuredMetadata, setStructuredMetadata] = useState<Record<string, unknown>>(
    existingConnection?.metadata ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredMachines, setDiscoveredMachines] = useState<DiscoveredMachine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [creatingFromDiscoveryId, setCreatingFromDiscoveryId] = useState<string | null>(null);
  const preset = getProviderPreset(providerKey);
  function inferCapabilitySeed(machine: DiscoveredMachine) {
    const technology = getDiscoveredMachineTechnology(machine);
    const lower = technology.toLowerCase();

    if (lower.includes("sla")) {
      return { code: "sla", name: "SLA Printing", serviceDomain: "additive" };
    }

    if (lower.includes("sls")) {
      return { code: "sls", name: "SLS Printing", serviceDomain: "additive" };
    }

    if (lower.includes("fdm") || lower.includes("fff")) {
      return { code: "fdm", name: "FDM Printing", serviceDomain: "additive" };
    }

    if (lower.includes("composite")) {
      return {
        code: "composite_fff",
        name: "Composite / FFF Printing",
        serviceDomain: "additive",
      };
    }

    if (lower.includes("scanning")) {
      return { code: "scanning", name: "Scanning", serviceDomain: "scanning" };
    }

    if (lower.includes("cnc")) {
      return { code: "cnc", name: "CNC Machining", serviceDomain: "cnc" };
    }

    return {
      code: "additive",
      name: "Additive Manufacturing",
      serviceDomain: "additive",
    };
  }
  async function handleCreateFromDiscoveredMachine(
    machine: DiscoveredMachine,
    mode:
      | "resource_only"
      | "resource_and_capability"
      | "resource_and_connector"
      | "resource_capability_and_connector",
  ) {
    if (!defaultOrganizationId) {
      setError("No customer organization context was found.");
      return;
    }

    setCreatingFromDiscoveryId(getDiscoveredMachineId(machine));
    setError(null);
    setInfo(null);

    try {
      const capabilitySeed = inferCapabilitySeed(machine);
      const selectedProfileId =
        preset.requiresCredentialProfile ? credentialProfileId || null : null;

      const response = await fetch(
        "/api/internal-manufacturing/resources/from-discovery",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId: defaultOrganizationId,
            providerKey: machine.providerKey,
            machineName: getDiscoveredMachineName(machine),
            externalResourceId: getDiscoveredMachineId(machine),
            model: getDiscoveredMachineModel(machine),
            technology: getDiscoveredMachineTechnology(machine),
            locationLabel:
              machine.providerKey === "markforged" || machine.providerKey === "stratasys"
                ? machine.item.locationName || null
                : null,
            metadata: createAutoMetadata(machine),
            createCapability:
              mode === "resource_and_capability" ||
              mode === "resource_capability_and_connector"
                ? {
                    code: capabilitySeed.code,
                    name: capabilitySeed.name,
                    serviceDomain: capabilitySeed.serviceDomain,
                    description: `Auto-created from ${formatProviderLabel(machine.providerKey)} machine discovery.`,
                  }
                : null,
            createConnection:
              mode === "resource_and_connector" ||
              mode === "resource_capability_and_connector"
                ? {
                    displayName: `${getDiscoveredMachineName(machine)} Connector`,
                    credentialProfileId: selectedProfileId,
                    baseUrl: baseUrl || null,
                    syncEnabled: true,
                    vaultSecretName:
                      preset.allowLegacyFallback ? vaultSecretName || null : null,
                    vaultSecretId:
                      preset.allowLegacyFallback ? vaultSecretId || null : null,
                  }
                : null,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create resource from discovery.");
      }

      if (mode === "resource_capability_and_connector") {
        setInfo("Machine resource, suggested capability, and connector created.");
      } else if (mode === "resource_and_connector") {
        setInfo("Machine resource and connector created.");
      } else if (mode === "resource_and_capability") {
        setInfo("Machine resource and suggested capability created.");
      } else {
        setInfo("Machine resource created from discovery.");
      }

      onSaved();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create resource from discovery.",
      );
    } finally {
      setCreatingFromDiscoveryId(null);
    }
  }
  const scopedProfiles = useMemo(
    () => credentialProfiles.filter((profile) => profile.providerKey === providerKey),
    [credentialProfiles, providerKey],
  );

  useEffect(() => {
    const initialProvider = existingConnection?.providerKey ?? "formlabs";
    const initialPreset = getProviderPreset(initialProvider);

    setProviderKey(initialProvider);
    setConnectionMode(existingConnection?.connectionMode ?? initialPreset.connectionMode);
    setDisplayName(existingConnection?.displayName ?? `${resource?.name ?? "Machine"} Connector`);
    setCredentialProfileId(
      existingConnection?.credentialProfileId ??
        credentialProfiles.find((profile) => profile.providerKey === initialProvider)?.id ??
        "",
    );
    setBaseUrl(existingConnection?.baseUrl ?? initialPreset.defaultBaseUrl);
    setExternalResourceId(existingConnection?.externalResourceId ?? "");
    setSyncEnabled(existingConnection?.syncEnabled ?? true);
    setVaultSecretName(existingConnection?.vaultSecretName ?? "");
    setVaultSecretId(existingConnection?.vaultSecretId ?? "");
    setStructuredMetadata(existingConnection?.metadata ?? {});
    setDiscoveredMachines([]);
    setError(null);
    setInfo(null);
  }, [credentialProfiles, existingConnection, resource]);

  useEffect(() => {
    const nextPreset = getProviderPreset(providerKey);

    setConnectionMode(nextPreset.connectionMode);

    if (!existingConnection || existingConnection.providerKey !== providerKey) {
      setBaseUrl(nextPreset.defaultBaseUrl);
      setExternalResourceId("");
      setVaultSecretName("");
      setVaultSecretId("");
      setDiscoveredMachines([]);
      setStructuredMetadata({});
      setDisplayName(createDefaultDisplayName(resource, null, providerKey));
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

      return credentialProfiles.find((profile) => profile.providerKey === providerKey)?.id ?? "";
    });
  }, [credentialProfiles, existingConnection, providerKey, resource]);

  async function handleDiscoverMachines() {
    if (!credentialProfileId) {
      setError(`Select a saved ${preset.label} credential profile first.`);
      return;
    }

    setDiscovering(true);
    setError(null);
    setInfo(null);

    try {
      const response = await fetch(
        `/api/internal-manufacturing/connector-profiles/${credentialProfileId}/discover-printers`,
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to discover machines.");
      }

      const rawItems: unknown[] = Array.isArray(payload.printers) ? payload.printers : [];

      const normalized: DiscoveredMachine[] =
        providerKey === "ultimaker"
          ? rawItems.map((item) => ({
              providerKey: "ultimaker" as const,
              item: item as UltimakerDiscoveredPrinter,
            }))
          : providerKey === "markforged"
            ? rawItems.map((item) => ({
                providerKey: "markforged" as const,
                item: item as MarkforgedDiscoveredPrinter,
              }))
            : providerKey === "stratasys"
              ? rawItems.map((item) => ({
                  providerKey: "stratasys" as const,
                  item: item as StratasysDiscoveredPrinter,
                }))
              : rawItems.map((item) => ({
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
      const metadata = structuredMetadata;

      const url = existingConnection
        ? `/api/internal-manufacturing/resource-connections/${existingConnection.id}`
        : "/api/internal-manufacturing/resource-connections";

      const method = existingConnection ? "PATCH" : "POST";

      const body = {
        resourceId: resource.id,
        providerKey,
        connectionMode,
        displayName,
        vaultSecretName: preset.allowLegacyFallback ? vaultSecretName || null : null,
        vaultSecretId: preset.allowLegacyFallback ? vaultSecretId || null : null,
        credentialProfileId: preset.requiresCredentialProfile ? credentialProfileId || null : null,
        baseUrl: baseUrl || null,
        externalResourceId: externalResourceId || null,
        syncEnabled,
        metadata,
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
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
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to test connector.");
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
        { method: "POST" },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || payload.message || "Failed to sync connector.");
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
        { method: "DELETE" },
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

  const showConnectionModeSelector =
    !["formlabs", "ultimaker", "markforged", "stratasys", "hp"].includes(providerKey);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
          Connector workspace
        </div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
          Selected machine
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Discover provider machines first, then attach them cleanly to internal resources.
        </p>
      </div>

      <form onSubmit={handleSave} className="mt-5 space-y-4">
        <Field label="Internal resource">
          <select
            value={selectedResourceId ?? ""}
            onChange={(event) => onSelectedResourceChange(event.target.value)}
            className={inputClasses()}
          >
            {resources.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        {resource ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">{resource.name}</div>
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
              <div>Latest update: {formatDateTime(resource.latestStatusEvent?.effectiveAt)}</div>
            </div>
          </div>
        ) : null}

        <Field label="Provider">
          <select
            value={providerKey}
            onChange={(event) =>
              setProviderKey(event.target.value as InternalConnectorProviderKey)
            }
            className={inputClasses()}
          >
            {providerOptions.map((value) => (
              <option key={value} value={value}>
                {formatProviderLabel(value)}
              </option>
            ))}
          </select>
        </Field>

        <div className={`grid gap-4 ${showConnectionModeSelector ? "md:grid-cols-2" : "grid-cols-1"}`}>
          {showConnectionModeSelector ? (
            <Field label="Connection mode">
              <select
                value={connectionMode}
                onChange={(event) =>
                  setConnectionMode(
                    event.target.value as InternalResourceConnection["connectionMode"],
                  )
                }
                className={inputClasses()}
              >
                {connectionModeOptions.map((value) => (
                  <option key={value} value={value}>
                    {formatLabel(value)}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Display name">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className={inputClasses()}
            />
          </Field>
        </div>

        <Field label={preset.externalIdLabel}>
          <input
            value={externalResourceId}
            onChange={(event) => setExternalResourceId(event.target.value)}
            placeholder={preset.externalIdPlaceholder}
            className={inputClasses()}
          />
        </Field>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-950">{preset.credentialsLabel}</div>

          {preset.requiresCredentialProfile ? (
            <div className="mt-4 space-y-4">
              <Field label="Saved credentials">
                <select
                  value={credentialProfileId}
                  onChange={(event) => setCredentialProfileId(event.target.value)}
                  className={inputClasses()}
                >
                  <option value="">Select credentials</option>
                  {scopedProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.displayName}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder={
                    providerKey === "stratasys" || providerKey === "hp"
                      ? "Required base URL"
                      : "Optional override"
                  }
                  className={inputClasses()}
                />
              </Field>

              {preset.allowLegacyFallback ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Legacy fallback secret name">
                    <input
                      value={vaultSecretName}
                      onChange={(event) => setVaultSecretName(event.target.value)}
                      placeholder="Optional legacy fallback"
                      className={inputClasses()}
                    />
                  </Field>

                  <Field label="Legacy fallback secret ID">
                    <input
                      value={vaultSecretId}
                      onChange={(event) => setVaultSecretId(event.target.value)}
                      placeholder="Optional secret ID"
                      className={inputClasses()}
                    />
                  </Field>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <Field label="Base URL">
                <input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  placeholder="Local agent or API base URL"
                  className={inputClasses()}
                />
              </Field>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Secret name">
                  <input
                    value={vaultSecretName}
                    onChange={(event) => setVaultSecretName(event.target.value)}
                    placeholder="Optional secret reference"
                    className={inputClasses()}
                  />
                </Field>

                <Field label="Secret ID">
                  <input
                    value={vaultSecretId}
                    onChange={(event) => setVaultSecretId(event.target.value)}
                    placeholder="Optional secret ID"
                    className={inputClasses()}
                  />
                </Field>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <label className="inline-flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(event) => setSyncEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Sync enabled
            </label>

            {preset.supportsDiscovery ? (
              <button
                type="button"
                onClick={handleDiscoverMachines}
                disabled={discovering || !credentialProfileId}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
              >
                {discovering ? "Loading..." : preset.discoveryButtonLabel}
              </button>
            ) : null}
          </div>
        </div>

        {discoveredMachines.length > 0 ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Discovered machines
            </div>

            <div className="space-y-3">
              {discoveredMachines.map((machine) => {
                const discoveredId = getDiscoveredMachineId(machine);
                const selected = externalResourceId === discoveredId;

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
                        : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">{getDiscoveredMachineName(machine)}</div>
                        <div className={`mt-1 text-xs ${selected ? "text-slate-300" : "text-slate-500"}`}>
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

                    <div className={`mt-3 grid gap-1 text-xs ${selected ? "text-slate-200" : "text-slate-500"}`}>
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
        ) : null}

        {defaultOrganizationId ? null : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            No customer organization context was found for creating new connectors.
          </div>
        )}

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {info ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {info}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !resource}
            className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:opacity-60"
          >
            {saving ? "Saving..." : existingConnection ? "Save connector" : "Create connector"}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !existingConnection}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {testing ? "Testing..." : "Test"}
          </button>

          <button
            type="button"
            onClick={handleSync}
            disabled={syncing || !existingConnection}
            className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
          >
            {syncing ? "Syncing..." : "Sync"}
          </button>

          {existingConnection ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
        </div>

        {existingConnection ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-950">Connection health</div>
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
              <div>External ID: {existingConnection.externalResourceId || "—"}</div>
              <div>Sync enabled: {existingConnection.syncEnabled ? "Yes" : "No"}</div>
            </div>

            {existingConnection.lastError ? (
              <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {existingConnection.lastError}
              </div>
            ) : null}
          </div>
        ) : null}
      </form>
    </div>
  );
}
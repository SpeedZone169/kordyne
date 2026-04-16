import type {
  FormlabsDiscoveredPrinter,
  InternalConnectorCredentialProfile,
  InternalConnectorProviderKey,
  InternalConnectorResource,
  InternalResourceConnection,
  InternalResourceStatus,
  MarkforgedDiscoveredPrinter,
  StratasysDiscoveredPrinter,
  UltimakerDiscoveredPrinter,
} from "../types";

export type FleetCategory =
  | "All equipment"
  | "3D printers"
  | "CNC"
  | "Inspection & QA"
  | "Finishing"
  | "General";

export type ViewMode = "grid" | "table";

export type MachineRow = {
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

export type DiscoveredMachine =
  | { providerKey: "formlabs"; item: FormlabsDiscoveredPrinter }
  | { providerKey: "ultimaker"; item: UltimakerDiscoveredPrinter }
  | { providerKey: "markforged"; item: MarkforgedDiscoveredPrinter }
  | { providerKey: "stratasys"; item: StratasysDiscoveredPrinter };

export type ProviderUiPreset = {
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

export const providerOptions: InternalConnectorProviderKey[] = [
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

export const connectionModeOptions = [
  "api_key",
  "oauth",
  "agent_url",
  "manual",
] as const;

export const PROVIDER_PRESETS: Record<string, ProviderUiPreset> = {
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

export function getProviderPreset(
  providerKey: InternalConnectorProviderKey,
): ProviderUiPreset {
  return PROVIDER_PRESETS[providerKey] ?? PROVIDER_PRESETS.other;
}

export function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatProviderLabel(value: string) {
  if (value === "mtconnect") return "MTConnect";
  if (value === "opc_ua") return "OPC UA";
  return formatLabel(value);
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readPath(root: unknown, path: string[]) {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

export function getStatusBadgeClasses(status: InternalResourceStatus | string) {
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

export function getSyncBadgeClasses(
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

export function getProfileBadgeClasses(
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

export function inputClasses() {
  return "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/20 focus:ring-4 focus:ring-[#0b1633]/5";
}

export function deriveCategory(resource: InternalConnectorResource): FleetCategory {
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

export function deriveTechnology(
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

export function buildMachineRow(
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

export function getInitials(label: string) {
  const parts = label.split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "MC"
  );
}

export function getProfileDisplaySecondary(profile: InternalConnectorCredentialProfile) {
  if (profile.providerKey === "ultimaker") {
    if (profile.tokenExpiresAt) {
      return `Token expires ${formatDateTime(profile.tokenExpiresAt)}`;
    }

    return profile.authMode ? `Auth: ${formatLabel(profile.authMode)}` : "Token auth";
  }

  return profile.clientIdPreview || "Stored credentials";
}

export function getDiscoveredMachineId(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") return machine.item.serial;
  return machine.item.id;
}

export function getDiscoveredMachineName(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.alias || machine.item.serial;
  }

  return machine.item.name;
}

export function getDiscoveredMachineModel(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") return machine.item.machineTypeId;
  if (machine.providerKey === "ultimaker") return machine.item.printerType;
  return machine.item.model;
}

export function getDiscoveredMachineTechnology(machine: DiscoveredMachine) {
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

export function getDiscoveredMachineStatus(machine: DiscoveredMachine) {
  return machine.item.mappedStatus;
}

export function getDiscoveredMachineSubtitle(machine: DiscoveredMachine) {
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

export function getDiscoveredMachineMetaLines(machine: DiscoveredMachine) {
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

export function createAutoMetadata(machine: DiscoveredMachine): Record<string, unknown> {
  return {
    technology: getDiscoveredMachineTechnology(machine),
    model: getDiscoveredMachineModel(machine),
    providerDiscoveredName: getDiscoveredMachineName(machine),
    providerDiscoveredId: getDiscoveredMachineId(machine),
    discoveredFrom: machine.providerKey,
  };
}

export function createDefaultDisplayName(
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
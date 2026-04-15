import type {
  FormlabsDiscoveredPrinter,
  InternalConnectorCredentialProfile,
  InternalConnectorProviderKey,
  InternalResourceConnection,
  InternalResourceStatus,
  MarkforgedDiscoveredPrinter,
  UltimakerDiscoveredPrinter,
} from "./types";

export type NormalizedDiscoveredMachine = {
  providerKey: InternalConnectorProviderKey;
  id: string;
  displayName: string;
  subtitle: string;
  mappedStatus: InternalResourceStatus;
  rawStatus: string | null;
  technology: string | null;
  machineModel: string | null;
  serialOrExternalRef: string | null;
  locationLabel: string | null;
  material: string | null;
  currentJobName: string | null;
  metadata: Record<string, unknown>;
};

export type ProviderUiDefinition = {
  providerKey: InternalConnectorProviderKey;
  providerLabel: string;
  defaultConnectionMode: InternalResourceConnection["connectionMode"];
  requiresCredentialProfile: boolean;
  supportsDiscovery: boolean;
  externalIdLabel: string;
  externalIdPlaceholder: string;
  baseUrlLabel: string;
  baseUrlPlaceholder: string;
  defaultBaseUrl: string;
  createProfileLabel: string;
  createSecretLabel: string;
  usesTokenAuth: boolean;
  supportsEquipmentBeyondPrinters: boolean;
};

const DEFAULT_PROVIDER_DEFINITIONS: Record<
  InternalConnectorProviderKey,
  ProviderUiDefinition
> = {
  formlabs: {
    providerKey: "formlabs",
    providerLabel: "Formlabs",
    defaultConnectionMode: "oauth",
    requiresCredentialProfile: true,
    supportsDiscovery: true,
    externalIdLabel: "Printer serial",
    externalIdPlaceholder: "Formlabs printer serial",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "https://api.formlabs.com",
    defaultBaseUrl: "https://api.formlabs.com",
    createProfileLabel: "Client ID",
    createSecretLabel: "Client secret",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: false,
  },
  ultimaker: {
    providerKey: "ultimaker",
    providerLabel: "Ultimaker",
    defaultConnectionMode: "oauth",
    requiresCredentialProfile: true,
    supportsDiscovery: true,
    externalIdLabel: "Cluster or printer ID",
    externalIdPlaceholder: "Ultimaker cluster/printer ID",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "https://api.ultimaker.com",
    defaultBaseUrl: "https://api.ultimaker.com",
    createProfileLabel: "Access token",
    createSecretLabel: "Refresh token",
    usesTokenAuth: true,
    supportsEquipmentBeyondPrinters: false,
  },
  markforged: {
    providerKey: "markforged",
    providerLabel: "Markforged",
    defaultConnectionMode: "api_key",
    requiresCredentialProfile: true,
    supportsDiscovery: true,
    externalIdLabel: "Device ID",
    externalIdPlaceholder: "Markforged device ID",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "https://www.eiger.io",
    defaultBaseUrl: "https://www.eiger.io",
    createProfileLabel: "API access key",
    createSecretLabel: "API secret key",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  stratasys: {
    providerKey: "stratasys",
    providerLabel: "Stratasys",
    defaultConnectionMode: "api_key",
    requiresCredentialProfile: true,
    supportsDiscovery: true,
    externalIdLabel: "Printer ID",
    externalIdPlaceholder: "Stratasys printer ID",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "Provider API base URL",
    defaultBaseUrl: "",
    createProfileLabel: "API key / client ID",
    createSecretLabel: "API secret / token",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  hp: {
    providerKey: "hp",
    providerLabel: "HP",
    defaultConnectionMode: "api_key",
    requiresCredentialProfile: true,
    supportsDiscovery: true,
    externalIdLabel: "Printer ID",
    externalIdPlaceholder: "HP printer ID",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "Provider API base URL",
    defaultBaseUrl: "",
    createProfileLabel: "API key / client ID",
    createSecretLabel: "API secret / token",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  mtconnect: {
    providerKey: "mtconnect",
    providerLabel: "MTConnect",
    defaultConnectionMode: "agent_url",
    requiresCredentialProfile: false,
    supportsDiscovery: false,
    externalIdLabel: "Device or agent path",
    externalIdPlaceholder: "MTConnect device id",
    baseUrlLabel: "Agent URL",
    baseUrlPlaceholder: "http://agent-host:5000",
    defaultBaseUrl: "",
    createProfileLabel: "N/A",
    createSecretLabel: "N/A",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  opc_ua: {
    providerKey: "opc_ua",
    providerLabel: "OPC UA",
    defaultConnectionMode: "agent_url",
    requiresCredentialProfile: false,
    supportsDiscovery: false,
    externalIdLabel: "Node ID / equipment ID",
    externalIdPlaceholder: "OPC UA node id",
    baseUrlLabel: "Endpoint URL",
    baseUrlPlaceholder: "opc.tcp://host:4840",
    defaultBaseUrl: "",
    createProfileLabel: "N/A",
    createSecretLabel: "N/A",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  manual: {
    providerKey: "manual",
    providerLabel: "Manual",
    defaultConnectionMode: "manual",
    requiresCredentialProfile: false,
    supportsDiscovery: false,
    externalIdLabel: "External reference",
    externalIdPlaceholder: "Optional external machine reference",
    baseUrlLabel: "Reference URL",
    baseUrlPlaceholder: "Optional link or endpoint",
    defaultBaseUrl: "",
    createProfileLabel: "N/A",
    createSecretLabel: "N/A",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
  other: {
    providerKey: "other",
    providerLabel: "Other",
    defaultConnectionMode: "api_key",
    requiresCredentialProfile: false,
    supportsDiscovery: false,
    externalIdLabel: "External resource ID",
    externalIdPlaceholder: "Remote machine or equipment ID",
    baseUrlLabel: "Base URL",
    baseUrlPlaceholder: "Local agent or provider API URL",
    defaultBaseUrl: "",
    createProfileLabel: "Key / client ID",
    createSecretLabel: "Secret / token",
    usesTokenAuth: false,
    supportsEquipmentBeyondPrinters: true,
  },
};

export function getProviderDefinition(
  providerKey: InternalConnectorProviderKey,
): ProviderUiDefinition {
  return DEFAULT_PROVIDER_DEFINITIONS[providerKey];
}

export function getProviderLabel(providerKey: InternalConnectorProviderKey): string {
  return DEFAULT_PROVIDER_DEFINITIONS[providerKey].providerLabel;
}

export function getProviderDefaultConnectionMode(
  providerKey: InternalConnectorProviderKey,
): InternalResourceConnection["connectionMode"] {
  return DEFAULT_PROVIDER_DEFINITIONS[providerKey].defaultConnectionMode;
}

export function providerRequiresCredentialProfile(
  providerKey: InternalConnectorProviderKey,
): boolean {
  return DEFAULT_PROVIDER_DEFINITIONS[providerKey].requiresCredentialProfile;
}

export function providerSupportsDiscovery(
  providerKey: InternalConnectorProviderKey,
): boolean {
  return DEFAULT_PROVIDER_DEFINITIONS[providerKey].supportsDiscovery;
}

export function isRealVendorProvider(
  providerKey: InternalConnectorProviderKey,
): boolean {
  return providerSupportsDiscovery(providerKey) || providerRequiresCredentialProfile(providerKey);
}

function normalizeFormlabsMachine(
  item: FormlabsDiscoveredPrinter,
): NormalizedDiscoveredMachine {
  const model = item.machineTypeId || null;
  const normalizedModel = (model || "").toLowerCase();

  let technology: string | null = "Additive";

  if (
    normalizedModel.includes("form-2") ||
    normalizedModel.includes("form-3") ||
    normalizedModel.includes("form-4")
  ) {
    technology = "SLA";
  } else if (normalizedModel.includes("fuse")) {
    technology = "SLS";
  }

  return {
    providerKey: "formlabs",
    id: item.serial,
    displayName: item.alias || item.serial,
    subtitle: `${item.serial} · ${item.machineTypeId || "Unknown model"}`,
    mappedStatus: item.mappedStatus,
    rawStatus: item.rawStatus,
    technology,
    machineModel: item.machineTypeId || null,
    serialOrExternalRef: item.serial,
    locationLabel: item.groupName || null,
    material: item.currentPrintMaterial || null,
    currentJobName: item.currentPrintName || null,
    metadata: {
      technology,
      machineModel: item.machineTypeId || null,
      machineTypeId: item.machineTypeId || null,
      externalDisplayName: item.alias || item.serial,
      externalSerial: item.serial,
      externalRef: item.serial,
      groupName: item.groupName || null,
      discoveredFrom: "formlabs",
      rawStatus: item.rawStatus,
      readyToPrint: item.readyToPrint || null,
      currentPrintStatus: item.currentPrintStatus || null,
      lastModified: item.lastModified || null,
      lastPingedAt: item.lastPingedAt || null,
    },
  };
}

function normalizeUltimakerMachine(
  item: UltimakerDiscoveredPrinter,
): NormalizedDiscoveredMachine {
  return {
    providerKey: "ultimaker",
    id: item.id,
    displayName: item.name,
    subtitle: `${item.id} · ${item.printerType || "Ultimaker cluster"}`,
    mappedStatus: item.mappedStatus,
    rawStatus: item.rawStatus,
    technology: item.technology || "FDM",
    machineModel: item.printerType || null,
    serialOrExternalRef: item.id,
    locationLabel: item.clusterName || null,
    material: item.material || null,
    currentJobName: null,
    metadata: {
      technology: item.technology || "FDM",
      machineModel: item.printerType || null,
      printerType: item.printerType || null,
      externalDisplayName: item.name,
      externalRef: item.id,
      clusterId: item.clusterId,
      clusterName: item.clusterName || null,
      material: item.material || null,
      firmwareVersion: item.firmwareVersion || null,
      localIp: item.localIp || null,
      discoveredFrom: "ultimaker",
      rawStatus: item.rawStatus,
    },
  };
}

function normalizeMarkforgedMachine(
  item: MarkforgedDiscoveredPrinter,
): NormalizedDiscoveredMachine {
  return {
    providerKey: "markforged",
    id: item.id,
    displayName: item.name,
    subtitle: `${item.serial || item.id} · ${item.model || "Markforged device"}`,
    mappedStatus: item.mappedStatus,
    rawStatus: item.rawStatus,
    technology: item.technology || "Composite / FFF",
    machineModel: item.model || null,
    serialOrExternalRef: item.serial || item.id,
    locationLabel: item.locationName || null,
    material: item.material || null,
    currentJobName: item.currentJobName || null,
    metadata: {
      technology: item.technology || "Composite / FFF",
      machineModel: item.model || null,
      model: item.model || null,
      externalDisplayName: item.name,
      externalSerial: item.serial || null,
      externalRef: item.id,
      locationName: item.locationName || null,
      material: item.material || null,
      currentJobName: item.currentJobName || null,
      discoveredFrom: "markforged",
      rawStatus: item.rawStatus,
    },
  };
}

export function normalizeDiscoveredMachines(
  providerKey: InternalConnectorProviderKey,
  items: unknown[],
): NormalizedDiscoveredMachine[] {
  if (providerKey === "formlabs") {
    return items.map((item) =>
      normalizeFormlabsMachine(item as FormlabsDiscoveredPrinter),
    );
  }

  if (providerKey === "ultimaker") {
    return items.map((item) =>
      normalizeUltimakerMachine(item as UltimakerDiscoveredPrinter),
    );
  }

  if (providerKey === "markforged") {
    return items.map((item) =>
      normalizeMarkforgedMachine(item as MarkforgedDiscoveredPrinter),
    );
  }

  return [];
}

export function buildConnectorDisplayName(
  resourceName: string | null,
  machine: NormalizedDiscoveredMachine,
): string {
  if (!resourceName) {
    return machine.displayName;
  }

  return `${resourceName} · ${machine.displayName}`;
}

export function shouldAutoReplaceDisplayName(
  currentDisplayName: string,
  resourceName: string | null,
): boolean {
  const normalized = currentDisplayName.trim().toLowerCase();
  const defaults = new Set(
    [
      "machine connector",
      resourceName ? `${resourceName} connector` : "",
    ]
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );

  return normalized.length === 0 || defaults.has(normalized);
}

export function profileSecondaryText(
  profile: InternalConnectorCredentialProfile,
  formatDateTime: (value?: string | null) => string,
): string {
  const definition = getProviderDefinition(profile.providerKey);

  if (definition.usesTokenAuth) {
    if (profile.tokenExpiresAt) {
      return `Token expires ${formatDateTime(profile.tokenExpiresAt)}`;
    }

    return profile.authMode || "Token auth";
  }

  return profile.clientIdPreview || "Stored credentials";
}
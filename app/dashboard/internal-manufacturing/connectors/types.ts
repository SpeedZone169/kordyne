export type InternalConnectorProviderKey =
  | "formlabs"
  | "markforged"
  | "ultimaker"
  | "stratasys"
  | "hp"
  | "mtconnect"
  | "opc_ua"
  | "manual"
  | "other";

export type InternalConnectorConnectionMode =
  | "api_key"
  | "oauth"
  | "agent_url"
  | "manual";

export type InternalResourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "blocked"
  | "maintenance"
  | "offline"
  | "complete";

export type InternalConnectorSyncStatus =
  | "ok"
  | "error"
  | "disabled"
  | "pending"
  | null;

export type InternalConnectorProfileTestStatus =
  | "ok"
  | "error"
  | "pending"
  | null;

export type InternalOrganizationRole = "admin" | "engineer" | "viewer" | null;

export type InternalConnectorLatestStatusEvent = {
  id: string;
  source: string;
  status: InternalResourceStatus;
  reasonCode: string | null;
  reasonDetail: string | null;
  payload: Record<string, unknown>;
  effectiveAt: string;
  createdAt: string;
};

export type InternalConnectorResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: string;
  currentStatus: InternalResourceStatus;
  statusSource: string;
  active: boolean;
  locationLabel: string | null;
  timezone: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  latestStatusEvent: InternalConnectorLatestStatusEvent | null;
};

export type InternalResourceConnection = {
  id: string;
  organizationId: string;
  resourceId: string | null;
  providerKey: InternalConnectorProviderKey;
  connectionMode: InternalConnectorConnectionMode;
  displayName: string;
  vaultSecretName: string | null;
  vaultSecretId: string | null;
  credentialProfileId: string | null;
  baseUrl: string | null;
  externalResourceId: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: InternalConnectorSyncStatus;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type InternalConnectorCredentialProfile = {
  id: string;
  organizationId: string;
  providerKey: InternalConnectorProviderKey;
  displayName: string;
  authMode: string | null;
  clientIdPreview: string | null;
  hasSecret: boolean;
  hasRefreshToken: boolean;
  tokenExpiresAt: string | null;
  lastTestedAt: string | null;
  lastTestStatus: InternalConnectorProfileTestStatus;
  lastTestError: string | null;
  createdAt: string;
  updatedAt: string;
  connectionCount: number;
};

export type FormlabsDiscoveredPrinter = {
  serial: string;
  alias: string | null;
  machineTypeId: string | null;
  groupName: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  readyToPrint: string | null;
  lastModified: string | null;
  lastPingedAt: string | null;
  currentPrintName: string | null;
  currentPrintStatus: string | null;
  currentPrintMaterial: string | null;
};

export type UltimakerDiscoveredPrinter = {
  id: string;
  name: string;
  clusterId: string;
  clusterName: string | null;
  printerType: string | null;
  technology: string | null;
  material: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  firmwareVersion: string | null;
  localIp: string | null;
};

export type MarkforgedDiscoveredPrinter = {
  id: string;
  serial: string | null;
  name: string;
  model: string | null;
  technology: string | null;
  locationName: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  currentJobName: string | null;
  material: string | null;
};

export type StratasysDiscoveredMachine = {
  id: string;
  name: string;
  serial: string | null;
  model: string | null;
  technology: string | null;
  material: string | null;
  locationName: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  currentJobName: string | null;
};

export type HpDiscoveredMachine = {
  id: string;
  name: string;
  serial: string | null;
  model: string | null;
  technology: string | null;
  material: string | null;
  locationName: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  currentJobName: string | null;
};

export type InternalEquipmentClass =
  | "printer"
  | "machine"
  | "station"
  | "cell"
  | "scanner"
  | "work_center"
  | "other";

export type InternalResourceConnectionsData = {
  resources: InternalConnectorResource[];
  connections: InternalResourceConnection[];
  credentialProfiles: InternalConnectorCredentialProfile[];
  errors: string[];
  canManageConnectors: boolean;
  viewerRole: InternalOrganizationRole;
};
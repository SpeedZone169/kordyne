export type InternalResourceStatusEventSnapshot = {
  source: "manual" | "integration_sync" | "system";
  status:
    | "idle"
    | "queued"
    | "running"
    | "paused"
    | "blocked"
    | "maintenance"
    | "offline"
    | "complete";
  effectiveAt: string;
  payload: Record<string, unknown>;
};

export type InternalConnectorResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: string;
  currentStatus:
    | "idle"
    | "queued"
    | "running"
    | "paused"
    | "blocked"
    | "maintenance"
    | "offline"
    | "complete";
  active: boolean;
  locationLabel: string | null;
  metadata: Record<string, unknown>;
  latestStatusEvent: InternalResourceStatusEventSnapshot | null;
};

export type InternalResourceConnection = {
  id: string;
  organizationId: string;
  resourceId: string | null;
  providerKey:
    | "formlabs"
    | "markforged"
    | "ultimaker"
    | "stratasys"
    | "hp"
    | "mtconnect"
    | "opc_ua"
    | "manual"
    | "other";
  connectionMode: "api_key" | "oauth" | "agent_url" | "manual";
  displayName: string;
  vaultSecretName: string | null;
  vaultSecretId: string | null;
  credentialProfileId: string | null;
  credentialProfileDisplayName: string | null;
  baseUrl: string | null;
  externalResourceId: string | null;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: "ok" | "error" | "disabled" | "pending" | null;
  lastError: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type InternalConnectorCredentialProfile = {
  id: string;
  organizationId: string;
  providerKey: "formlabs";
  displayName: string;
  clientIdPreview: string;
  hasSecret: boolean;
  lastTestedAt: string | null;
  lastTestStatus: "ok" | "error" | "pending" | null;
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
  mappedStatus:
    | "idle"
    | "queued"
    | "running"
    | "paused"
    | "blocked"
    | "maintenance"
    | "offline"
    | "complete";
  readyToPrint: string | null;
  lastModified: string | null;
  lastPingedAt: string | null;
  currentPrintName: string | null;
  currentPrintStatus: string | null;
  currentPrintMaterial: string | null;
};

export type InternalResourceConnectionsData = {
  resources: InternalConnectorResource[];
  connections: InternalResourceConnection[];
  formlabsProfiles: InternalConnectorCredentialProfile[];
  viewerRole: "admin" | "engineer" | "viewer" | null;
  canManageConnectors: boolean;
  errors: string[];
};
export type InternalConnectorResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: string;
  currentStatus: string;
  active: boolean;
  locationLabel: string | null;
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

export type InternalResourceConnectionsData = {
  resources: InternalConnectorResource[];
  connections: InternalResourceConnection[];
  errors: string[];
};
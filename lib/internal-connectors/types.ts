export type InternalResourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "blocked"
  | "maintenance"
  | "offline"
  | "complete";

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

export type InternalConnectorCredentialAuthMode =
  | "client_credentials"
  | "oauth_authorization_code"
  | "api_token";

export type InternalResourceConnection = {
  id: string;
  organization_id: string;
  resource_id: string | null;
  provider_key: InternalConnectorProviderKey;
  connection_mode: InternalConnectorConnectionMode;
  display_name: string;
  vault_secret_name: string | null;
  vault_secret_id: string | null;
  credential_profile_id: string | null;
  base_url: string | null;
  external_resource_id: string | null;
  sync_enabled: boolean;
  metadata: Record<string, unknown> | null;
};

export type InternalConnectorCredentialProfileSecretRecord = {
  id: string;
  organization_id: string;
  provider_key: InternalConnectorProviderKey;
  display_name: string;
  auth_mode: InternalConnectorCredentialAuthMode | null;
  client_id: string | null;
  client_secret_ciphertext: string | null;
  client_secret_iv: string | null;
  client_secret_tag: string | null;
  access_token_ciphertext: string | null;
  access_token_iv: string | null;
  access_token_tag: string | null;
  refresh_token_ciphertext: string | null;
  refresh_token_iv: string | null;
  refresh_token_tag: string | null;
  token_expires_at: string | null;
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
  clusterId: string;
  clusterName: string | null;
  printerCount: number;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  currentJobName: string | null;
  currentMaterial: string | null;
  timeElapsedSec: number | null;
  timeTotalSec: number | null;
};

export type ConnectorSyncResult = {
  status: InternalResourceStatus;
  rawStatus: string | null;
  reasonCode: string;
  reasonDetail: string;
  effectiveAt: string;
  payload: Record<string, unknown>;
};
export type InternalResourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "blocked"
  | "maintenance"
  | "offline"
  | "complete";

export type InternalResourceConnection = {
  id: string;
  organization_id: string;
  resource_id: string | null;
  provider_key: string;
  connection_mode: string;
  display_name: string;
  vault_secret_name: string | null;
  vault_secret_id: string | null;
  base_url: string | null;
  external_resource_id: string | null;
  sync_enabled: boolean;
  metadata: Record<string, unknown> | null;
};

export type ConnectorSyncResult = {
  status: InternalResourceStatus;
  rawStatus: string | null;
  reasonCode: string;
  reasonDetail: string;
  effectiveAt: string;
  payload: Record<string, unknown>;
};
export const DESIGN_CONNECTOR_PROVIDERS = [
  "fusion",
  "solidworks",
  "inventor",
  "onshape",
] as const;

export type DesignConnectorProvider =
  (typeof DESIGN_CONNECTOR_PROVIDERS)[number];

export const DESIGN_CONNECTION_MODES = [
  "import_only",
  "export_only",
  "bidirectional",
] as const;

export type DesignConnectionMode =
  (typeof DESIGN_CONNECTION_MODES)[number];

export const DESIGN_SYNC_SCOPE_TYPES = [
  "workspace",
  "project",
  "folder",
  "document",
  "item",
  "manual",
] as const;

export type DesignSyncScopeType =
  (typeof DESIGN_SYNC_SCOPE_TYPES)[number];

export const DESIGN_SYNC_RUN_TYPES = [
  "test",
  "discover",
  "publish",
  "pull",
  "compare",
  "sync",
] as const;

export type DesignSyncRunType =
  (typeof DESIGN_SYNC_RUN_TYPES)[number];

export const DESIGN_SYNC_DIRECTIONS = [
  "cad_to_kordyne",
  "kordyne_to_cad",
  "bidirectional",
] as const;

export type DesignSyncDirection =
  (typeof DESIGN_SYNC_DIRECTIONS)[number];

export const DESIGN_SYNC_STATUSES = [
  "queued",
  "running",
  "succeeded",
  "failed",
  "partial",
] as const;

export type DesignSyncStatus =
  (typeof DESIGN_SYNC_STATUSES)[number];

export type DesignConnectorRecord = {
  id: string;
  organization_id: string;
  provider_key: DesignConnectorProvider | string;
  credential_profile_id: string;
  display_name: string;
  connection_mode: DesignConnectionMode | string;
  sync_scope_type: DesignSyncScopeType | string;
  sync_scope_external_id: string | null;
  sync_scope_label: string | null;
  is_enabled: boolean;
  settings: Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: DesignSyncStatus | string | null;
  last_error: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PartSourceLinkRecord = {
  id: string;
  organization_id: string;
  provider_key: DesignConnectorProvider | string;
  credential_profile_id: string | null;
  design_connector_id: string | null;
  part_family_id: string | null;
  part_id: string | null;
  external_workspace_id: string | null;
  external_project_id: string | null;
  external_document_id: string | null;
  external_item_id: string | null;
  external_version_id: string | null;
  external_revision_id: string | null;
  external_name: string | null;
  external_url: string | null;
  sync_mode: string;
  is_bidirectional: boolean;
  metadata: Record<string, unknown>;
  last_sync_at: string | null;
  last_sync_status: DesignSyncStatus | string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type DesignSyncRunRecord = {
  id: string;
  organization_id: string;
  provider_key: DesignConnectorProvider | string;
  design_connector_id: string | null;
  credential_profile_id: string | null;
  run_type: DesignSyncRunType | string;
  direction: DesignSyncDirection | string;
  target_ref: string | null;
  status: DesignSyncStatus | string;
  summary: Record<string, unknown>;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
  triggered_by_user_id: string | null;
};

export type DesignSyncRunItemRecord = {
  id: string;
  sync_run_id: string;
  part_family_id: string | null;
  part_id: string | null;
  part_source_link_id: string | null;
  external_ref: string | null;
  action: string;
  status: DesignSyncStatus | string;
  message: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type DesignConnectorAuditEventRecord = {
  id: string;
  organization_id: string;
  provider_key: DesignConnectorProvider | string;
  design_connector_id: string | null;
  credential_profile_id: string | null;
  actor_user_id: string | null;
  event_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
};

export type DesignConnectorProfileRecord = {
  id: string;
  organization_id: string;
  provider_key: DesignConnectorProvider | string;
  display_name: string;
  auth_mode: string | null;
  client_id: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  token_expires_at: string | null;
};

export type DesignConnectorListItem = DesignConnectorRecord & {
  credential_profile?: Pick<
    DesignConnectorProfileRecord,
    "id" | "display_name" | "provider_key" | "auth_mode" | "last_test_status"
  > | null;
};

export type CreateDesignConnectorInput = {
  provider_key: DesignConnectorProvider;
  credential_profile_id: string;
  display_name: string;
  connection_mode?: DesignConnectionMode;
  sync_scope_type: DesignSyncScopeType;
  sync_scope_external_id?: string | null;
  sync_scope_label?: string | null;
  is_enabled?: boolean;
  settings?: Record<string, unknown>;
};

export type UpdateDesignConnectorInput = Partial<CreateDesignConnectorInput>;

export type TestDesignConnectorResult = {
  ok: boolean;
  provider_key: string;
  connector_id?: string;
  profile_id?: string;
  message: string;
  details?: Record<string, unknown>;
};

export type RunDesignSyncResult = {
  ok: boolean;
  sync_run_id: string;
  status: DesignSyncStatus | string;
  message: string;
};

export type DesignAppPublishInput = {
  provider_key: DesignConnectorProvider;
  connector_id?: string | null;
  profile_id?: string | null;
  external_workspace_id?: string | null;
  external_project_id?: string | null;
  external_document_id?: string | null;
  external_item_id?: string | null;
  external_version_id?: string | null;
  external_revision_id?: string | null;
  external_name?: string | null;
  external_url?: string | null;
  part_family_id?: string | null;
  part_id?: string | null;
  metadata?: Record<string, unknown>;
  files?: Array<{
    role: string;
    filename: string;
    mime_type?: string | null;
    storage_path?: string | null;
    size_bytes?: number | null;
  }>;
};

export type DesignAppCompareInput = {
  provider_key: DesignConnectorProvider;
  connector_id?: string | null;
  part_id?: string | null;
  external_document_id?: string | null;
  external_item_id?: string | null;
  external_version_id?: string | null;
  metadata?: Record<string, unknown>;
};

export function isDesignConnectorProvider(
  value: string,
): value is DesignConnectorProvider {
  return (DESIGN_CONNECTOR_PROVIDERS as readonly string[]).includes(value);
}
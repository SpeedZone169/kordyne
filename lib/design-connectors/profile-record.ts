import type { DesignConnectorProfileRecord } from "./types";

export function toDesignConnectorProfileRecord(
  row: Record<string, unknown>,
): DesignConnectorProfileRecord {
  return {
    id: String(row.id),
    organization_id: String(row.organization_id),
    provider_key: String(row.provider_key),
    display_name: String(row.display_name),
    auth_mode: row.auth_mode ? String(row.auth_mode) : null,
    client_id: row.client_id ? String(row.client_id) : null,
    last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
    last_test_status: row.last_test_status ? String(row.last_test_status) : null,
    last_test_error: row.last_test_error ? String(row.last_test_error) : null,
    created_by_user_id: row.created_by_user_id
      ? String(row.created_by_user_id)
      : null,
    updated_by_user_id: row.updated_by_user_id
      ? String(row.updated_by_user_id)
      : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    token_expires_at: row.token_expires_at
      ? String(row.token_expires_at)
      : null,
  };
}

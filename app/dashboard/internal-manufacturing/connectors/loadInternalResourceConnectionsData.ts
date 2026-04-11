import { createClient } from "@/lib/supabase/server";

export async function loadInternalResourceConnectionsData() {
  const supabase = await createClient();
  const errors: string[] = [];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      resources: [],
      connections: [],
      errors: ["Unauthorized."],
    };
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipResult.error) {
    return {
      resources: [],
      connections: [],
      errors: [membershipResult.error.message],
    };
  }

  const organizationIds = (membershipResult.data ?? [])
    .map((row) => row.organization_id)
    .filter(Boolean);

  if (organizationIds.length === 0) {
    return {
      resources: [],
      connections: [],
      errors: [],
    };
  }

  const [resourcesResult, connectionsResult] = await Promise.all([
    supabase
      .from("internal_resources")
      .select(
        "id, organization_id, name, resource_type, service_domain, current_status, active, location_label",
      )
      .in("organization_id", organizationIds)
      .order("active", { ascending: false })
      .order("name", { ascending: true }),

    supabase
      .from("internal_resource_connections")
      .select(
        "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, base_url, external_resource_id, sync_enabled, last_sync_at, last_sync_status, last_error, metadata, created_at, updated_at",
      )
      .in("organization_id", organizationIds)
      .order("created_at", { ascending: false }),
  ]);

  if (resourcesResult.error) {
    errors.push(resourcesResult.error.message);
  }

  if (connectionsResult.error) {
    errors.push(connectionsResult.error.message);
  }

  const resources = (resourcesResult.data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    resourceType: row.resource_type,
    serviceDomain: row.service_domain,
    currentStatus: row.current_status,
    active: row.active,
    locationLabel: row.location_label,
  }));

  const connections = (connectionsResult.data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    resourceId: row.resource_id,
    providerKey: row.provider_key,
    connectionMode: row.connection_mode,
    displayName: row.display_name,
    vaultSecretName: row.vault_secret_name,
    vaultSecretId: row.vault_secret_id,
    baseUrl: row.base_url,
    externalResourceId: row.external_resource_id,
    syncEnabled: row.sync_enabled,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastError: row.last_error,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    resources,
    connections,
    errors,
  };
}
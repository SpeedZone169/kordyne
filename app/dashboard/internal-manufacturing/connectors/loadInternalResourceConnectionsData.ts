import { createClient } from "@/lib/supabase/server";

function maskClientId(clientId: string | null, providerKey: string) {
  if (providerKey === "ultimaker") {
    return "Saved API token";
  }

  if (!clientId) {
    return "Saved credentials";
  }

  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}••••${clientId.slice(-2)}`;
  }

  return `${clientId.slice(0, 4)}••••••${clientId.slice(-4)}`;
}

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
      credentialProfiles: [],
      canManageConnectors: false,
      viewerRole: null,
      errors: ["Unauthorized."],
    };
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipResult.error) {
    return {
      resources: [],
      connections: [],
      credentialProfiles: [],
      canManageConnectors: false,
      viewerRole: null,
      errors: [membershipResult.error.message],
    };
  }

  const memberships = membershipResult.data ?? [];
  const organizationIds = memberships
    .map((row) => row.organization_id)
    .filter(Boolean);

  const roleOrder = { viewer: 1, engineer: 2, admin: 3 } as const;
  const viewerRole =
    memberships
      .map((row) => row.role as "admin" | "engineer" | "viewer")
      .sort((a, b) => roleOrder[b] - roleOrder[a])[0] ?? null;

  const canManageConnectors = memberships.some((row) => row.role === "admin");

  if (organizationIds.length === 0) {
    return {
      resources: [],
      connections: [],
      credentialProfiles: [],
      canManageConnectors,
      viewerRole,
      errors: [],
    };
  }

  const [resourcesResult, connectionsResult, profilesResult, statusEventsResult] =
    await Promise.all([
      supabase
        .from("internal_resources")
        .select(
          "id, organization_id, name, resource_type, service_domain, current_status, active, location_label, metadata",
        )
        .in("organization_id", organizationIds)
        .order("active", { ascending: false })
        .order("name", { ascending: true }),

      supabase
        .from("internal_resource_connections")
        .select(
          "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, credential_profile_id, base_url, external_resource_id, sync_enabled, last_sync_at, last_sync_status, last_error, metadata, created_at, updated_at",
        )
        .in("organization_id", organizationIds)
        .order("created_at", { ascending: false }),

      supabase
        .from("internal_connector_profiles")
        .select(
          "id, organization_id, provider_key, auth_mode, display_name, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
        )
        .in("organization_id", organizationIds)
        .in("provider_key", ["formlabs", "ultimaker"])
        .order("created_at", { ascending: false }),

      supabase
        .from("internal_resource_status_events")
        .select("resource_id, payload, effective_at, created_at")
        .in("organization_id", organizationIds)
        .order("effective_at", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

  if (resourcesResult.error) errors.push(resourcesResult.error.message);
  if (connectionsResult.error) errors.push(connectionsResult.error.message);
  if (profilesResult.error) errors.push(profilesResult.error.message);
  if (statusEventsResult.error) errors.push(statusEventsResult.error.message);

  const latestStatusByResourceId = new Map<
    string,
    { payload: Record<string, unknown>; effectiveAt: string | null; createdAt: string | null }
  >();

  for (const row of statusEventsResult.data ?? []) {
    if (!row.resource_id || latestStatusByResourceId.has(row.resource_id)) {
      continue;
    }

    latestStatusByResourceId.set(row.resource_id, {
      payload:
        row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
          ? row.payload
          : {},
      effectiveAt: row.effective_at,
      createdAt: row.created_at,
    });
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
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata
        : {},
    latestStatusEvent: latestStatusByResourceId.get(row.id) ?? null,
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
    credentialProfileId: row.credential_profile_id,
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

  const connectionCounts = new Map<string, number>();

  for (const connection of connections) {
    if (!connection.credentialProfileId) continue;
    connectionCounts.set(
      connection.credentialProfileId,
      (connectionCounts.get(connection.credentialProfileId) ?? 0) + 1,
    );
  }

  const credentialProfiles = (profilesResult.data ?? []).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    providerKey: row.provider_key,
    authMode: row.auth_mode,
    displayName: row.display_name,
    clientIdPreview: maskClientId(row.client_id, row.provider_key),
    hasSecret: true,
    lastTestedAt: row.last_tested_at,
    lastTestStatus: row.last_test_status,
    lastTestError: row.last_test_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    connectionCount: connectionCounts.get(row.id) ?? 0,
  }));

  return {
    resources,
    connections,
    credentialProfiles,
    canManageConnectors,
    viewerRole,
    errors,
  };
}
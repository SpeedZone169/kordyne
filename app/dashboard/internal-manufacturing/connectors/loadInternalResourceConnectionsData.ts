import { createClient } from "@/lib/supabase/server";
import type {
  InternalConnectorCredentialProfile,
  InternalConnectorLatestStatusEvent,
  InternalConnectorResource,
  InternalOrganizationRole,
  InternalResourceConnection,
  InternalResourceConnectionsData,
} from "./types";

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function maskClientId(clientId: string | null) {
  if (!clientId) return null;

  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}••••${clientId.slice(-2)}`;
  }

  return `${clientId.slice(0, 4)}••••••${clientId.slice(-4)}`;
}

function getRoleRank(role: InternalOrganizationRole) {
  switch (role) {
    case "admin":
      return 3;
    case "engineer":
      return 2;
    case "viewer":
      return 1;
    default:
      return 0;
  }
}

function getHighestRole(roles: InternalOrganizationRole[]): InternalOrganizationRole {
  return roles.reduce<InternalOrganizationRole>((highest, current) => {
    return getRoleRank(current) > getRoleRank(highest) ? current : highest;
  }, null);
}

export async function loadInternalResourceConnectionsData(): Promise<InternalResourceConnectionsData> {
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
      errors: ["Unauthorized."],
      canManageConnectors: false,
      viewerRole: null,
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
      errors: [membershipResult.error.message],
      canManageConnectors: false,
      viewerRole: null,
    };
  }

  const memberships = (membershipResult.data ?? []) as Array<{
    organization_id: string;
    role: InternalOrganizationRole;
  }>;

  const allOrganizationIds = memberships
    .map((row) => row.organization_id)
    .filter(Boolean);

  if (allOrganizationIds.length === 0) {
    return {
      resources: [],
      connections: [],
      credentialProfiles: [],
      errors: [],
      canManageConnectors: false,
      viewerRole: null,
    };
  }

  const organizationsResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .in("id", allOrganizationIds);

  if (organizationsResult.error) {
    return {
      resources: [],
      connections: [],
      credentialProfiles: [],
      errors: [organizationsResult.error.message],
      canManageConnectors: false,
      viewerRole: null,
    };
  }

  const customerOrganizationIds = new Set(
    (organizationsResult.data ?? [])
      .filter((row) => row.organization_type === "customer")
      .map((row) => row.id),
  );

  const customerMemberships = memberships.filter((membership) =>
    customerOrganizationIds.has(membership.organization_id),
  );

  const organizationIds = customerMemberships.map((membership) => membership.organization_id);
  const viewerRole = getHighestRole(customerMemberships.map((membership) => membership.role));
  const canManageConnectors = viewerRole === "admin";

  if (organizationIds.length === 0) {
    return {
      resources: [],
      connections: [],
      credentialProfiles: [],
      errors: [],
      canManageConnectors,
      viewerRole,
    };
  }

  const [resourcesResult, connectionsResult, profilesResult] = await Promise.all([
    supabase
      .from("internal_resources")
      .select(
        "id, organization_id, name, resource_type, service_domain, status_source, current_status, location_label, timezone, active, notes, metadata",
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
        "id, organization_id, provider_key, display_name, auth_mode, client_id, client_secret_ciphertext, refresh_token_ciphertext, token_expires_at, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
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

  if (profilesResult.error) {
    errors.push(profilesResult.error.message);
  }

  const resourceRows = (resourcesResult.data ?? []) as Array<{
    id: string;
    organization_id: string;
    name: string;
    resource_type: string;
    service_domain: string;
    status_source: string;
    current_status: InternalConnectorResource["currentStatus"];
    location_label: string | null;
    timezone: string | null;
    active: boolean;
    notes: string | null;
    metadata: Record<string, unknown> | null;
  }>;

  const resourceIds = resourceRows.map((row) => row.id);

  let latestStatusEventsByResourceId = new Map<string, InternalConnectorLatestStatusEvent>();

  if (resourceIds.length > 0) {
    const statusEventsResult = await supabase
      .from("internal_resource_status_events")
      .select(
        "id, resource_id, source, status, reason_code, reason_detail, effective_at, payload, created_at",
      )
      .in("resource_id", resourceIds)
      .order("effective_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (statusEventsResult.error) {
      errors.push(statusEventsResult.error.message);
    } else {
      for (const row of statusEventsResult.data ?? []) {
        if (latestStatusEventsByResourceId.has(row.resource_id)) {
          continue;
        }

        latestStatusEventsByResourceId.set(row.resource_id, {
          id: row.id,
          source: row.source,
          status: row.status,
          reasonCode: row.reason_code,
          reasonDetail: row.reason_detail,
          effectiveAt: row.effective_at,
          payload: normalizeRecord(row.payload),
          createdAt: row.created_at,
        });
      }
    }
  }

  const resources: InternalConnectorResource[] = resourceRows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    resourceType: row.resource_type,
    serviceDomain: row.service_domain,
    statusSource: row.status_source,
    currentStatus: row.current_status,
    locationLabel: row.location_label,
    timezone: row.timezone,
    active: row.active,
    notes: row.notes,
    metadata: normalizeRecord(row.metadata),
    latestStatusEvent: latestStatusEventsByResourceId.get(row.id) ?? null,
  }));

  const connections: InternalResourceConnection[] = ((connectionsResult.data ?? []) as Array<{
    id: string;
    organization_id: string;
    resource_id: string | null;
    provider_key: InternalResourceConnection["providerKey"];
    connection_mode: InternalResourceConnection["connectionMode"];
    display_name: string;
    vault_secret_name: string | null;
    vault_secret_id: string | null;
    credential_profile_id: string | null;
    base_url: string | null;
    external_resource_id: string | null;
    sync_enabled: boolean;
    last_sync_at: string | null;
    last_sync_status: InternalResourceConnection["lastSyncStatus"];
    last_error: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
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
    metadata: normalizeRecord(row.metadata),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const connectionCountByProfileId = new Map<string, number>();

  for (const connection of connections) {
    if (!connection.credentialProfileId) continue;

    connectionCountByProfileId.set(
      connection.credentialProfileId,
      (connectionCountByProfileId.get(connection.credentialProfileId) ?? 0) + 1,
    );
  }

  const credentialProfiles: InternalConnectorCredentialProfile[] = (
    (profilesResult.data ?? []) as Array<{
      id: string;
      organization_id: string;
      provider_key: InternalConnectorCredentialProfile["providerKey"];
      display_name: string;
      auth_mode: string | null;
      client_id: string | null;
      client_secret_ciphertext: string | null;
      refresh_token_ciphertext: string | null;
      token_expires_at: string | null;
      last_tested_at: string | null;
      last_test_status: InternalConnectorCredentialProfile["lastTestStatus"];
      last_test_error: string | null;
      created_at: string;
      updated_at: string;
    }>
  ).map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    providerKey: row.provider_key,
    displayName: row.display_name,
    authMode: row.auth_mode,
    clientIdPreview: maskClientId(row.client_id),
    hasSecret: Boolean(row.client_secret_ciphertext),
    hasRefreshToken: Boolean(row.refresh_token_ciphertext),
    tokenExpiresAt: row.token_expires_at,
    lastTestedAt: row.last_tested_at,
    lastTestStatus: row.last_test_status,
    lastTestError: row.last_test_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    connectionCount: connectionCountByProfileId.get(row.id) ?? 0,
  }));

  return {
    resources,
    connections,
    credentialProfiles,
    errors,
    canManageConnectors,
    viewerRole,
  };
}
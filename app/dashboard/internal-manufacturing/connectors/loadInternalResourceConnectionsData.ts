import { createClient } from "@/lib/supabase/server";

function maskClientId(clientId: string) {
  if (clientId.length <= 8) {
    return `${clientId.slice(0, 2)}••••${clientId.slice(-2)}`;
  }

  return `${clientId.slice(0, 4)}••••••${clientId.slice(-4)}`;
}

function getHighestRole(
  roles: Array<"admin" | "engineer" | "viewer">,
): "admin" | "engineer" | "viewer" | null {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("engineer")) return "engineer";
  if (roles.includes("viewer")) return "viewer";
  return null;
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
      formlabsProfiles: [],
      viewerRole: null,
      canManageConnectors: false,
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
      formlabsProfiles: [],
      viewerRole: null,
      canManageConnectors: false,
      errors: [membershipResult.error.message],
    };
  }

  const memberships = membershipResult.data ?? [];
  const organizationIds = memberships
    .map((row) => row.organization_id)
    .filter(Boolean);

  const viewerRole = getHighestRole(
    memberships
      .map((row) => row.role)
      .filter(
        (role): role is "admin" | "engineer" | "viewer" =>
          role === "admin" || role === "engineer" || role === "viewer",
      ),
  );

  const canManageConnectors = memberships.some((row) => row.role === "admin");

  if (organizationIds.length === 0) {
    return {
      resources: [],
      connections: [],
      formlabsProfiles: [],
      viewerRole,
      canManageConnectors,
      errors: [],
    };
  }

  const [resourcesResult, connectionsResult] = await Promise.all([
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
  ]);

  if (resourcesResult.error) {
    errors.push(resourcesResult.error.message);
  }

  if (connectionsResult.error) {
    errors.push(connectionsResult.error.message);
  }

  const resourceRows = resourcesResult.data ?? [];
  const connectionRows = connectionsResult.data ?? [];
  const resourceIds = resourceRows.map((row) => row.id);

  let profileRows:
    | Array<{
        id: string;
        organization_id: string;
        provider_key: "formlabs";
        display_name: string;
        client_id: string;
        last_tested_at: string | null;
        last_test_status: "ok" | "error" | "pending" | null;
        last_test_error: string | null;
        created_at: string;
        updated_at: string;
      }>
    | [] = [];

  if (canManageConnectors) {
    const profilesResult = await supabase
      .from("internal_connector_profiles")
      .select(
        "id, organization_id, provider_key, display_name, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
      )
      .in("organization_id", organizationIds)
      .eq("provider_key", "formlabs")
      .order("created_at", { ascending: false });

    if (profilesResult.error) {
      errors.push(profilesResult.error.message);
    } else {
      profileRows = profilesResult.data ?? [];
    }
  }

  let latestEventByResourceId = new Map<
    string,
    {
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
      effective_at: string;
      payload: Record<string, unknown>;
    }
  >();

  if (resourceIds.length > 0) {
    const eventsResult = await supabase
      .from("internal_resource_status_events")
      .select("resource_id, source, status, effective_at, payload, created_at")
      .in("resource_id", resourceIds)
      .order("created_at", { ascending: false })
      .limit(500);

    if (eventsResult.error) {
      errors.push(eventsResult.error.message);
    } else {
      for (const row of eventsResult.data ?? []) {
        if (!latestEventByResourceId.has(row.resource_id)) {
          latestEventByResourceId.set(row.resource_id, {
            source: row.source,
            status: row.status,
            effective_at: row.effective_at,
            payload:
              row.payload &&
              typeof row.payload === "object" &&
              !Array.isArray(row.payload)
                ? row.payload
                : {},
          });
        }
      }
    }
  }

  const connectionCountByProfileId = new Map<string, number>();

  for (const row of connectionRows) {
    if (row.credential_profile_id) {
      connectionCountByProfileId.set(
        row.credential_profile_id,
        (connectionCountByProfileId.get(row.credential_profile_id) ?? 0) + 1,
      );
    }
  }

  const profileNameById = new Map(
    profileRows.map((row) => [row.id, row.display_name]),
  );

  const resources = resourceRows.map((row) => {
    const latestEvent = latestEventByResourceId.get(row.id) ?? null;

    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      resourceType: row.resource_type,
      serviceDomain: row.service_domain,
      currentStatus: row.current_status,
      active: row.active,
      locationLabel: row.location_label,
      metadata:
        row.metadata &&
        typeof row.metadata === "object" &&
        !Array.isArray(row.metadata)
          ? row.metadata
          : {},
      latestStatusEvent: latestEvent
        ? {
            source: latestEvent.source,
            status: latestEvent.status,
            effectiveAt: latestEvent.effective_at,
            payload: latestEvent.payload,
          }
        : null,
    };
  });

  const connections = connectionRows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    resourceId: row.resource_id,
    providerKey: row.provider_key,
    connectionMode: row.connection_mode,
    displayName: row.display_name,
    vaultSecretName: row.vault_secret_name,
    vaultSecretId: row.vault_secret_id,
    credentialProfileId: row.credential_profile_id,
    credentialProfileDisplayName: row.credential_profile_id
      ? profileNameById.get(row.credential_profile_id) ?? null
      : null,
    baseUrl: row.base_url,
    externalResourceId: row.external_resource_id,
    syncEnabled: row.sync_enabled,
    lastSyncAt: row.last_sync_at,
    lastSyncStatus: row.last_sync_status,
    lastError: row.last_error,
    metadata:
      row.metadata &&
      typeof row.metadata === "object" &&
      !Array.isArray(row.metadata)
        ? row.metadata
        : {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const formlabsProfiles = profileRows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    providerKey: "formlabs" as const,
    displayName: row.display_name,
    clientIdPreview: maskClientId(row.client_id),
    hasSecret: true,
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
    formlabsProfiles,
    viewerRole,
    canManageConnectors,
    errors,
  };
}
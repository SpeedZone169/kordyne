import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_PROVIDER_KEYS = new Set([
  "formlabs",
  "markforged",
  "ultimaker",
  "stratasys",
  "hp",
  "mtconnect",
  "opc_ua",
  "manual",
  "other",
]);

const ALLOWED_CONNECTION_MODES = new Set([
  "api_key",
  "oauth",
  "agent_url",
  "manual",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
}

async function requireCustomerAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  userId: string,
) {
  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      ok: false as const,
      response: jsonError(membershipResult.error.message, 500),
    };
  }

  if (!membershipResult.data) {
    return {
      ok: false as const,
      response: jsonError("You do not have access to this organization.", 403),
    };
  }

  const membership = membershipResult.data as {
    organization_id: string;
    role: string | null;
  };

  if (membership.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can manage internal connectors.",
        403,
      ),
    };
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", organizationId)
    .maybeSingle();

  if (organizationResult.error) {
    return {
      ok: false as const,
      response: jsonError(organizationResult.error.message, 500),
    };
  }

  if (!organizationResult.data) {
    return {
      ok: false as const,
      response: jsonError("Organization not found.", 404),
    };
  }

  const organization = organizationResult.data as {
    id: string;
    organization_type: string | null;
  };

  if (organization.organization_type !== "customer") {
    return {
      ok: false as const,
      response: jsonError(
        "Internal connectors are only available for customer organizations.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
  };
}

async function validateCredentialProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  providerKey: string,
  credentialProfileId: string | null,
) {
  if (!credentialProfileId) {
    if (providerKey === "ultimaker") {
      return {
        ok: false as const,
        response: jsonError(
          "Ultimaker requires a saved credential profile with an API token.",
          400,
        ),
      };
    }

    return { ok: true as const, profileId: null };
  }

  const profileResult = await supabase
    .from("internal_connector_profiles")
    .select("id, organization_id, provider_key")
    .eq("id", credentialProfileId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (profileResult.error) {
    return {
      ok: false as const,
      response: jsonError(profileResult.error.message, 500),
    };
  }

  if (!profileResult.data) {
    return {
      ok: false as const,
      response: jsonError("Selected credential profile does not exist.", 400),
    };
  }

  if (profileResult.data.provider_key !== providerKey) {
    return {
      ok: false as const,
      response: jsonError(
        "Credential profile provider does not match the selected connector provider.",
        400,
      ),
    };
  }

  return { ok: true as const, profileId: profileResult.data.id };
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const orgMembershipResult = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (orgMembershipResult.error) {
    return jsonError(orgMembershipResult.error.message, 500);
  }

  const organizationIds = (orgMembershipResult.data ?? []).map(
    (row) => row.organization_id,
  );

  if (organizationIds.length === 0) {
    return NextResponse.json({ connections: [] });
  }

  const result = await supabase
    .from("internal_resource_connections")
    .select(
      "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, credential_profile_id, base_url, external_resource_id, sync_enabled, last_sync_at, last_sync_status, last_error, metadata, created_at, updated_at",
    )
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });

  if (result.error) {
    return jsonError(result.error.message, 500);
  }

  return NextResponse.json({ connections: result.data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  let body: {
    resourceId?: string;
    providerKey?: string;
    connectionMode?: string;
    displayName?: string;
    vaultSecretName?: string | null;
    vaultSecretId?: string | null;
    credentialProfileId?: string | null;
    baseUrl?: string | null;
    externalResourceId?: string | null;
    syncEnabled?: boolean;
    metadata?: Record<string, unknown>;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const resourceId = normalizeOptionalText(body.resourceId);
  const providerKey = normalizeOptionalText(body.providerKey);
  const connectionMode = normalizeOptionalText(body.connectionMode);
  const displayName = normalizeOptionalText(body.displayName);
  const vaultSecretName = normalizeOptionalText(body.vaultSecretName);
  const vaultSecretId = normalizeOptionalText(body.vaultSecretId);
  const credentialProfileId = normalizeOptionalText(body.credentialProfileId);
  const baseUrl = normalizeOptionalText(body.baseUrl);
  const externalResourceId = normalizeOptionalText(body.externalResourceId);
  const syncEnabled =
    typeof body.syncEnabled === "boolean" ? body.syncEnabled : true;
  const metadata = normalizeMetadata(body.metadata);

  if (!resourceId) {
    return jsonError("resourceId is required.", 400);
  }

  if (!providerKey || !ALLOWED_PROVIDER_KEYS.has(providerKey)) {
    return jsonError("providerKey is invalid.", 400);
  }

  if (!connectionMode || !ALLOWED_CONNECTION_MODES.has(connectionMode)) {
    return jsonError("connectionMode is invalid.", 400);
  }

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  const resourceResult = await supabase
    .from("internal_resources")
    .select("id, organization_id, name")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceResult.error) {
    return jsonError(resourceResult.error.message, 500);
  }

  if (!resourceResult.data) {
    return jsonError("Resource not found.", 404);
  }

  const resource = resourceResult.data as {
    id: string;
    organization_id: string;
    name: string;
  };

  const access = await requireCustomerAdmin(
    supabase,
    resource.organization_id,
    user.id,
  );

  if (!access.ok) {
    return access.response;
  }

  const existingConnectionResult = await supabase
    .from("internal_resource_connections")
    .select("id")
    .eq("resource_id", resource.id)
    .limit(1)
    .maybeSingle();

  if (existingConnectionResult.error) {
    return jsonError(existingConnectionResult.error.message, 500);
  }

  if (existingConnectionResult.data) {
    return jsonError(
      "This resource already has a connector. Edit the existing connector instead.",
      409,
    );
  }

  const validatedProfile = await validateCredentialProfile(
    supabase,
    resource.organization_id,
    providerKey,
    credentialProfileId,
  );

  if (!validatedProfile.ok) {
    return validatedProfile.response;
  }

  if (
    providerKey === "formlabs" &&
    !validatedProfile.profileId &&
    !vaultSecretName &&
    !vaultSecretId
  ) {
    return jsonError(
      "Formlabs requires either a saved credential profile or a legacy fallback secret reference.",
      400,
    );
  }

  const insertResult = await supabase
    .from("internal_resource_connections")
    .insert({
      organization_id: resource.organization_id,
      resource_id: resource.id,
      provider_key: providerKey,
      connection_mode: connectionMode,
      display_name: displayName,
      vault_secret_name: vaultSecretName,
      vault_secret_id: vaultSecretId,
      credential_profile_id: validatedProfile.profileId,
      base_url: baseUrl,
      external_resource_id: externalResourceId,
      sync_enabled: syncEnabled,
      last_sync_status: syncEnabled ? "pending" : "disabled",
      metadata,
    })
    .select(
      "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, credential_profile_id, base_url, external_resource_id, sync_enabled, last_sync_at, last_sync_status, last_error, metadata, created_at, updated_at",
    )
    .single();

  if (insertResult.error) {
    return jsonError(insertResult.error.message, 500);
  }

  return NextResponse.json({ connection: insertResult.data }, { status: 201 });
}
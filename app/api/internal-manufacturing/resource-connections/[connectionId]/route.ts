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

type RouteContext = {
  params: Promise<{
    connectionId: string;
  }>;
};

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

async function getManagedConnection(
  supabase: Awaited<ReturnType<typeof createClient>>,
  connectionId: string,
  userId: string,
) {
  const connectionResult = await supabase
    .from("internal_resource_connections")
    .select(
      "id, organization_id, resource_id, provider_key, connection_mode, display_name",
    )
    .eq("id", connectionId)
    .maybeSingle();

  if (connectionResult.error) {
    return {
      ok: false as const,
      response: jsonError(connectionResult.error.message, 500),
    };
  }

  if (!connectionResult.data) {
    return {
      ok: false as const,
      response: jsonError("Connector not found.", 404),
    };
  }

  const connection = connectionResult.data as {
    id: string;
    organization_id: string;
    resource_id: string | null;
    provider_key: string;
    connection_mode: string;
    display_name: string;
  };

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", connection.organization_id)
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

  return {
    ok: true as const,
    connection,
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

export async function PATCH(request: Request, context: RouteContext) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const { connectionId } = await context.params;

  const managed = await getManagedConnection(supabase, connectionId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  let body: {
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

  if (!providerKey || !ALLOWED_PROVIDER_KEYS.has(providerKey)) {
    return jsonError("providerKey is invalid.", 400);
  }

  if (!connectionMode || !ALLOWED_CONNECTION_MODES.has(connectionMode)) {
    return jsonError("connectionMode is invalid.", 400);
  }

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  const validatedProfile = await validateCredentialProfile(
    supabase,
    managed.connection.organization_id,
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

  const updateResult = await supabase
    .from("internal_resource_connections")
    .update({
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
      updated_at: new Date().toISOString(),
    })
    .eq("id", connectionId)
    .select(
      "id, organization_id, resource_id, provider_key, connection_mode, display_name, vault_secret_name, vault_secret_id, credential_profile_id, base_url, external_resource_id, sync_enabled, last_sync_at, last_sync_status, last_error, metadata, created_at, updated_at",
    )
    .single();

  if (updateResult.error) {
    return jsonError(updateResult.error.message, 500);
  }

  return NextResponse.json({ connection: updateResult.data });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  const { connectionId } = await context.params;

  const managed = await getManagedConnection(supabase, connectionId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  const deleteResult = await supabase
    .from("internal_resource_connections")
    .delete()
    .eq("id", connectionId);

  if (deleteResult.error) {
    return jsonError(deleteResult.error.message, 500);
  }

  return NextResponse.json({ success: true });
}
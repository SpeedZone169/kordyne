import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptConnectorSecret } from "@/lib/internal-connectors/crypto";

const ALLOWED_PROVIDER_KEYS = new Set([
  "formlabs",
  "ultimaker",
  "markforged",
  "stratasys",
  "hp",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function providerUsesTokenAuth(providerKey: string) {
  return providerKey === "ultimaker";
}

function providerUsesKeyAndSecret(providerKey: string) {
  return (
    providerKey === "formlabs" ||
    providerKey === "markforged" ||
    providerKey === "stratasys" ||
    providerKey === "hp"
  );
}

function getStoredAuthMode(providerKey: string) {
  if (providerKey === "ultimaker") {
    return "api_token";
  }

  if (
    providerKey === "markforged" ||
    providerKey === "stratasys" ||
    providerKey === "hp"
  ) {
    return "api_key";
  }

  return "client_credentials";
}

function maskProfilePreview(providerKey: string, clientId: string | null) {
  if (providerUsesTokenAuth(providerKey)) {
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

  if (membershipResult.data.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can manage connector credentials.",
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

  if (organizationResult.data.organization_type !== "customer") {
    return {
      ok: false as const,
      response: jsonError(
        "Connector credentials are only available for customer organizations.",
        403,
      ),
    };
  }

  return { ok: true as const };
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
    organizationId?: string;
    providerKey?: string;
    displayName?: string;
    clientId?: string | null;
    clientSecret?: string | null;
    apiToken?: string | null;
    refreshToken?: string | null;
    tokenExpiresAt?: string | null;
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const organizationId = normalizeOptionalText(body.organizationId);
  const providerKey = normalizeOptionalText(body.providerKey);
  const displayName = normalizeOptionalText(body.displayName);
  const clientId = normalizeOptionalText(body.clientId);
  const clientSecret = normalizeOptionalText(body.clientSecret);
  const apiToken = normalizeOptionalText(body.apiToken);
  const refreshToken = normalizeOptionalText(body.refreshToken);
  const tokenExpiresAt = normalizeOptionalText(body.tokenExpiresAt);

  if (!organizationId) {
    return jsonError("organizationId is required.", 400);
  }

  if (!providerKey || !ALLOWED_PROVIDER_KEYS.has(providerKey)) {
    return jsonError("providerKey is invalid.", 400);
  }

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  if (providerUsesKeyAndSecret(providerKey)) {
    if (!clientId) return jsonError("clientId is required.", 400);
    if (!clientSecret) return jsonError("clientSecret is required.", 400);
  }

  if (providerUsesTokenAuth(providerKey)) {
    if (!apiToken) return jsonError("apiToken is required.", 400);
  }

  const access = await requireCustomerAdmin(supabase, organizationId, user.id);

  if (!access.ok) {
    return access.response;
  }

  const secretToEncrypt = providerUsesTokenAuth(providerKey)
    ? apiToken
    : clientSecret;

  if (!secretToEncrypt) {
    return jsonError("A secret value is required.", 400);
  }

  const encryptedSecret = encryptConnectorSecret(secretToEncrypt);

  const refreshTokenEncrypted = refreshToken
    ? encryptConnectorSecret(refreshToken)
    : null;

  const insertPayload = {
    organization_id: organizationId,
    provider_key: providerKey,
    auth_mode: getStoredAuthMode(providerKey),
    display_name: displayName,
    client_id: providerUsesTokenAuth(providerKey) ? null : clientId,
    client_secret_ciphertext: providerUsesTokenAuth(providerKey)
      ? null
      : encryptedSecret.ciphertext,
    client_secret_iv: providerUsesTokenAuth(providerKey) ? null : encryptedSecret.iv,
    client_secret_tag: providerUsesTokenAuth(providerKey)
      ? null
      : encryptedSecret.tag,
    access_token_ciphertext: providerUsesTokenAuth(providerKey)
      ? encryptedSecret.ciphertext
      : null,
    access_token_iv: providerUsesTokenAuth(providerKey) ? encryptedSecret.iv : null,
    access_token_tag: providerUsesTokenAuth(providerKey) ? encryptedSecret.tag : null,
    refresh_token_ciphertext: refreshTokenEncrypted?.ciphertext ?? null,
    refresh_token_iv: refreshTokenEncrypted?.iv ?? null,
    refresh_token_tag: refreshTokenEncrypted?.tag ?? null,
    token_expires_at: tokenExpiresAt || null,
    last_test_status: "pending",
    last_test_error: null,
    created_by_user_id: user.id,
    updated_by_user_id: user.id,
  };

  const insertResult = await supabase
    .from("internal_connector_profiles")
    .insert(insertPayload)
    .select(
      "id, organization_id, provider_key, auth_mode, display_name, client_id, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, last_tested_at, last_test_status, last_test_error, created_at, updated_at",
    )
    .single();

  if (insertResult.error) {
    return jsonError(insertResult.error.message, 500);
  }

  return NextResponse.json(
    {
      profile: {
        id: insertResult.data.id,
        organizationId: insertResult.data.organization_id,
        providerKey: insertResult.data.provider_key,
        authMode: insertResult.data.auth_mode,
        displayName: insertResult.data.display_name,
        clientIdPreview: maskProfilePreview(
          insertResult.data.provider_key,
          insertResult.data.client_id,
        ),
        hasSecret: Boolean(
          insertResult.data.client_id || insertResult.data.access_token_ciphertext,
        ),
        hasRefreshToken: Boolean(insertResult.data.refresh_token_ciphertext),
        tokenExpiresAt: insertResult.data.token_expires_at,
        lastTestedAt: insertResult.data.last_tested_at,
        lastTestStatus: insertResult.data.last_test_status,
        lastTestError: insertResult.data.last_test_error,
        createdAt: insertResult.data.created_at,
        updatedAt: insertResult.data.updated_at,
        connectionCount: 0,
      },
    },
    { status: 201 },
  );
}
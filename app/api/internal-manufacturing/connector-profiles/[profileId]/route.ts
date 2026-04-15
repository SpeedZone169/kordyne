import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptConnectorSecret } from "@/lib/internal-connectors/crypto";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

type ManagedProfileRow = {
  id: string;
  organization_id: string;
  provider_key: string;
  auth_mode: string | null;
  display_name: string;
  client_id: string | null;
  client_secret_ciphertext: string | null;
  client_secret_iv: string | null;
  client_secret_tag: string | null;
  access_token_ciphertext: string | null;
  access_token_iv: string | null;
  access_token_tag: string | null;
  refresh_token_ciphertext: string | null;
  refresh_token_iv: string | null;
  refresh_token_tag: string | null;
  token_expires_at: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
};

type UpdatedProfileRow = {
  id: string;
  organization_id: string;
  provider_key: string;
  auth_mode: string | null;
  display_name: string;
  client_id: string | null;
  refresh_token_ciphertext: string | null;
  token_expires_at: string | null;
  last_tested_at: string | null;
  last_test_status: string | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
};

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

async function getManagedProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  userId: string,
) {
  const profileResult = await supabase
    .from("internal_connector_profiles")
    .select(
      [
        "id",
        "organization_id",
        "provider_key",
        "auth_mode",
        "display_name",
        "client_id",
        "client_secret_ciphertext",
        "client_secret_iv",
        "client_secret_tag",
        "access_token_ciphertext",
        "access_token_iv",
        "access_token_tag",
        "refresh_token_ciphertext",
        "refresh_token_iv",
        "refresh_token_tag",
        "token_expires_at",
        "last_tested_at",
        "last_test_status",
        "last_test_error",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .eq("id", profileId)
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
      response: jsonError("Credential profile not found.", 404),
    };
  }

  const profile = profileResult.data as unknown as ManagedProfileRow;

  const membershipResult = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", profile.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipResult.error) {
    return {
      ok: false as const,
      response: jsonError(membershipResult.error.message, 500),
    };
  }

  if (!membershipResult.data || membershipResult.data.role !== "admin") {
    return {
      ok: false as const,
      response: jsonError(
        "Only customer organization admins can manage connector credentials.",
        403,
      ),
    };
  }

  return {
    ok: true as const,
    profile,
  };
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

  const { profileId } = await context.params;
  const managed = await getManagedProfile(supabase, profileId, user.id);

  if (!managed.ok) {
    return managed.response;
  }

  let body: {
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

  const displayName =
    normalizeOptionalText(body.displayName) ?? managed.profile.display_name;
  const clientId = normalizeOptionalText(body.clientId);
  const clientSecret = normalizeOptionalText(body.clientSecret);
  const apiToken = normalizeOptionalText(body.apiToken);
  const refreshToken = normalizeOptionalText(body.refreshToken);
  const tokenExpiresAt = normalizeOptionalText(body.tokenExpiresAt);

  if (!displayName) {
    return jsonError("displayName is required.", 400);
  }

  const providerKey = managed.profile.provider_key;
  const tokenAuth = providerUsesTokenAuth(providerKey);

  let nextClientId = managed.profile.client_id;
  let nextClientSecretCiphertext = managed.profile.client_secret_ciphertext;
  let nextClientSecretIv = managed.profile.client_secret_iv;
  let nextClientSecretTag = managed.profile.client_secret_tag;

  let nextAccessTokenCiphertext = managed.profile.access_token_ciphertext;
  let nextAccessTokenIv = managed.profile.access_token_iv;
  let nextAccessTokenTag = managed.profile.access_token_tag;

  let nextRefreshTokenCiphertext = managed.profile.refresh_token_ciphertext;
  let nextRefreshTokenIv = managed.profile.refresh_token_iv;
  let nextRefreshTokenTag = managed.profile.refresh_token_tag;

  let nextTokenExpiresAt =
    tokenExpiresAt !== null ? tokenExpiresAt : managed.profile.token_expires_at;

  if (tokenAuth) {
    if (apiToken) {
      const encryptedAccessToken = encryptConnectorSecret(apiToken);
      nextAccessTokenCiphertext = encryptedAccessToken.ciphertext;
      nextAccessTokenIv = encryptedAccessToken.iv;
      nextAccessTokenTag = encryptedAccessToken.tag;
    }

    if (refreshToken) {
      const encryptedRefreshToken = encryptConnectorSecret(refreshToken);
      nextRefreshTokenCiphertext = encryptedRefreshToken.ciphertext;
      nextRefreshTokenIv = encryptedRefreshToken.iv;
      nextRefreshTokenTag = encryptedRefreshToken.tag;
    }

    nextClientId = null;
    nextClientSecretCiphertext = null;
    nextClientSecretIv = null;
    nextClientSecretTag = null;
  } else {
    nextClientId = clientId ?? managed.profile.client_id;

    if (!nextClientId) {
      return jsonError("clientId is required.", 400);
    }

    if (clientSecret) {
      const encryptedSecret = encryptConnectorSecret(clientSecret);
      nextClientSecretCiphertext = encryptedSecret.ciphertext;
      nextClientSecretIv = encryptedSecret.iv;
      nextClientSecretTag = encryptedSecret.tag;
    }

    nextAccessTokenCiphertext = null;
    nextAccessTokenIv = null;
    nextAccessTokenTag = null;
    nextRefreshTokenCiphertext = null;
    nextRefreshTokenIv = null;
    nextRefreshTokenTag = null;
    nextTokenExpiresAt = null;
  }

  const updateResult = await supabase
    .from("internal_connector_profiles")
    .update({
      auth_mode: getStoredAuthMode(providerKey),
      display_name: displayName,
      client_id: nextClientId,
      client_secret_ciphertext: nextClientSecretCiphertext,
      client_secret_iv: nextClientSecretIv,
      client_secret_tag: nextClientSecretTag,
      access_token_ciphertext: nextAccessTokenCiphertext,
      access_token_iv: nextAccessTokenIv,
      access_token_tag: nextAccessTokenTag,
      refresh_token_ciphertext: nextRefreshTokenCiphertext,
      refresh_token_iv: nextRefreshTokenIv,
      refresh_token_tag: nextRefreshTokenTag,
      token_expires_at: nextTokenExpiresAt,
      updated_by_user_id: user.id,
      updated_at: new Date().toISOString(),
      last_test_status: "pending",
      last_test_error: null,
    })
    .eq("id", profileId)
    .select(
      [
        "id",
        "organization_id",
        "provider_key",
        "auth_mode",
        "display_name",
        "client_id",
        "refresh_token_ciphertext",
        "token_expires_at",
        "last_tested_at",
        "last_test_status",
        "last_test_error",
        "created_at",
        "updated_at",
      ].join(", "),
    )
    .single();

  if (updateResult.error) {
    return jsonError(updateResult.error.message, 500);
  }

  const updated = updateResult.data as unknown as UpdatedProfileRow;

  return NextResponse.json({
    profile: {
      id: updated.id,
      organizationId: updated.organization_id,
      providerKey: updated.provider_key,
      authMode: updated.auth_mode,
      displayName: updated.display_name,
      clientIdPreview: maskProfilePreview(updated.provider_key, updated.client_id),
      hasSecret: true,
      hasRefreshToken: Boolean(updated.refresh_token_ciphertext),
      tokenExpiresAt: updated.token_expires_at,
      lastTestedAt: updated.last_tested_at,
      lastTestStatus: updated.last_test_status,
      lastTestError: updated.last_test_error,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    },
  });
}
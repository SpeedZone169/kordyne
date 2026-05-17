import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  decryptConnectorSecret,
  encryptConnectorSecret,
} from "../internal-connectors/crypto";

export type OnshapeOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  oauthBaseUrl: string;
  cadBaseUrl: string;
  apiVersion: string;
};

export type OnshapeTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

type StoredOnshapeToken = {
  accessToken: string;
  profileId: string;
};

function envValue(...names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }

  return "";
}

function requestOrigin(requestUrl?: string) {
  if (requestUrl) {
    return new URL(requestUrl).origin;
  }

  return (
    envValue("APP_BASE_URL", "NEXT_PUBLIC_SITE_URL", "SITE_URL", "APP_URL") ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function onshapeApiUrl(baseUrl: string, version: string, path: string) {
  return `${baseUrl.replace(/\/$/, "")}/api/${version.replace(/^\/+/, "")}${
    path.startsWith("/") ? path : `/${path}`
  }`;
}

function tokenExpiresAt(expiresInSeconds?: number) {
  if (!expiresInSeconds || !Number.isFinite(expiresInSeconds)) return null;
  return new Date(Date.now() + expiresInSeconds * 1000).toISOString();
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function tokenErrorMessage(payload: OnshapeTokenResponse, fallback: string) {
  return payload.error_description || payload.error || fallback;
}

export function getOnshapeOAuthConfig(requestUrl?: string): OnshapeOAuthConfig {
  const clientId = envValue(
    "ONSHAPE_OAUTH_CLIENT_ID",
    "ONSHAPE_CLIENT_ID",
    "NEXT_PUBLIC_ONSHAPE_CLIENT_ID",
  );
  const clientSecret = envValue(
    "ONSHAPE_OAUTH_CLIENT_SECRET",
    "ONSHAPE_CLIENT_SECRET",
    "ONSHAPE",
  );

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing Onshape OAuth credentials. Add ONSHAPE_OAUTH_CLIENT_ID and ONSHAPE_OAUTH_CLIENT_SECRET to .env.local.",
    );
  }

  const origin = requestOrigin(requestUrl);
  const redirectUri =
    envValue("ONSHAPE_OAUTH_REDIRECT_URI", "ONSHAPE_REDIRECT_URI") ||
    `${origin}/api/design-app/onshape/oauth/callback`;

  return {
    clientId,
    clientSecret,
    redirectUri,
    oauthBaseUrl: envValue("ONSHAPE_OAUTH_BASE_URL") || "https://oauth.onshape.com",
    cadBaseUrl: envValue("ONSHAPE_BASE_URL") || "https://cad.onshape.com",
    apiVersion: envValue("ONSHAPE_API_VERSION") || "v11",
  };
}

export function buildOnshapeAuthorizeUrl(
  state: string,
  requestUrl?: string,
  extra?: { companyId?: string | null },
) {
  const config = getOnshapeOAuthConfig(requestUrl);
  const url = new URL("/oauth/authorize", config.oauthBaseUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);

  if (extra?.companyId) {
    url.searchParams.set("company_id", extra.companyId);
  }

  return url.toString();
}

export async function exchangeOnshapeAuthorizationCode(
  code: string,
  requestUrl?: string,
) {
  const config = getOnshapeOAuthConfig(requestUrl);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
  });

  const response = await fetch(new URL("/oauth/token", config.oauthBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  const payload = parseJson(text) as OnshapeTokenResponse;

  if (!response.ok) {
    throw new Error(
      tokenErrorMessage(payload, "Onshape authorization code exchange failed."),
    );
  }

  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Onshape did not return both access and refresh tokens.");
  }

  return payload;
}

export async function refreshOnshapeAccessToken(
  refreshToken: string,
  requestUrl?: string,
) {
  const config = getOnshapeOAuthConfig(requestUrl);
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  const response = await fetch(new URL("/oauth/token", config.oauthBaseUrl), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await response.text();
  const payload = parseJson(text) as OnshapeTokenResponse;

  if (!response.ok) {
    throw new Error(tokenErrorMessage(payload, "Onshape token refresh failed."));
  }

  if (!payload.access_token) {
    throw new Error("Onshape did not return a refreshed access token.");
  }

  return payload;
}

export async function storeOnshapeOAuthTokens(
  admin: SupabaseClient,
  input: {
    organizationId: string;
    userId: string;
    tokens: OnshapeTokenResponse;
    requestUrl?: string;
  },
) {
  if (!input.tokens.access_token || !input.tokens.refresh_token) {
    throw new Error("Cannot store incomplete Onshape OAuth tokens.");
  }

  const config = getOnshapeOAuthConfig(input.requestUrl);
  const encryptedAccessToken = encryptConnectorSecret(input.tokens.access_token);
  const encryptedRefreshToken = encryptConnectorSecret(
    input.tokens.refresh_token,
  );

  const { data: profile, error: profileError } = await admin
    .from("internal_connector_profiles")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("provider_key", "onshape")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  const row = {
    client_id: config.clientId,
    auth_mode: "oauth_authorization_code",
    access_token_ciphertext: encryptedAccessToken.ciphertext,
    access_token_iv: encryptedAccessToken.iv,
    access_token_tag: encryptedAccessToken.tag,
    refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
    refresh_token_iv: encryptedRefreshToken.iv,
    refresh_token_tag: encryptedRefreshToken.tag,
    token_expires_at: tokenExpiresAt(input.tokens.expires_in),
    last_tested_at: new Date().toISOString(),
    last_test_status: "succeeded",
    last_test_error: null,
    updated_by_user_id: input.userId,
    updated_at: new Date().toISOString(),
  };

  if (profile?.id) {
    const { error } = await admin
      .from("internal_connector_profiles")
      .update(row)
      .eq("id", profile.id);

    if (error) throw new Error(error.message);
    return profile.id as string;
  }

  const { data: inserted, error } = await admin
    .from("internal_connector_profiles")
    .insert({
      organization_id: input.organizationId,
      provider_key: "onshape",
      display_name: "Onshape OAuth",
      created_by_user_id: input.userId,
      ...row,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return inserted.id as string;
}

export async function getOnshapeOAuthGrantStatus(
  admin: SupabaseClient,
  organizationId: string,
) {
  const { data, error } = await admin
    .from("internal_connector_profiles")
    .select(
      "id, last_test_status, token_expires_at, access_token_ciphertext, refresh_token_ciphertext",
    )
    .eq("organization_id", organizationId)
    .eq("provider_key", "onshape")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    connected: Boolean(data?.refresh_token_ciphertext || data?.access_token_ciphertext),
    profile_id: data?.id ?? null,
    token_expires_at: data?.token_expires_at ?? null,
    last_test_status: data?.last_test_status ?? null,
  };
}

export async function loadOnshapeAccessToken(
  admin: SupabaseClient,
  organizationId: string,
  requestUrl?: string,
): Promise<StoredOnshapeToken | null> {
  const { data: profile, error } = await admin
    .from("internal_connector_profiles")
    .select(
      `
        id,
        access_token_ciphertext,
        access_token_iv,
        access_token_tag,
        refresh_token_ciphertext,
        refresh_token_iv,
        refresh_token_tag,
        token_expires_at
      `,
    )
    .eq("organization_id", organizationId)
    .eq("provider_key", "onshape")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) return null;

  const hasAccessToken =
    profile.access_token_ciphertext &&
    profile.access_token_iv &&
    profile.access_token_tag;
  const expiresAt = profile.token_expires_at
    ? new Date(profile.token_expires_at).getTime()
    : 0;
  const hasTimeLeft = expiresAt > Date.now() + 60 * 1000;

  if (hasAccessToken && hasTimeLeft) {
    return {
      profileId: profile.id,
      accessToken: decryptConnectorSecret({
        ciphertext: profile.access_token_ciphertext,
        iv: profile.access_token_iv,
        tag: profile.access_token_tag,
      }),
    };
  }

  if (
    !profile.refresh_token_ciphertext ||
    !profile.refresh_token_iv ||
    !profile.refresh_token_tag
  ) {
    return null;
  }

  const refreshToken = decryptConnectorSecret({
    ciphertext: profile.refresh_token_ciphertext,
    iv: profile.refresh_token_iv,
    tag: profile.refresh_token_tag,
  });
  const refreshed = await refreshOnshapeAccessToken(refreshToken, requestUrl);
  const encryptedAccessToken = encryptConnectorSecret(refreshed.access_token ?? "");
  const encryptedRefreshToken = encryptConnectorSecret(
    refreshed.refresh_token || refreshToken,
  );

  const { error: updateError } = await admin
    .from("internal_connector_profiles")
    .update({
      access_token_ciphertext: encryptedAccessToken.ciphertext,
      access_token_iv: encryptedAccessToken.iv,
      access_token_tag: encryptedAccessToken.tag,
      refresh_token_ciphertext: encryptedRefreshToken.ciphertext,
      refresh_token_iv: encryptedRefreshToken.iv,
      refresh_token_tag: encryptedRefreshToken.tag,
      token_expires_at: tokenExpiresAt(refreshed.expires_in),
      last_tested_at: new Date().toISOString(),
      last_test_status: "succeeded",
      last_test_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (updateError) throw new Error(updateError.message);

  return {
    profileId: profile.id,
    accessToken: refreshed.access_token ?? "",
  };
}

export function buildOnshapeApiUrl(
  config: OnshapeOAuthConfig,
  path: string,
) {
  return onshapeApiUrl(config.cadBaseUrl, config.apiVersion, path);
}

export function buildOnshapeDownloadUrl(path: string) {
  const cadBaseUrl = envValue("ONSHAPE_BASE_URL") || "https://cad.onshape.com";
  return onshapeApiUrl(cadBaseUrl, "v6", path);
}

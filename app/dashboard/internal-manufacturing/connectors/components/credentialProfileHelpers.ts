import type {
  InternalConnectorCredentialProfile,
  InternalConnectorProviderKey,
} from "../types";

export const creatableProviders = [
  "formlabs",
  "ultimaker",
  "markforged",
  "stratasys",
  "hp",
] as const satisfies readonly InternalConnectorProviderKey[];

export function getDefaultProfileName(providerKey: InternalConnectorProviderKey) {
  if (providerKey === "formlabs") return "Primary Formlabs Account";
  if (providerKey === "ultimaker") return "Primary Ultimaker Account";
  if (providerKey === "markforged") return "Primary Markforged Account";
  if (providerKey === "stratasys") return "Primary Stratasys Account";
  if (providerKey === "hp") return "Primary HP Account";
  return "Primary Provider Account";
}

export function getProfileDisplaySecondary(
  profile: InternalConnectorCredentialProfile,
  formatDateTime: (value?: string | null) => string,
  formatLabel: (value: string) => string,
) {
  if (profile.providerKey === "ultimaker") {
    if (profile.tokenExpiresAt) {
      return `Token expires ${formatDateTime(profile.tokenExpiresAt)}`;
    }

    return profile.authMode ? `Auth: ${formatLabel(profile.authMode)}` : "Token auth";
  }

  return profile.clientIdPreview || "Stored credentials";
}

export function buildCreateProfileBody(input: {
  organizationId: string | null;
  providerKey: InternalConnectorProviderKey;
  displayName: string;
  clientId: string;
  clientSecret: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}) {
  const { organizationId, providerKey, displayName } = input;

  return {
    organizationId,
    providerKey,
    displayName,
    authMode: providerKey === "ultimaker" ? "oauth" : "api_key",
    clientId: providerKey === "ultimaker" ? null : input.clientId,
    clientSecret: providerKey === "ultimaker" ? null : input.clientSecret,
    accessToken: providerKey === "ultimaker" ? input.accessToken : null,
    refreshToken: providerKey === "ultimaker" ? input.refreshToken || null : null,
    tokenExpiresAt:
      providerKey === "ultimaker" ? input.tokenExpiresAt || null : null,
  };
}

export function buildUpdateProfileBody(input: {
  editProviderKey: InternalConnectorProviderKey;
  editDisplayName: string;
  editClientId: string;
  editClientSecret: string;
  editAccessToken: string;
  editRefreshToken: string;
  editTokenExpiresAt: string;
}) {
  const { editProviderKey } = input;

  return {
    displayName: input.editDisplayName,
    providerKey: editProviderKey,
    authMode: editProviderKey === "ultimaker" ? "oauth" : "api_key",
    clientId: editProviderKey === "ultimaker" ? null : input.editClientId || null,
    clientSecret:
      editProviderKey === "ultimaker" ? null : input.editClientSecret || null,
    accessToken:
      editProviderKey === "ultimaker" ? input.editAccessToken || null : null,
    refreshToken:
      editProviderKey === "ultimaker" ? input.editRefreshToken || null : null,
    tokenExpiresAt:
      editProviderKey === "ultimaker" ? input.editTokenExpiresAt || null : null,
  };
}
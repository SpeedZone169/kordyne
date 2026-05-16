import type {
  DesignConnectionMode,
  DesignConnectorProvider,
  DesignSyncScopeType,
} from "./types";

export const DESIGN_CONNECTOR_AUTH_MODE_OPTIONS = [
  { value: "oauth_authorization_code", label: "OAuth Authorization Code" },
  { value: "client_credentials", label: "Client Credentials" },
  { value: "api_token", label: "API Token" },
] as const;

export type DesignConnectorAuthMode =
  (typeof DESIGN_CONNECTOR_AUTH_MODE_OPTIONS)[number]["value"];

export type DesignConnectorRuntime =
  | "desktop_addin"
  | "desktop_helper"
  | "cloud_api"
  | "web_handoff";

export type DesignConnectorCapability =
  | "profile_test"
  | "discover_scopes"
  | "discover_items"
  | "metadata"
  | "versions"
  | "publish"
  | "compare"
  | "sync"
  | "desktop_handoff"
  | "web_handoff"
  | "package_download";

export type DesignConnectorProviderStatus =
  | "live"
  | "preview"
  | "mock"
  | "planned";

export type DesignConnectorDistributionKind =
  | "msi"
  | "cloud_api"
  | "not_applicable";

export type DesignConnectorCollaborationScope = "part" | "project" | "request";

export type DesignConnectorRegulatedWorkspaceField =
  | "itar"
  | "ear_eccn"
  | "controlled_data"
  | "us_person_only";

export type DesignConnectorSecurityPolicy = {
  distributionKind: DesignConnectorDistributionKind;
  requiresSignedInstaller: boolean;
  requiresSignedRuntime: boolean;
  requiresReleaseChecksum: boolean;
  blocksUnsignedUpdates: boolean;
  allowsStaticSecretsInInstaller: boolean;
  tokenStorage: readonly string[];
  controlledReleaseRequired: boolean;
  supplierAuditGateRequired: boolean;
  regulatedWorkspaceFields: readonly DesignConnectorRegulatedWorkspaceField[];
  collaborationScopes: readonly DesignConnectorCollaborationScope[];
};

export type DesignConnectorProviderDefinition = {
  key: DesignConnectorProvider;
  label: string;
  status: DesignConnectorProviderStatus;
  statusLabel: string;
  description: string;
  defaultAuthMode: DesignConnectorAuthMode;
  authModes: readonly DesignConnectorAuthMode[];
  defaultConnectionMode: DesignConnectionMode;
  defaultScopeType: DesignSyncScopeType;
  scopeTypes: readonly DesignSyncScopeType[];
  runtimes: readonly DesignConnectorRuntime[];
  capabilities: readonly DesignConnectorCapability[];
  security: DesignConnectorSecurityPolicy;
  downloadRoute?: string;
};

const REGULATED_WORKSPACE_FIELDS: readonly DesignConnectorRegulatedWorkspaceField[] =
  ["itar", "ear_eccn", "controlled_data", "us_person_only"];

const COLLABORATION_SCOPES: readonly DesignConnectorCollaborationScope[] = [
  "part",
  "project",
  "request",
];

const DESKTOP_MSI_SECURITY_POLICY: DesignConnectorSecurityPolicy = {
  distributionKind: "msi",
  requiresSignedInstaller: true,
  requiresSignedRuntime: true,
  requiresReleaseChecksum: true,
  blocksUnsignedUpdates: true,
  allowsStaticSecretsInInstaller: false,
  tokenStorage: ["windows_dpapi", "credential_manager", "encrypted_oauth_vault"],
  controlledReleaseRequired: true,
  supplierAuditGateRequired: true,
  regulatedWorkspaceFields: REGULATED_WORKSPACE_FIELDS,
  collaborationScopes: COLLABORATION_SCOPES,
};

const CLOUD_CONNECTOR_SECURITY_POLICY: DesignConnectorSecurityPolicy = {
  distributionKind: "cloud_api",
  requiresSignedInstaller: false,
  requiresSignedRuntime: false,
  requiresReleaseChecksum: false,
  blocksUnsignedUpdates: true,
  allowsStaticSecretsInInstaller: false,
  tokenStorage: ["encrypted_oauth_vault"],
  controlledReleaseRequired: true,
  supplierAuditGateRequired: true,
  regulatedWorkspaceFields: REGULATED_WORKSPACE_FIELDS,
  collaborationScopes: COLLABORATION_SCOPES,
};

export const DESIGN_CONNECTOR_PROVIDER_DEFINITIONS: Record<
  DesignConnectorProvider,
  DesignConnectorProviderDefinition
> = {
  fusion: {
    key: "fusion",
    label: "Fusion",
    status: "live",
    statusLabel: "Live",
    description: "Desktop add-in connector for Fusion design publish and pull flows.",
    defaultAuthMode: "oauth_authorization_code",
    authModes: ["oauth_authorization_code"],
    defaultConnectionMode: "bidirectional",
    defaultScopeType: "project",
    scopeTypes: ["project", "folder", "document", "manual"],
    runtimes: ["desktop_addin", "desktop_helper"],
    capabilities: [
      "profile_test",
      "publish",
      "compare",
      "sync",
      "desktop_handoff",
      "package_download",
    ],
    security: DESKTOP_MSI_SECURITY_POLICY,
    downloadRoute: "/api/design-connectors/fusion/download",
  },
  inventor: {
    key: "inventor",
    label: "Inventor",
    status: "preview",
    statusLabel: "Preview",
    description: "Desktop add-in connector for Inventor native file handoff.",
    defaultAuthMode: "oauth_authorization_code",
    authModes: ["oauth_authorization_code"],
    defaultConnectionMode: "bidirectional",
    defaultScopeType: "project",
    scopeTypes: ["project", "folder", "document", "manual"],
    runtimes: ["desktop_addin", "desktop_helper"],
    capabilities: [
      "profile_test",
      "publish",
      "compare",
      "sync",
      "desktop_handoff",
      "package_download",
    ],
    security: DESKTOP_MSI_SECURITY_POLICY,
    downloadRoute: "/api/design-connectors/inventor/download",
  },
  solidworks: {
    key: "solidworks",
    label: "SolidWorks",
    status: "mock",
    statusLabel: "Mocked",
    description: "Mock adapter for validating the desktop helper contract.",
    defaultAuthMode: "oauth_authorization_code",
    authModes: ["oauth_authorization_code", "api_token"],
    defaultConnectionMode: "bidirectional",
    defaultScopeType: "project",
    scopeTypes: ["project", "folder", "document", "manual"],
    runtimes: ["desktop_addin", "desktop_helper"],
    capabilities: [
      "profile_test",
      "discover_scopes",
      "discover_items",
      "metadata",
      "versions",
      "compare",
      "sync",
      "desktop_handoff",
    ],
    security: DESKTOP_MSI_SECURITY_POLICY,
  },
  onshape: {
    key: "onshape",
    label: "Onshape",
    status: "preview",
    statusLabel: "Preview",
    description:
      "Cloud CAD connector runtime for OAuth-backed Onshape document handoff.",
    defaultAuthMode: "oauth_authorization_code",
    authModes: ["oauth_authorization_code", "api_token"],
    defaultConnectionMode: "bidirectional",
    defaultScopeType: "document",
    scopeTypes: ["workspace", "document", "item", "manual"],
    runtimes: ["cloud_api", "web_handoff"],
    capabilities: [
      "profile_test",
      "discover_scopes",
      "discover_items",
      "metadata",
      "versions",
      "publish",
      "compare",
      "sync",
      "web_handoff",
    ],
    security: CLOUD_CONNECTOR_SECURITY_POLICY,
  },
};

export const DESIGN_CONNECTOR_PROVIDER_LIST = [
  DESIGN_CONNECTOR_PROVIDER_DEFINITIONS.fusion,
  DESIGN_CONNECTOR_PROVIDER_DEFINITIONS.inventor,
  DESIGN_CONNECTOR_PROVIDER_DEFINITIONS.solidworks,
  DESIGN_CONNECTOR_PROVIDER_DEFINITIONS.onshape,
] as const;

export function getDesignConnectorProviderDefinition(providerKey: string) {
  return DESIGN_CONNECTOR_PROVIDER_DEFINITIONS[
    providerKey as DesignConnectorProvider
  ];
}

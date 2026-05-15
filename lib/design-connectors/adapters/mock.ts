import type {
  DesignAppCompareInput,
  DesignAppPublishInput,
  DesignConnectorProfileRecord,
  DesignConnectorProvider,
  TestDesignConnectorResult,
} from "../types";
import type { DesignConnectorAuthMode } from "../contract";
import type {
  DesignCompareResult,
  DesignConnectorAdapter,
  DesignDiscoveredItem,
  DesignDiscoveredScope,
  DesignItemMetadata,
  DesignPublishResult,
  DesignSyncInput,
  DesignSyncResult,
  DesignVersionRecord,
} from "./base";

type MockAdapterConfig = {
  providerKey: DesignConnectorProvider;
  providerLabel: string;
  supportedAuthModes: readonly DesignConnectorAuthMode[];
  requireClientIdForOAuth?: boolean;
  scopes: readonly DesignDiscoveredScope[];
  items: readonly DesignDiscoveredItem[];
  versions: readonly DesignVersionRecord[];
};

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function metadataValue(
  metadata: Record<string, unknown> | undefined,
  key: string,
) {
  const value = metadata?.[key];
  return typeof value === "string" ? value : null;
}

function matchesScope(
  item: DesignDiscoveredItem,
  input: {
    scope_type: string;
    scope_external_id?: string | null;
  },
) {
  const scopeType = normalize(input.scope_type);
  const scopeId = input.scope_external_id?.trim();

  if (!scopeId || scopeType === "manual") {
    return true;
  }

  if (scopeType === "workspace") {
    return item.workspace_id === scopeId;
  }

  if (scopeType === "project") {
    return item.project_id === scopeId;
  }

  if (scopeType === "folder") {
    return metadataValue(item.metadata, "folder_id") === scopeId;
  }

  if (scopeType === "document") {
    return item.document_id === scopeId;
  }

  if (scopeType === "item") {
    return item.id === scopeId;
  }

  return true;
}

function matchesQuery(item: DesignDiscoveredItem, query?: string | null) {
  const q = normalize(query);
  if (!q) return true;

  return (
    normalize(item.name).includes(q) ||
    normalize(item.id).includes(q) ||
    normalize(item.item_type).includes(q) ||
    normalize(item.metadata?.part_number).includes(q)
  );
}

function findItem(
  items: readonly DesignDiscoveredItem[],
  input: {
    external_document_id?: string | null;
    external_item_id?: string | null;
    external_version_id?: string | null;
  },
) {
  return (
    items.find((item) => {
      if (
        input.external_item_id &&
        item.id !== input.external_item_id &&
        metadataValue(item.metadata, "element_id") !== input.external_item_id
      ) {
        return false;
      }

      if (
        input.external_document_id &&
        item.document_id !== input.external_document_id
      ) {
        return false;
      }

      if (
        input.external_version_id &&
        item.version_id !== input.external_version_id
      ) {
        return false;
      }

      return true;
    }) ?? null
  );
}

export class MockDesignConnectorAdapter implements DesignConnectorAdapter {
  readonly providerKey: DesignConnectorProvider;

  private readonly config: MockAdapterConfig;

  constructor(config: MockAdapterConfig) {
    this.providerKey = config.providerKey;
    this.config = config;
  }

  async testProfile(
    profile: DesignConnectorProfileRecord,
  ): Promise<TestDesignConnectorResult> {
    const authMode =
      (profile.auth_mode as DesignConnectorAuthMode | null) ??
      "oauth_authorization_code";
    const supportedAuth = this.config.supportedAuthModes.includes(authMode);
    const needsClientId =
      authMode === "oauth_authorization_code" &&
      this.config.requireClientIdForOAuth !== false;
    const hasClientId = Boolean(profile.client_id);
    const ok = supportedAuth && (!needsClientId || hasClientId);

    return {
      ok,
      provider_key: this.providerKey,
      profile_id: profile.id,
      message: ok
        ? `${this.config.providerLabel} profile is ready for mock connector flows.`
        : `${this.config.providerLabel} profile needs ${
            supportedAuth ? "a client_id" : "a supported auth mode"
          } before live API wiring.`,
      details: {
        adapter_mode: "mock",
        auth_mode: authMode,
        supported_auth: supportedAuth,
        has_client_id: hasClientId,
        token_expires_at: profile.token_expires_at,
      },
    };
  }

  async discoverScopes(): Promise<DesignDiscoveredScope[]> {
    return [...this.config.scopes];
  }

  async discoverItems(
    _profile: DesignConnectorProfileRecord,
    input: {
      scope_type: string;
      scope_external_id?: string | null;
      query?: string | null;
    },
  ): Promise<DesignDiscoveredItem[]> {
    void _profile;

    return this.config.items.filter(
      (item) => matchesScope(item, input) && matchesQuery(item, input.query),
    );
  }

  async getItemMetadata(
    _profile: DesignConnectorProfileRecord,
    input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
      external_version_id?: string | null;
    },
  ): Promise<DesignItemMetadata | null> {
    void _profile;

    const item = findItem(this.config.items, input);
    if (!item) return null;

    return {
      external_name: item.name,
      external_url: item.external_url ?? null,
      part_number: metadataValue(item.metadata, "part_number"),
      revision: item.revision_id ?? null,
      description: metadataValue(item.metadata, "description"),
      units: metadataValue(item.metadata, "units"),
      material: metadataValue(item.metadata, "material"),
      item_type: item.item_type ?? null,
      metadata: item.metadata ?? {},
    };
  }

  async getVersions(
    _profile: DesignConnectorProfileRecord,
    input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
    },
  ): Promise<DesignVersionRecord[]> {
    void _profile;

    const item = findItem(this.config.items, input);
    if (!item) return [];

    return this.config.versions.filter((version) => {
      const documentId = metadataValue(version.metadata, "document_id");
      const itemId = metadataValue(version.metadata, "item_id");

      return documentId === item.document_id || itemId === item.id;
    });
  }

  async publish(
    _profile: DesignConnectorProfileRecord,
    input: DesignAppPublishInput,
  ): Promise<DesignPublishResult> {
    void _profile;

    return {
      ok: true,
      provider_key: this.providerKey,
      message: `${this.config.providerLabel} mock publish payload accepted.`,
      external_ref: {
        workspace_id: input.external_workspace_id ?? null,
        project_id: input.external_project_id ?? null,
        document_id: input.external_document_id ?? null,
        item_id: input.external_item_id ?? null,
        version_id: input.external_version_id ?? null,
        revision_id: input.external_revision_id ?? null,
        name: input.external_name ?? null,
        url: input.external_url ?? null,
      },
      metadata: {
        adapter_mode: "mock",
        received_metadata: input.metadata ?? {},
        file_count: input.files?.length ?? 0,
      },
    };
  }

  async compare(
    _profile: DesignConnectorProfileRecord,
    input: DesignAppCompareInput,
  ): Promise<DesignCompareResult> {
    void _profile;

    const item = findItem(this.config.items, input);

    return {
      ok: true,
      provider_key: this.providerKey,
      message: `${this.config.providerLabel} mock compare completed.`,
      summary: {
        changed_fields: [],
        current_part_id: input.part_id ?? null,
        external_version_id: input.external_version_id ?? item?.version_id ?? null,
      },
      details: {
        adapter_mode: "mock",
        matched_item: item ?? null,
        metadata: input.metadata ?? {},
      },
    };
  }

  async sync(
    profile: DesignConnectorProfileRecord,
    input: DesignSyncInput,
  ): Promise<DesignSyncResult> {
    const items = await this.discoverItems(profile, {
      scope_type: input.sync_scope_type,
      scope_external_id: input.sync_scope_external_id,
      query:
        typeof input.summary?.query === "string"
          ? input.summary.query
          : undefined,
    });

    return {
      ok: true,
      provider_key: this.providerKey,
      message: `${this.config.providerLabel} mock sync discovered ${items.length} item${
        items.length === 1 ? "" : "s"
      }.`,
      items,
      summary: {
        adapter_mode: "mock",
        scope_type: input.sync_scope_type,
        scope_external_id: input.sync_scope_external_id ?? null,
        scope_label: input.sync_scope_label ?? null,
        discovered_item_count: items.length,
      },
    };
  }
}

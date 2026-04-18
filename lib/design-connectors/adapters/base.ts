import type {
  DesignAppCompareInput,
  DesignAppPublishInput,
  DesignConnectorProfileRecord,
  DesignConnectorProvider,
  TestDesignConnectorResult,
} from "../types";

export type DesignDiscoveredScope = {
  id: string;
  label: string;
  scope_type: string;
  metadata?: Record<string, unknown>;
};

export type DesignDiscoveredItem = {
  id: string;
  name: string;
  item_type?: string | null;
  version_id?: string | null;
  revision_id?: string | null;
  workspace_id?: string | null;
  project_id?: string | null;
  document_id?: string | null;
  external_url?: string | null;
  metadata?: Record<string, unknown>;
};

export type DesignItemMetadata = {
  external_name?: string | null;
  external_url?: string | null;
  part_number?: string | null;
  revision?: string | null;
  description?: string | null;
  units?: string | null;
  material?: string | null;
  item_type?: string | null;
  metadata?: Record<string, unknown>;
};

export type DesignVersionRecord = {
  id: string;
  label?: string | null;
  revision?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type DesignCompareResult = {
  ok: boolean;
  provider_key: DesignConnectorProvider | string;
  message: string;
  summary?: {
    changed_fields?: string[];
    current_part_id?: string | null;
    external_version_id?: string | null;
  };
  details?: Record<string, unknown>;
};

export type DesignPublishResult = {
  ok: boolean;
  provider_key: DesignConnectorProvider | string;
  message: string;
  external_ref?: {
    workspace_id?: string | null;
    project_id?: string | null;
    document_id?: string | null;
    item_id?: string | null;
    version_id?: string | null;
    revision_id?: string | null;
    name?: string | null;
    url?: string | null;
  };
  metadata?: Record<string, unknown>;
};

export interface DesignConnectorAdapter {
  readonly providerKey: DesignConnectorProvider | string;

  testProfile(
    profile: DesignConnectorProfileRecord,
  ): Promise<TestDesignConnectorResult>;

  discoverScopes?(
    profile: DesignConnectorProfileRecord,
  ): Promise<DesignDiscoveredScope[]>;

  discoverItems?(
    profile: DesignConnectorProfileRecord,
    input: {
      scope_type: string;
      scope_external_id?: string | null;
      query?: string | null;
    },
  ): Promise<DesignDiscoveredItem[]>;

  getItemMetadata?(
    profile: DesignConnectorProfileRecord,
    input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
      external_version_id?: string | null;
    },
  ): Promise<DesignItemMetadata | null>;

  getVersions?(
    profile: DesignConnectorProfileRecord,
    input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
    },
  ): Promise<DesignVersionRecord[]>;

  publish?(
    profile: DesignConnectorProfileRecord,
    input: DesignAppPublishInput,
  ): Promise<DesignPublishResult>;

  compare?(
    profile: DesignConnectorProfileRecord,
    input: DesignAppCompareInput,
  ): Promise<DesignCompareResult>;
}

export class UnsupportedDesignConnectorAdapter
  implements DesignConnectorAdapter
{
  readonly providerKey: DesignConnectorProvider | string;

  constructor(providerKey: DesignConnectorProvider | string) {
    this.providerKey = providerKey;
  }

  async testProfile(
    profile: DesignConnectorProfileRecord,
  ): Promise<TestDesignConnectorResult> {
    return {
      ok: false,
      provider_key: profile.provider_key,
      profile_id: profile.id,
      message: `Provider '${profile.provider_key}' is not implemented yet.`,
    };
  }
}

export function assertAdapterMethod<T>(
  value: T | undefined,
  methodName: string,
  providerKey: string,
): T {
  if (!value) {
    throw new Error(
      `Adapter method '${methodName}' is not implemented for provider '${providerKey}'.`,
    );
  }

  return value;
}
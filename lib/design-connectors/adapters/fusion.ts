import type {
  DesignAppCompareInput,
  DesignAppPublishInput,
  DesignConnectorProfileRecord,
  TestDesignConnectorResult,
} from "../types";
import type {
  DesignCompareResult,
  DesignConnectorAdapter,
  DesignDiscoveredItem,
  DesignDiscoveredScope,
  DesignItemMetadata,
  DesignPublishResult,
  DesignVersionRecord,
} from "./base";

export class FusionDesignConnectorAdapter implements DesignConnectorAdapter {
  readonly providerKey = "fusion" as const;

  async testProfile(
    profile: DesignConnectorProfileRecord,
  ): Promise<TestDesignConnectorResult> {
    const hasClientId = Boolean(profile.client_id);

    return {
      ok: hasClientId,
      provider_key: this.providerKey,
      profile_id: profile.id,
      message: hasClientId
        ? "Fusion profile looks structurally valid."
        : "Fusion profile is missing client_id.",
      details: {
        auth_mode: profile.auth_mode,
        has_client_id: hasClientId,
        token_expires_at: profile.token_expires_at,
      },
    };
  }

  async discoverScopes(
    _profile: DesignConnectorProfileRecord,
  ): Promise<DesignDiscoveredScope[]> {
    return [];
  }

  async discoverItems(
    _profile: DesignConnectorProfileRecord,
    _input: {
      scope_type: string;
      scope_external_id?: string | null;
      query?: string | null;
    },
  ): Promise<DesignDiscoveredItem[]> {
    return [];
  }

  async getItemMetadata(
    _profile: DesignConnectorProfileRecord,
    input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
      external_version_id?: string | null;
    },
  ): Promise<DesignItemMetadata | null> {
    return {
      external_name: null,
      external_url: null,
      item_type: "design",
      metadata: {
        external_document_id: input.external_document_id ?? null,
        external_item_id: input.external_item_id ?? null,
        external_version_id: input.external_version_id ?? null,
      },
    };
  }

  async getVersions(
    _profile: DesignConnectorProfileRecord,
    _input: {
      external_document_id?: string | null;
      external_item_id?: string | null;
    },
  ): Promise<DesignVersionRecord[]> {
    return [];
  }

  async publish(
    _profile: DesignConnectorProfileRecord,
    input: DesignAppPublishInput,
  ): Promise<DesignPublishResult> {
    return {
      ok: true,
      provider_key: this.providerKey,
      message: "Fusion publish payload accepted by adapter stub.",
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
        received_metadata: input.metadata ?? {},
        file_count: input.files?.length ?? 0,
      },
    };
  }

  async compare(
    _profile: DesignConnectorProfileRecord,
    input: DesignAppCompareInput,
  ): Promise<DesignCompareResult> {
    return {
      ok: true,
      provider_key: this.providerKey,
      message: "Fusion compare stub completed.",
      summary: {
        changed_fields: [],
        current_part_id: input.part_id ?? null,
        external_version_id: input.external_version_id ?? null,
      },
      details: {
        compared_provider: this.providerKey,
        external_document_id: input.external_document_id ?? null,
        external_item_id: input.external_item_id ?? null,
        metadata: input.metadata ?? {},
      },
    };
  }
}

export const fusionDesignConnectorAdapter =
  new FusionDesignConnectorAdapter();
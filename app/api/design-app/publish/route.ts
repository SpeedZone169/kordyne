import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../lib/design-app/admin";

type PublishInput = {
  provider_key?: string;
  connector_id?: string;
  part_id?: string | null;
  external_workspace_id?: string | null;
  external_project_id?: string | null;
  external_document_id?: string | null;
  external_item_id?: string | null;
  external_version_id?: string | null;
  external_revision_id?: string | null;
  external_name?: string | null;
  external_url?: string | null;
  metadata?: {
    publish_mode?: string | null;
    name?: string | null;
    part_number?: string | null;
    description?: string | null;
    process_type?: string | null;
    material?: string | null;
    revision_scheme?: string | null;
    category?: string | null;
    status?: string | null;
    revision_note?: string | null;
    source?: string | null;
  } | null;
  files?: Array<{
    role?: string | null;
    filename?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    storage_path?: string | null;
  }> | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isAllowedPublishMode(value: string) {
  return value === "new_family" || value === "new_revision";
}

function isAllowedProvider(value: string) {
  return value === "fusion";
}

function isAllowedRevisionScheme(value: string) {
  return value === "alphabetic" || value === "numeric";
}

function validateStoragePathPrefix(
  storagePath: string,
  organizationId: string,
  userId: string,
) {
  const expectedPrefix = `design-app/${organizationId}/${userId}/`;
  return storagePath.startsWith(expectedPrefix);
}

function inferAssetCategory(role: string) {
  if (role === "step") return "cad_3d";
  return "other";
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request);
    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();
    const input = (await request.json()) as PublishInput;

    const providerKey = asString(input.provider_key) || "fusion";
    const connectorId = asString(input.connector_id);
    const publishMode = asString(input.metadata?.publish_mode) || "new_family";
    const partName =
      asString(input.metadata?.name) ||
      asString(input.external_name) ||
      "Unnamed Part";
    const partNumber = asString(input.metadata?.part_number) || null;
    const description = asString(input.metadata?.description) || null;
    const processType = asString(input.metadata?.process_type) || null;
    const material = asString(input.metadata?.material) || null;
    const revisionScheme =
      asString(input.metadata?.revision_scheme) || "alphabetic";
    const category = asString(input.metadata?.category) || null;
    const status = asString(input.metadata?.status) || "draft";
    const revisionNote = asString(input.metadata?.revision_note) || null;
    const externalName = asString(input.external_name) || partName || null;
    const externalUrl = asString(input.external_url) || null;

    if (!isAllowedProvider(providerKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported provider_key.",
        },
        { status: 400 },
      );
    }

    if (!connectorId) {
      return NextResponse.json(
        {
          ok: false,
          error: "connector_id is required.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedPublishMode(publishMode)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported publish mode.",
        },
        { status: 400 },
      );
    }

    if (!isAllowedRevisionScheme(revisionScheme)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported revision scheme.",
        },
        { status: 400 },
      );
    }

    const { data: connector, error: connectorError } = await ctx.supabase
      .from("design_connectors")
      .select("id, organization_id, provider_key, is_enabled")
      .eq("id", connectorId)
      .eq("organization_id", ctx.organizationId)
      .eq("provider_key", providerKey)
      .maybeSingle();

    if (connectorError) {
      return NextResponse.json(
        {
          ok: false,
          error: connectorError.message,
        },
        { status: 500 },
      );
    }

    if (!connector || connector.is_enabled === false) {
      return NextResponse.json(
        {
          ok: false,
          error: "Connector not found or not enabled for this organization.",
        },
        { status: 403 },
      );
    }

    const files = input.files ?? [];

    for (const file of files) {
      const storagePath = asString(file.storage_path);
      if (!storagePath) {
        return NextResponse.json(
          {
            ok: false,
            error: "Every file must include storage_path.",
          },
          { status: 400 },
        );
      }

      if (!validateStoragePathPrefix(storagePath, ctx.organizationId, ctx.user.id)) {
        return NextResponse.json(
          {
            ok: false,
            error: "File path is outside the allowed design-app upload scope.",
          },
          { status: 403 },
        );
      }

      const role = asString(file.role).toLowerCase();
      if (role !== "step") {
        return NextResponse.json(
          {
            ok: false,
            error: "Only STEP files can be published from this flow.",
          },
          { status: 400 },
        );
      }
    }

    let partId: string | null = null;

    if (publishMode === "new_revision") {
      const sourcePartId = asString(input.part_id);

      if (!sourcePartId) {
        return NextResponse.json(
          {
            ok: false,
            error: "part_id is required for new revision publish.",
          },
          { status: 400 },
        );
      }

      const { data: sourcePart, error: sourcePartError } = await ctx.supabase
        .from("parts")
        .select("id, organization_id, part_family_id")
        .eq("id", sourcePartId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (sourcePartError) {
        return NextResponse.json(
          {
            ok: false,
            error: sourcePartError.message,
          },
          { status: 500 },
        );
      }

      if (!sourcePart?.id) {
        return NextResponse.json(
          {
            ok: false,
            error: "Target part not found.",
          },
          { status: 404 },
        );
      }

      const { data: newPartId, error: revisionError } = await ctx.supabase.rpc(
        "create_part_revision",
        {
          p_source_part_id: sourcePartId,
          p_revision_note: revisionNote,
        },
      );

      if (revisionError || !newPartId) {
        return NextResponse.json(
          {
            ok: false,
            error: revisionError?.message ?? "Failed to create revision.",
          },
          { status: 500 },
        );
      }

      partId = String(newPartId);

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (partName) updates.name = partName;
      if (partNumber !== null) updates.part_number = partNumber;
      if (description !== null) updates.description = description;
      if (processType !== null) updates.process_type = processType;
      if (material !== null) updates.material = material;
      if (category !== null) updates.category = category;
      if (status) updates.status = status;

      const { error: partUpdateError } = await admin
        .from("parts")
        .update(updates)
        .eq("id", partId)
        .eq("organization_id", ctx.organizationId);

      if (partUpdateError) {
        return NextResponse.json(
          {
            ok: false,
            error: partUpdateError.message,
          },
          { status: 500 },
        );
      }
    } else {
      const { data: newPartId, error: createPartError } = await ctx.supabase.rpc(
        "create_part_with_family",
        {
          p_name: partName,
          p_part_number: partNumber,
          p_description: description,
          p_process_type: processType,
          p_material: material,
          p_revision_scheme: revisionScheme,
          p_category: category,
          p_status: status,
        },
      );

      if (createPartError || !newPartId) {
        return NextResponse.json(
          {
            ok: false,
            error: createPartError?.message ?? "Failed to create part.",
          },
          { status: 500 },
        );
      }

      partId = String(newPartId);
    }

    const { data: createdPart, error: createdPartError } = await ctx.supabase
      .from("parts")
      .select("id, organization_id, part_family_id, revision_index, revision, name, status")
      .eq("id", partId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (createdPartError) {
      return NextResponse.json(
        {
          ok: false,
          error: createdPartError.message,
        },
        { status: 500 },
      );
    }

    if (!createdPart?.id || !createdPart.part_family_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Created part could not be loaded.",
        },
        { status: 500 },
      );
    }

    for (const file of files) {
      const role = asString(file.role).toLowerCase();

      const { error: partFileError } = await admin
        .from("part_files")
        .insert({
          part_id: createdPart.id,
          user_id: ctx.user.id,
          file_name: asString(file.filename) || "Unnamed file",
          file_type: asString(file.mime_type) || "application/octet-stream",
          asset_category: inferAssetCategory(role),
          storage_path: asString(file.storage_path),
          file_size_bytes:
            typeof file.size_bytes === "number" ? file.size_bytes : null,
        });

      if (partFileError) {
        return NextResponse.json(
          {
            ok: false,
            error: partFileError.message,
          },
          { status: 500 },
        );
      }
    }

    const partSourceMetadata = {
      source: "fusion_addin_publish",
      publish_mode: publishMode,
      uploaded_file_count: files.length,
      uploaded_roles: files.map((file) => asString(file.role).toLowerCase()),
    };

    const { data: insertedSourceLink, error: sourceLinkError } = await admin
      .from("part_source_links")
      .insert({
        organization_id: ctx.organizationId,
        provider_key: providerKey,
        credential_profile_id: null,
        design_connector_id: connectorId,
        part_family_id: createdPart.part_family_id,
        part_id: createdPart.id,
        external_workspace_id: asString(input.external_workspace_id) || null,
        external_project_id: asString(input.external_project_id) || null,
        external_document_id: asString(input.external_document_id) || null,
        external_item_id: asString(input.external_item_id) || null,
        external_version_id: asString(input.external_version_id) || null,
        external_revision_id: asString(input.external_revision_id) || null,
        external_name: externalName,
        external_url: externalUrl,
        sync_mode: "manual",
        is_bidirectional: true,
        metadata: partSourceMetadata,
        last_sync_at: new Date().toISOString(),
        last_sync_status: "completed",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (sourceLinkError) {
      return NextResponse.json(
        {
          ok: false,
          error: sourceLinkError.message,
        },
        { status: 500 },
      );
    }

    const syncSummary = {
      publish_mode: publishMode,
      part_id: createdPart.id,
      part_family_id: createdPart.part_family_id,
      file_count: files.length,
      external_document_id: asString(input.external_document_id) || null,
      external_item_id: asString(input.external_item_id) || null,
    };

    const { data: insertedSyncRun, error: syncRunError } = await admin
      .from("design_sync_runs")
      .insert({
        organization_id: ctx.organizationId,
        provider_key: providerKey,
        design_connector_id: connectorId,
        credential_profile_id: null,
        run_type: "publish",
        direction: "push",
        target_ref: createdPart.id,
        status: "completed",
        summary: syncSummary,
        error_message: null,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        triggered_by_user_id: ctx.user.id,
      })
      .select("id")
      .single();

    if (syncRunError) {
      return NextResponse.json(
        {
          ok: false,
          error: syncRunError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      sync_run_id: insertedSyncRun?.id ?? null,
      source_link_id: insertedSourceLink?.id ?? null,
      part_id: createdPart.id,
      part_family_id: createdPart.part_family_id,
      publish_mode: publishMode,
      revision_index: createdPart.revision_index,
      revision: createdPart.revision,
      name: createdPart.name,
      status: createdPart.status,
      message: "Publish completed successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}
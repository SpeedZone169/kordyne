import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

type PublishInput = {
  idempotency_key?: string | null;
  part_id?: string | null;
  external_document_id?: string | null;
  external_name?: string | null;
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
    thumbnail_storage_path?: string | null;
    thumbnail_filename?: string | null;
    cad_metadata?: Record<string, unknown> | null;
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
  if (role === "native") return "cad_3d";
  if (role === "thumbnail") return "image";
  return "other";
}

function isAllowedFileRole(role: string) {
  return role === "step" || role === "native" || role === "thumbnail";
}

function isValidIdempotencyKey(value: string) {
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
}

export async function POST(request: Request) {
  const admin = createDesignAppAdminClient();
  let idempotencyRowId: string | null = null;

  async function failWithLock(error: string, status = 500) {
    if (idempotencyRowId) {
      await admin
        .from("design_app_publish_idempotency_keys")
        .update({
          status: "failed",
          error,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idempotencyRowId);
    }

    return NextResponse.json({ ok: false, error }, { status });
  }

  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "inventor",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json()) as PublishInput;

    const providerKey = "inventor";
    const idempotencyKey = asString(input.idempotency_key);

    if (!idempotencyKey || !isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        {
          ok: false,
          error: "A valid idempotency_key is required.",
        },
        { status: 400 },
      );
    }

    const publishMode = asString(input.metadata?.publish_mode) || "new_family";

    const partName =
      asString(input.metadata?.name) ||
      asString(input.external_name) ||
      "Unnamed Inventor Part";

    const partNumber = asString(input.metadata?.part_number) || null;
    const description = asString(input.metadata?.description) || null;
    const processType = asString(input.metadata?.process_type) || null;
    const material = asString(input.metadata?.material) || null;
    const revisionScheme =
      asString(input.metadata?.revision_scheme) || "alphabetic";
    const category = asString(input.metadata?.category) || null;
    const status = asString(input.metadata?.status) || "draft";
    const revisionNote = asString(input.metadata?.revision_note) || null;
    const cadMetadata =
      input.metadata?.cad_metadata &&
      typeof input.metadata.cad_metadata === "object" &&
      !Array.isArray(input.metadata.cad_metadata)
        ? input.metadata.cad_metadata
        : null;
    const externalName = asString(input.external_name) || partName || null;
    const externalDocumentId =
      asString(input.external_document_id) || externalName || null;

    if (!isAllowedPublishMode(publishMode)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported publish mode." },
        { status: 400 },
      );
    }

    if (publishMode === "new_family" && !isAllowedRevisionScheme(revisionScheme)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported revision scheme." },
        { status: 400 },
      );
    }

    const { data: connector, error: connectorError } = await ctx.supabase
      .from("design_connectors")
      .select("id, organization_id, provider_key, is_enabled")
      .eq("organization_id", ctx.organizationId)
      .eq("provider_key", providerKey)
      .eq("is_enabled", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (connectorError) {
      return NextResponse.json(
        { ok: false, error: connectorError.message },
        { status: 500 },
      );
    }

    if (!connector?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "Inventor connector is not configured for this organization.",
        },
        { status: 403 },
      );
    }

    const files = input.files ?? [];

    for (const file of files) {
      const storagePath = asString(file.storage_path);

      if (!storagePath) {
        return NextResponse.json(
          { ok: false, error: "Every file must include storage_path." },
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

      if (!isAllowedFileRole(role)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Only STEP, native Inventor and preview thumbnail files can be published from this flow.",
          },
          { status: 400 },
        );
      }
    }

    const { data: lockRow, error: lockError } = await admin
      .from("design_app_publish_idempotency_keys")
      .insert({
        organization_id: ctx.organizationId,
        provider_key: providerKey,
        idempotency_key: idempotencyKey,
        status: "processing",
        created_by_user_id: ctx.user.id,
      })
      .select("id")
      .single();

    if (lockError) {
      if (lockError.code === "23505") {
        const { data: existingLock, error: existingLockError } = await admin
          .from("design_app_publish_idempotency_keys")
          .select("status, response, error")
          .eq("organization_id", ctx.organizationId)
          .eq("provider_key", providerKey)
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle();

        if (existingLockError) {
          return NextResponse.json(
            { ok: false, error: existingLockError.message },
            { status: 500 },
          );
        }

        if (existingLock?.status === "completed" && existingLock.response) {
          return NextResponse.json({
            ...(existingLock.response as Record<string, unknown>),
            idempotent_replay: true,
          });
        }

        if (existingLock?.status === "processing") {
          return NextResponse.json(
            {
              ok: false,
              error: "This publish is already processing.",
              status: "processing",
            },
            { status: 409 },
          );
        }

        return NextResponse.json(
          {
            ok: false,
            error:
              existingLock?.error ||
              "This publish key was already used. Start a new publish attempt.",
            status: "failed",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        { ok: false, error: lockError.message },
        { status: 500 },
      );
    }

    idempotencyRowId = lockRow.id;

    let partId: string | null = null;

    if (publishMode === "new_revision") {
      const sourcePartId = asString(input.part_id);

      if (!sourcePartId) {
        return failWithLock("part_id is required for new revision publish.", 400);
      }

      const { data: sourcePart, error: sourcePartError } = await ctx.supabase
        .from("parts")
        .select("id, organization_id, part_family_id")
        .eq("id", sourcePartId)
        .eq("organization_id", ctx.organizationId)
        .maybeSingle();

      if (sourcePartError) {
        return failWithLock(sourcePartError.message);
      }

      if (!sourcePart?.id) {
        return failWithLock("Target part not found.", 404);
      }

      const { data: newPartId, error: revisionError } = await ctx.supabase.rpc(
        "create_part_revision",
        {
          p_source_part_id: sourcePartId,
          p_revision_note: revisionNote,
        },
      );

      if (revisionError || !newPartId) {
        return failWithLock(
          revisionError?.message ?? "Failed to create revision.",
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
        return failWithLock(partUpdateError.message);
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
        return failWithLock(
          createPartError?.message ?? "Failed to create part.",
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
      return failWithLock(createdPartError.message);
    }

    if (!createdPart?.id || !createdPart.part_family_id) {
      return failWithLock("Created part could not be loaded.");
    }

    let thumbnailFileId: string | null = null;
    let thumbnailStoragePath: string | null = null;
    let thumbnailFileName: string | null = null;

    for (const file of files) {
      const role = asString(file.role).toLowerCase();
      const assetCategory = inferAssetCategory(role);

      const { data: insertedPartFile, error: partFileError } = await admin
        .from("part_files")
        .insert({
          part_id: createdPart.id,
          user_id: ctx.user.id,
          file_name: asString(file.filename) || "Unnamed file",
          file_type: asString(file.mime_type) || "application/octet-stream",
          asset_category: assetCategory,
          storage_path: asString(file.storage_path),
          file_size_bytes:
            typeof file.size_bytes === "number" ? file.size_bytes : null,
        })
        .select("id, file_name, storage_path, asset_category")
        .single();

      if (partFileError) {
        return failWithLock(partFileError.message);
      }

      if (role === "thumbnail" || assetCategory === "image") {
        thumbnailFileId = String(insertedPartFile?.id ?? "") || thumbnailFileId;
        thumbnailStoragePath =
          asString(insertedPartFile?.storage_path) || asString(file.storage_path) || thumbnailStoragePath;
        thumbnailFileName =
          asString(insertedPartFile?.file_name) || asString(file.filename) || thumbnailFileName;
      }
    }

    if (!thumbnailStoragePath) {
      const metadataThumbnailStoragePath = asString(
        input.metadata?.thumbnail_storage_path,
      );
      const metadataThumbnailFileName = asString(input.metadata?.thumbnail_filename);

      if (
        metadataThumbnailStoragePath &&
        validateStoragePathPrefix(
          metadataThumbnailStoragePath,
          ctx.organizationId,
          ctx.user.id,
        )
      ) {
        const { data: insertedThumbnailFile, error: thumbnailPartFileError } =
          await admin
            .from("part_files")
            .insert({
              part_id: createdPart.id,
              user_id: ctx.user.id,
              file_name: metadataThumbnailFileName || "Inventor preview thumbnail.png",
              file_type: "image/png",
              asset_category: "image",
              storage_path: metadataThumbnailStoragePath,
              file_size_bytes: null,
            })
            .select("id, file_name, storage_path")
            .single();

        if (thumbnailPartFileError) {
          return failWithLock(thumbnailPartFileError.message);
        }

        thumbnailFileId = String(insertedThumbnailFile?.id ?? "") || null;
        thumbnailStoragePath =
          asString(insertedThumbnailFile?.storage_path) || metadataThumbnailStoragePath;
        thumbnailFileName =
          asString(insertedThumbnailFile?.file_name) || metadataThumbnailFileName || null;
      }
    }

    const partSourceMetadata = {
      source: "inventor_addin_publish",
      publish_mode: publishMode,
      uploaded_file_count: files.length,
      uploaded_roles: files.map((file) => asString(file.role).toLowerCase()),
      thumbnail_file_id: thumbnailFileId,
      thumbnail_storage_path: thumbnailStoragePath,
      thumbnail_filename: thumbnailFileName,
      idempotency_key: idempotencyKey,
      cad_metadata: cadMetadata,
    };

    const { data: insertedSourceLink, error: sourceLinkError } = await admin
      .from("part_source_links")
      .insert({
        organization_id: ctx.organizationId,
        provider_key: providerKey,
        credential_profile_id: null,
        design_connector_id: connector.id,
        part_family_id: createdPart.part_family_id,
        part_id: createdPart.id,
        external_workspace_id: null,
        external_project_id: null,
        external_document_id: externalDocumentId,
        external_item_id: null,
        external_version_id: null,
        external_revision_id: null,
        external_name: externalName,
        external_url: null,
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
      return failWithLock(sourceLinkError.message);
    }

    const syncSummary = {
      publish_mode: publishMode,
      part_id: createdPart.id,
      part_family_id: createdPart.part_family_id,
      file_count: files.length,
      external_document_id: externalDocumentId,
      thumbnail_file_id: thumbnailFileId,
      has_thumbnail: Boolean(thumbnailStoragePath),
      idempotency_key: idempotencyKey,
      cad_metadata: cadMetadata,
    };

    const { data: insertedSyncRun, error: syncRunError } = await admin
      .from("design_sync_runs")
      .insert({
        organization_id: ctx.organizationId,
        provider_key: providerKey,
        design_connector_id: connector.id,
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
      return failWithLock(syncRunError.message);
    }

    const responsePayload = {
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
      thumbnail_file_id: thumbnailFileId,
      thumbnail_storage_path: thumbnailStoragePath,
      idempotency_key: idempotencyKey,
      message: "Inventor publish completed successfully.",
    };

    await admin
      .from("design_app_publish_idempotency_keys")
      .update({
        status: "completed",
        part_id: createdPart.id,
        part_family_id: createdPart.part_family_id,
        response: responsePayload,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", idempotencyRowId);

    return NextResponse.json(responsePayload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error.";

    if (idempotencyRowId) {
      await admin
        .from("design_app_publish_idempotency_keys")
        .update({
          status: "failed",
          error: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", idempotencyRowId);
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    );
  }
}

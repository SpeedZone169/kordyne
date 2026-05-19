import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";
const ONSHAPE_NATIVE_MANIFEST_EXTENSION = ".onshape.json";
const ONSHAPE_NATIVE_MANIFEST_MIME_TYPE =
  "application/vnd.kordyne.onshape-manifest+json";

type PublishInput = {
  idempotency_key?: string | null;
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

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFileExtension(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(ONSHAPE_NATIVE_MANIFEST_EXTENSION)) {
    return ONSHAPE_NATIVE_MANIFEST_EXTENSION;
  }

  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

function isOnshapeNativeReferenceFile(fileName: string) {
  const extension = getFileExtension(fileName);
  return (
    extension === ONSHAPE_NATIVE_MANIFEST_EXTENSION ||
    extension === ".onshape" ||
    extension === ".json"
  );
}

function metadataString(
  metadata: Record<string, unknown> | null,
  ...keys: string[]
) {
  if (!metadata) return "";

  for (const key of keys) {
    const value = asString(metadata[key]);
    if (value) return value;
  }

  return "";
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
  if (role === "stl") return "cad_3d";
  if (role === "native") return "cad_3d";
  if (role === "thumbnail") return "image";
  return "other";
}

function isAllowedFileRole(role: string) {
  return (
    role === "step" ||
    role === "stl" ||
    role === "native" ||
    role === "thumbnail"
  );
}

function isValidIdempotencyKey(value: string) {
  return /^[a-zA-Z0-9._:-]{8,128}$/.test(value);
}

function buildOnshapeNativeFormat(
  fileExtension: string | null,
  reference: {
    document_id: string | null;
    workspace_id: string | null;
    project_id: string | null;
    element_or_part_id: string | null;
    version_or_microversion_id: string | null;
    revision_id: string | null;
    url: string | null;
  },
  generated: boolean,
) {
  return {
    provider_key: "onshape",
    format: "onshape_document_reference",
    canonical_extension: ONSHAPE_NATIVE_MANIFEST_EXTENSION,
    file_extension: fileExtension || ONSHAPE_NATIVE_MANIFEST_EXTENSION,
    mime_type: ONSHAPE_NATIVE_MANIFEST_MIME_TYPE,
    generated_manifest: generated,
    feature_tree_strategy: "preserved_in_onshape_document",
    step_limitation:
      "STEP is stored as exchange geometry only and is not treated as the native source.",
    reference,
  };
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
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const input = (await request.json()) as PublishInput;

    const providerKey = "onshape";
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
      "Unnamed Onshape Part";

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
      asString(input.external_document_id) ||
      metadataString(cadMetadata, "document_id", "did") ||
      null;
    const externalWorkspaceId =
      asString(input.external_workspace_id) ||
      metadataString(cadMetadata, "workspace_id", "wid") ||
      null;
    const externalProjectId =
      asString(input.external_project_id) ||
      metadataString(cadMetadata, "project_id") ||
      null;
    const externalItemId =
      asString(input.external_item_id) ||
      metadataString(cadMetadata, "element_id", "part_id", "eid", "pid") ||
      null;
    const externalVersionId =
      asString(input.external_version_id) ||
      metadataString(
        cadMetadata,
        "version_id",
        "microversion_id",
        "wvmid",
        "vid",
        "mid",
      ) ||
      null;
    const externalRevisionId =
      asString(input.external_revision_id) ||
      metadataString(cadMetadata, "revision_id", "revision") ||
      null;
    const externalUrl =
      asString(input.external_url) ||
      metadataString(
        cadMetadata,
        "external_url",
        "document_url",
        "onshape_url",
        "url",
      ) ||
      null;
    const onshapeReference = {
      document_id: externalDocumentId,
      workspace_id: externalWorkspaceId,
      project_id: externalProjectId,
      element_or_part_id: externalItemId,
      version_or_microversion_id: externalVersionId,
      revision_id: externalRevisionId,
      url: externalUrl,
    };

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
          error: "Onshape connector is not configured for this organization.",
        },
        { status: 403 },
      );
    }

    const files = input.files ?? [];

    for (const file of files) {
      const storagePath = asString(file.storage_path);
      const fileName = asString(file.filename);

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
              "Only STEP, STL, Onshape document reference and preview thumbnail files can be published from this flow.",
          },
          { status: 400 },
        );
      }

      if (role === "native" && !isOnshapeNativeReferenceFile(fileName)) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "Native Onshape files must be .onshape.json, .onshape or JSON document references.",
          },
          { status: 400 },
        );
      }
    }

    const nativeInputFiles = files.filter(
      (file) => asString(file.role).toLowerCase() === "native",
    );
    const hasCanonicalNativeManifest = nativeInputFiles.some(
      (file) =>
        getFileExtension(asString(file.filename)) ===
        ONSHAPE_NATIVE_MANIFEST_EXTENSION,
    );
    const canGenerateNativeManifest = Boolean(externalDocumentId || externalUrl);

    if (nativeInputFiles.length === 0 && !canGenerateNativeManifest) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Onshape publish requires a native Onshape document reference (.onshape.json) or external_document_id/external_url. STEP alone loses the feature tree.",
        },
        { status: 400 },
      );
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
      .select("id, organization_id, part_family_id, revision_index, revision, name, part_number, status")
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
    let nativeFileId: string | null = null;
    let nativeStoragePath: string | null = null;
    let nativeFileName: string | null = null;
    const storedFiles: Array<Record<string, unknown>> = [];

    for (const file of files) {
      const role = asString(file.role).toLowerCase();
      const assetCategory = inferAssetCategory(role);
      const fileName = asString(file.filename) || "Unnamed file";
      const fileExtension = getFileExtension(fileName);
      const nativeFormat =
        role === "native"
          ? buildOnshapeNativeFormat(fileExtension, onshapeReference, false)
          : null;

      const { data: insertedPartFile, error: partFileError } = await admin
        .from("part_files")
        .insert({
          part_id: createdPart.id,
          user_id: ctx.user.id,
          file_name: fileName,
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

      storedFiles.push({
        role,
        file_id: String(insertedPartFile?.id ?? "") || null,
        filename: asString(insertedPartFile?.file_name) || fileName,
        storage_path:
          asString(insertedPartFile?.storage_path) || asString(file.storage_path),
        asset_category:
          asString(insertedPartFile?.asset_category) || assetCategory,
        file_extension: fileExtension || null,
        native_format: nativeFormat,
      });

      if (role === "native") {
        nativeFileId = String(insertedPartFile?.id ?? "") || nativeFileId;
        nativeStoragePath =
          asString(insertedPartFile?.storage_path) ||
          asString(file.storage_path) ||
          nativeStoragePath;
        nativeFileName =
          asString(insertedPartFile?.file_name) || fileName || nativeFileName;
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
              file_name: metadataThumbnailFileName || "Onshape preview thumbnail.png",
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

    if (!hasCanonicalNativeManifest && canGenerateNativeManifest) {
      const generatedAt = new Date().toISOString();
      const manifestFileName = `${sanitizeFileName(
        `${partName || externalDocumentId || "onshape-document"}`
          .replace(/\.onshape\.json$/i, "")
          .replace(/\.[^.]+$/i, ""),
      )}${ONSHAPE_NATIVE_MANIFEST_EXTENSION}`;
      const manifestStoragePath = [
        "design-app",
        ctx.organizationId,
        ctx.user.id,
        `${Date.now()}-native-${manifestFileName}`,
      ].join("/");
      const nativeFormat = buildOnshapeNativeFormat(
        ONSHAPE_NATIVE_MANIFEST_EXTENSION,
        onshapeReference,
        true,
      );
      const manifestBody = {
        schema: "kordyne.onshape.native-reference.v1",
        generated_at: generatedAt,
        part_id: createdPart.id,
        part_family_id: createdPart.part_family_id,
        part_name: createdPart.name,
        revision: createdPart.revision,
        native_format: nativeFormat,
      };
      const manifestBytes = new TextEncoder().encode(
        JSON.stringify(manifestBody, null, 2),
      );

      const { error: manifestUploadError } = await admin.storage
        .from(DESIGN_UPLOAD_BUCKET)
        .upload(manifestStoragePath, manifestBytes, {
          contentType: ONSHAPE_NATIVE_MANIFEST_MIME_TYPE,
          upsert: false,
        });

      if (manifestUploadError) {
        return failWithLock(manifestUploadError.message);
      }

      const { data: insertedNativeManifest, error: nativeManifestFileError } =
        await admin
          .from("part_files")
          .insert({
            part_id: createdPart.id,
            user_id: ctx.user.id,
            file_name: manifestFileName,
            file_type: ONSHAPE_NATIVE_MANIFEST_MIME_TYPE,
            asset_category: "cad_3d",
            storage_path: manifestStoragePath,
            file_size_bytes: manifestBytes.byteLength,
          })
          .select("id, file_name, storage_path, asset_category")
          .single();

      if (nativeManifestFileError) {
        return failWithLock(nativeManifestFileError.message);
      }

      nativeFileId = String(insertedNativeManifest?.id ?? "") || nativeFileId;
      nativeStoragePath =
        asString(insertedNativeManifest?.storage_path) || manifestStoragePath;
      nativeFileName =
        asString(insertedNativeManifest?.file_name) || manifestFileName;

      storedFiles.push({
        role: "native",
        file_id: nativeFileId,
        filename: nativeFileName,
        storage_path: nativeStoragePath,
        asset_category: "cad_3d",
        file_extension: ONSHAPE_NATIVE_MANIFEST_EXTENSION,
        native_format: nativeFormat,
        generated: true,
      });
    }

    const partSourceMetadata = {
      source: "onshape_connector_publish",
      publish_mode: publishMode,
      uploaded_file_count: files.length,
      uploaded_roles: files.map((file) => asString(file.role).toLowerCase()),
      persisted_file_count: storedFiles.length,
      persisted_files: storedFiles,
      native_file_id: nativeFileId,
      native_storage_path: nativeStoragePath,
      native_filename: nativeFileName,
      native_format: buildOnshapeNativeFormat(
        nativeFileName ? getFileExtension(nativeFileName) : null,
        onshapeReference,
        Boolean(
          nativeFileName &&
            getFileExtension(nativeFileName) ===
              ONSHAPE_NATIVE_MANIFEST_EXTENSION &&
            !hasCanonicalNativeManifest,
        ),
      ),
      thumbnail_file_id: thumbnailFileId,
      thumbnail_storage_path: thumbnailStoragePath,
      thumbnail_filename: thumbnailFileName,
      idempotency_key: idempotencyKey,
      cad_metadata: cadMetadata,
      onshape: {
        ...onshapeReference,
      },
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
        external_workspace_id: externalWorkspaceId,
        external_project_id: externalProjectId,
        external_document_id: externalDocumentId,
        external_item_id: externalItemId,
        external_version_id: externalVersionId,
        external_revision_id: externalRevisionId,
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
      return failWithLock(sourceLinkError.message);
    }

    const syncSummary = {
      publish_mode: publishMode,
      part_id: createdPart.id,
      part_family_id: createdPart.part_family_id,
      file_count: files.length,
      external_workspace_id: externalWorkspaceId,
      external_project_id: externalProjectId,
      external_document_id: externalDocumentId,
      external_item_id: externalItemId,
      external_version_id: externalVersionId,
      external_revision_id: externalRevisionId,
      external_url: externalUrl,
      native_file_id: nativeFileId,
      native_storage_path: nativeStoragePath,
      native_filename: nativeFileName,
      native_format: partSourceMetadata.native_format,
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
      part_number: createdPart.part_number,
      status: createdPart.status,
      thumbnail_file_id: thumbnailFileId,
      thumbnail_storage_path: thumbnailStoragePath,
      native_file_id: nativeFileId,
      native_storage_path: nativeStoragePath,
      native_filename: nativeFileName,
      native_format: partSourceMetadata.native_format,
      external_document_id: externalDocumentId,
      external_item_id: externalItemId,
      external_version_id: externalVersionId,
      external_url: externalUrl,
      idempotency_key: idempotencyKey,
      message: "Onshape publish completed successfully.",
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

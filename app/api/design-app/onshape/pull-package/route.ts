import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";
const ONSHAPE_NATIVE_MANIFEST_EXTENSION = ".onshape.json";
const ONSHAPE_NATIVE_MANIFEST_MIME_TYPE =
  "application/vnd.kordyne.onshape-manifest+json";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getLowerFileName(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function getFileExtension(fileName: string) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(ONSHAPE_NATIVE_MANIFEST_EXTENSION)) {
    return ONSHAPE_NATIVE_MANIFEST_EXTENSION;
  }

  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

function isOnshapeReferenceFile(fileName: string) {
  return (
    fileName.endsWith(ONSHAPE_NATIVE_MANIFEST_EXTENSION) ||
    fileName.endsWith(".onshape") ||
    fileName.endsWith(".json")
  );
}

function isStepFile(fileName: string) {
  return fileName.endsWith(".step") || fileName.endsWith(".stp");
}

function isAssemblyReference(fileName: string) {
  return (
    fileName.includes("assembly") ||
    fileName.includes("-asm") ||
    fileName.includes("_asm")
  );
}

function buildNativeFormat(fileExtension: string) {
  return {
    provider_key: "onshape",
    format: "onshape_document_reference",
    canonical_extension: ONSHAPE_NATIVE_MANIFEST_EXTENSION,
    file_extension: fileExtension || ONSHAPE_NATIVE_MANIFEST_EXTENSION,
    mime_type: ONSHAPE_NATIVE_MANIFEST_MIME_TYPE,
    feature_tree_strategy: "preserved_in_onshape_document",
    step_limitation:
      "STEP is stored as exchange geometry only and is not treated as the native source.",
  };
}

type SignedFile = {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number | null;
  storage_path: string;
  signed_url: string;
  file_extension: string;
  native_format: ReturnType<typeof buildNativeFormat> | null;
  is_primary: boolean;
  is_assembly: boolean;
};

function metadataString(value: unknown, ...keys: string[]) {
  if (!value || typeof value !== "object") return "";

  const record = value as Record<string, unknown>;

  for (const key of keys) {
    const direct = asString(record[key]);
    if (direct) return direct;
  }

  const onshape = record.onshape;

  if (onshape && typeof onshape === "object") {
    const onshapeRecord = onshape as Record<string, unknown>;

    for (const key of keys) {
      const nested = asString(onshapeRecord[key]);
      if (nested) return nested;
    }
  }

  const cadMetadata = record.cad_metadata;

  if (cadMetadata && typeof cadMetadata === "object") {
    const cadMetadataRecord = cadMetadata as Record<string, unknown>;

    for (const key of keys) {
      const nested = asString(cadMetadataRecord[key]);
      if (nested) return nested;
    }
  }

  return "";
}

function getFocusElementId(sourceLink: Record<string, unknown> | null) {
  if (!sourceLink) return "";

  return (
    metadataString(
      sourceLink.metadata,
      "elementId",
      "tabElementId",
      "element_id",
      "tab_element_id",
      "eid",
    ) ||
    asString(sourceLink.external_item_id) ||
    metadataString(
      sourceLink.metadata,
      "element_or_part_id",
      "partId",
      "part_id",
      "pid",
    )
  );
}

function buildOnshapeOpenUrl(sourceLink: Record<string, unknown> | null) {
  if (!sourceLink) return "";

  const externalUrl =
    asString(sourceLink.external_url) ||
    metadataString(sourceLink.metadata, "external_url", "document_url", "url");

  if (externalUrl) return externalUrl;

  const documentId =
    asString(sourceLink.external_document_id) ||
    metadataString(sourceLink.metadata, "documentId", "document_id", "did");
  const workspaceId =
    asString(sourceLink.external_workspace_id) ||
    metadataString(sourceLink.metadata, "workspaceId", "workspace_id", "wid");
  const elementId = getFocusElementId(sourceLink);

  if (!documentId || !workspaceId || !elementId) return "";

  const cadBaseUrl = (
    process.env.ONSHAPE_BASE_URL || "https://cad.onshape.com"
  ).replace(/\/$/, "");

  return `${cadBaseUrl}/documents/${documentId}/w/${workspaceId}/e/${elementId}`;
}

async function signFiles(
  admin: ReturnType<typeof createDesignAppAdminClient>,
  files: Array<Record<string, unknown>>,
  options: { native?: boolean } = {},
) {
  const signedFiles: SignedFile[] = [];

  for (const file of files) {
    const storagePath = asString(file.storage_path);
    const filename = asString(file.file_name) || "onshape-file";
    const fileExtension = getFileExtension(filename);

    if (!storagePath) continue;

    const { data: signed, error: signedError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .createSignedUrl(storagePath, 10 * 60);

    if (signedError || !signed?.signedUrl) {
      throw new Error(
        signedError?.message ?? "Could not create signed download URL.",
      );
    }

    signedFiles.push({
      file_id: String(file.id ?? ""),
      filename,
      mime_type: asString(file.file_type) || "application/octet-stream",
      size_bytes:
        typeof file.file_size_bytes === "number"
          ? file.file_size_bytes
          : null,
      storage_path: storagePath,
      signed_url: signed.signedUrl,
      file_extension: fileExtension,
      native_format: options.native ? buildNativeFormat(fileExtension) : null,
      is_primary: false,
      is_assembly: isAssemblyReference(filename.toLowerCase()),
    });
  }

  signedFiles.sort((a, b) => {
    if (a.is_assembly && !b.is_assembly) return -1;
    if (!a.is_assembly && b.is_assembly) return 1;
    return a.filename.localeCompare(b.filename);
  });

  if (signedFiles.length > 0) {
    signedFiles[0].is_primary = true;
  }

  return signedFiles;
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();

    const body = (await request.json().catch(() => ({}))) as {
      part_id?: string;
    };

    const partId = asString(body.part_id);

    if (!partId) {
      return NextResponse.json(
        { ok: false, error: "part_id is required." },
        { status: 400 },
      );
    }

    const { data: part, error: partError } = await ctx.supabase
      .from("parts")
      .select("id, organization_id, part_family_id, name, revision, status")
      .eq("id", partId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (partError) {
      return NextResponse.json(
        { ok: false, error: partError.message },
        { status: 500 },
      );
    }

    if (!part?.id) {
      return NextResponse.json(
        { ok: false, error: "Part not found." },
        { status: 404 },
      );
    }

    const { data: files, error: filesError } = await ctx.supabase
      .from("part_files")
      .select("id, part_id, file_name, file_type, storage_path, file_size_bytes, created_at")
      .eq("part_id", part.id)
      .order("created_at", { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { ok: false, error: filesError.message },
        { status: 500 },
      );
    }

    const nativeFiles = (files ?? []).filter((file) =>
      isOnshapeReferenceFile(getLowerFileName(file.file_name)),
    ) as Array<Record<string, unknown>>;

    const stepFiles = (files ?? []).filter((file) =>
      isStepFile(getLowerFileName(file.file_name)),
    ) as Array<Record<string, unknown>>;

    const signedNativeFiles = await signFiles(admin, nativeFiles, {
      native: true,
    });
    const signedStepFiles = await signFiles(admin, stepFiles);

    const { data: sourceLinks, error: sourceLinkError } = await ctx.supabase
      .from("part_source_links")
      .select(
        `
          id,
          external_workspace_id,
          external_document_id,
          external_item_id,
          external_version_id,
          external_revision_id,
          external_name,
          external_url,
          metadata,
          updated_at,
          created_at
        `,
      )
      .eq("organization_id", ctx.organizationId)
      .eq("provider_key", "onshape")
      .eq("part_id", part.id)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (sourceLinkError) {
      return NextResponse.json(
        { ok: false, error: sourceLinkError.message },
        { status: 500 },
      );
    }

    const sourceLink = ((sourceLinks ?? [])[0] ?? null) as Record<
      string,
      unknown
    > | null;
    const openUrl = buildOnshapeOpenUrl(sourceLink);
    const focusElementId = getFocusElementId(sourceLink);

    if (signedNativeFiles.length === 0 && signedStepFiles.length === 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "No Onshape document reference or STEP files found for this part.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      part: {
        id: part.id,
        name: part.name,
        revision: part.revision,
        status: part.status,
        part_family_id: part.part_family_id,
      },
      availability: {
        has_native: signedNativeFiles.length > 0,
        has_step: signedStepFiles.length > 0,
        native_count: signedNativeFiles.length,
        step_count: signedStepFiles.length,
      },
      native_files: signedNativeFiles,
      step_files: signedStepFiles,
      source_link: sourceLink
        ? {
            id: sourceLink.id ?? null,
            external_document_id: sourceLink.external_document_id ?? null,
            external_workspace_id: sourceLink.external_workspace_id ?? null,
            external_item_id: sourceLink.external_item_id ?? null,
            focus_element_id: focusElementId || null,
            external_revision_id: sourceLink.external_revision_id ?? null,
            external_name: sourceLink.external_name ?? null,
            external_url: sourceLink.external_url ?? null,
            open_url: openUrl || null,
          }
        : null,
      open_action: openUrl
        ? {
            mode: "native_source",
            label: "Open native Onshape source",
            url: openUrl,
          }
        : null,
      message: "Onshape pull package is ready.",
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

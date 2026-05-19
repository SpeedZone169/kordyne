import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";
const ONSHAPE_NATIVE_MANIFEST_EXTENSION = ".onshape.json";
const ONSHAPE_NATIVE_MANIFEST_MIME_TYPE =
  "application/vnd.kordyne.onshape-manifest+json";

const ALLOWED_ROLES = new Set(["step", "stl", "native", "thumbnail"]);
const MAX_DESIGN_FILE_SIZE_BYTES = 250 * 1024 * 1024;
const MAX_THUMBNAIL_FILE_SIZE_BYTES = 15 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtension(name: string) {
  const lower = name.toLowerCase();

  if (lower.endsWith(ONSHAPE_NATIVE_MANIFEST_EXTENSION)) {
    return ONSHAPE_NATIVE_MANIFEST_EXTENSION;
  }

  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

function isAllowedExtensionForRole(
  role: string,
  fileName: string,
  extension: string,
) {
  if (role === "step") {
    return extension === ".step" || extension === ".stp";
  }

  if (role === "stl") {
    return extension === ".stl";
  }

  if (role === "native") {
    const lower = fileName.toLowerCase();
    return (
      extension === ".onshape" ||
      extension === ".json" ||
      lower.endsWith(".onshape.json")
    );
  }

  if (role === "thumbnail") {
    return (
      extension === ".png" ||
      extension === ".jpg" ||
      extension === ".jpeg" ||
      extension === ".webp"
    );
  }

  return false;
}

function defaultContentTypeForRole(role: string, extension = "") {
  if (role === "step") return "application/step";
  if (role === "stl") return "model/stl";
  if (role === "native") return ONSHAPE_NATIVE_MANIFEST_MIME_TYPE;

  if (role === "thumbnail") {
    if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
    if (extension === ".webp") return "image/webp";
    return "image/png";
  }

  return "application/octet-stream";
}

function maxFileSizeForRole(role: string) {
  return role === "thumbnail"
    ? MAX_THUMBNAIL_FILE_SIZE_BYTES
    : MAX_DESIGN_FILE_SIZE_BYTES;
}

function uploadMessageForRole(role: string) {
  if (role === "native") return "Onshape document reference uploaded successfully.";
  if (role === "stl") return "Onshape STL file uploaded successfully.";
  if (role === "thumbnail") return "Onshape preview thumbnail uploaded successfully.";
  return "Onshape STEP file uploaded successfully.";
}

function invalidExtensionMessageForRole(role: string) {
  if (role === "native") {
    return (
      "Only Onshape document reference files (.onshape.json, .onshape or " +
      ".json) are allowed for native Onshape upload."
    );
  }

  if (role === "thumbnail") {
    return "Only PNG, JPG, JPEG and WebP files are allowed for preview thumbnail upload.";
  }

  if (role === "stl") {
    return "Only STL files are allowed for browser viewer upload.";
  }

  return "Only STEP files are allowed for STEP upload.";
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

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "onshape",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();

    const formData = await request.formData();
    const role = String(formData.get("role") ?? "other").trim().toLowerCase();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { ok: false, error: "Unsupported file role." },
        { status: 400 },
      );
    }

    const maxSize = maxFileSizeForRole(role);

    if (file.size <= 0 || file.size > maxSize) {
      return NextResponse.json(
        {
          ok: false,
          error:
            role === "thumbnail"
              ? "Thumbnail size is invalid or exceeds the 15 MB limit."
              : "File size is invalid or exceeds the maximum allowed size.",
        },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);

    if (!isAllowedExtensionForRole(role, file.name, extension)) {
      return NextResponse.json(
        {
          ok: false,
          error: invalidExtensionMessageForRole(role),
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(file.name || "upload");
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const storagePath = [
      "design-app",
      ctx.organizationId,
      ctx.user.id,
      `${Date.now()}-${role}-${safeName}`,
    ].join("/");

    const contentType =
      role === "native"
        ? defaultContentTypeForRole(role, extension)
        : file.type || defaultContentTypeForRole(role, extension);

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, fileBytes, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { ok: false, error: uploadError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      file: {
        filename: file.name,
        mime_type: contentType,
        size_bytes: file.size,
        storage_path: storagePath,
        role,
        file_extension: extension,
        native_format: role === "native" ? buildNativeFormat(extension) : null,
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
      },
      message: uploadMessageForRole(role),
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

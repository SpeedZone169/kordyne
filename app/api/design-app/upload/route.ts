import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

const ALLOWED_ROLES = new Set([
  "step",
  "native",
  "stl",
  "thumbnail",
  "properties",
]);

const ROLE_EXTENSIONS: Record<string, Set<string>> = {
  step: new Set([".step", ".stp"]),
  native: new Set([".f3d", ".f3z"]),
  stl: new Set([".stl"]),
  thumbnail: new Set([".png", ".jpg", ".jpeg", ".webp"]),
  properties: new Set([".txt", ".json"]),
};

const DESIGN_FILE_SIZE_BYTES = 512 * 1024 * 1024;
const THUMBNAIL_FILE_SIZE_BYTES = 15 * 1024 * 1024;
const PROPERTIES_FILE_SIZE_BYTES = 5 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtension(name: string) {
  const lower = name.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

function maxFileSizeForRole(role: string) {
  if (role === "thumbnail") return THUMBNAIL_FILE_SIZE_BYTES;
  if (role === "properties") return PROPERTIES_FILE_SIZE_BYTES;
  return DESIGN_FILE_SIZE_BYTES;
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request);
    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();

    const formData = await request.formData();
    const role = String(formData.get("role") ?? "other").trim().toLowerCase();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: "No file uploaded.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unsupported file role.",
        },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > maxFileSizeForRole(role)) {
      return NextResponse.json(
        {
          ok: false,
          error: "File size is invalid or exceeds the maximum allowed size.",
        },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);
    if (!ROLE_EXTENSIONS[role]?.has(extension)) {
      return NextResponse.json(
        {
          ok: false,
          error: "File extension is not allowed for this upload role.",
        },
        { status: 400 },
      );
    }

    const safeName = sanitizeFileName(file.name || "upload.step");
    const arrayBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const storagePath = [
      "design-app",
      ctx.organizationId,
      ctx.user.id,
      `${Date.now()}-${safeName}`,
    ].join("/");

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, fileBytes, {
        contentType: file.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        {
          ok: false,
          error: uploadError.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      file: {
        filename: file.name,
        mime_type: file.type || "application/octet-stream",
        size_bytes: file.size,
        storage_path: storagePath,
        role,
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
      },
      message: "Design file uploaded successfully.",
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

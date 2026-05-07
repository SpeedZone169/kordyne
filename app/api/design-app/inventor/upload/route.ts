import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

const ALLOWED_ROLES = new Set(["step", "native"]);
const MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024;

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getExtension(name: string) {
  const lower = name.toLowerCase();
  const idx = lower.lastIndexOf(".");
  return idx >= 0 ? lower.slice(idx) : "";
}

function isAllowedExtensionForRole(role: string, extension: string) {
  if (role === "step") {
    return extension === ".step" || extension === ".stp";
  }

  if (role === "native") {
    return extension === ".ipt" || extension === ".iam";
  }

  return false;
}

function defaultContentTypeForRole(role: string) {
  if (role === "step") return "application/step";
  return "application/octet-stream";
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "inventor",
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

    if (file.size <= 0 || file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { ok: false, error: "File size is invalid or exceeds the maximum allowed size." },
        { status: 400 },
      );
    }

    const extension = getExtension(file.name);

    if (!isAllowedExtensionForRole(role, extension)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            role === "native"
              ? "Only IPT and IAM files are allowed for native Inventor upload."
              : "Only STEP files are allowed for STEP upload.",
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

    const { error: uploadError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .upload(storagePath, fileBytes, {
        contentType: file.type || defaultContentTypeForRole(role),
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
        mime_type: file.type || defaultContentTypeForRole(role),
        size_bytes: file.size,
        storage_path: storagePath,
        role,
        organization_id: ctx.organizationId,
        uploaded_by_user_id: ctx.user.id,
        bucket: DESIGN_UPLOAD_BUCKET,
      },
      message:
        role === "native"
          ? "Inventor native file uploaded successfully."
          : "Inventor STEP file uploaded successfully.",
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

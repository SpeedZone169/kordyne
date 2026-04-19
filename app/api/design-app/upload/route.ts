import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;

const ALLOWED_EXTENSIONS_BY_ROLE: Record<string, string[]> = {
  step: ["step", "stp"],
  native_cad: ["f3d", "f3z", "sldprt", "sldasm", "ipt", "iam", "par", "asm"],
  drawing_pdf: ["pdf"],
  drawing_native: ["dwg", "dxf", "idw", "slddrw"],
  preview_image: ["png", "jpg", "jpeg", "webp"],
  manufacturing_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"],
  quality_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv", "txt"],
  other: ["pdf", "png", "jpg", "jpeg", "csv", "txt", "zip"],
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

function asNullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "No organization membership found." },
        { status: 403 },
      );
    }

    if (!["admin", "engineer"].includes(membership.role)) {
      return NextResponse.json(
        { error: "Only engineers and admins can upload design files." },
        { status: 403 },
      );
    }

    const formData = await request.formData();

    const role = asNullableString(formData.get("role")) ?? "other";
    const fileEntry = formData.get("file");

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: "A file is required." },
        { status: 400 },
      );
    }

    if (!fileEntry.name || fileEntry.size <= 0) {
      return NextResponse.json(
        { error: "Uploaded file is empty or invalid." },
        { status: 400 },
      );
    }

    if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES} bytes.`,
        },
        { status: 400 },
      );
    }

    const extension = getFileExtension(fileEntry.name);

    if (!extension) {
      return NextResponse.json(
        { error: "File must have a valid extension." },
        { status: 400 },
      );
    }

    const allowedExtensions = ALLOWED_EXTENSIONS_BY_ROLE[role] ?? ALLOWED_EXTENSIONS_BY_ROLE.other;

    if (!allowedExtensions.includes(extension)) {
      return NextResponse.json(
        {
          error: `Invalid file type for role '${role}'. Allowed types: ${allowedExtensions
            .map((ext) => `.${ext}`)
            .join(", ")}.`,
        },
        { status: 400 },
      );
    }

    const safeFileName = sanitizeFileName(fileEntry.name);
    const storagePath = `${user.id}/design-app/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("part-files")
      .upload(storagePath, fileEntry, {
        upsert: false,
        contentType: fileEntry.type || undefined,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Storage upload failed: ${uploadError.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      file: {
        role,
        filename: fileEntry.name,
        mime_type: fileEntry.type || null,
        size_bytes: fileEntry.size,
        storage_path: storagePath,
        file_type: extension,
      },
      message: "Design file uploaded successfully.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected upload error.",
      },
      { status: 500 },
    );
  }
}
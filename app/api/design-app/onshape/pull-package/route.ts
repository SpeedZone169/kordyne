import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getLowerFileName(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function isOnshapeReferenceFile(fileName: string) {
  return (
    fileName.endsWith(".onshape") ||
    fileName.endsWith(".json") ||
    fileName.endsWith(".onshape.json")
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

type SignedFile = {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number | null;
  storage_path: string;
  signed_url: string;
  is_primary: boolean;
  is_assembly: boolean;
};

async function signFiles(
  admin: ReturnType<typeof createDesignAppAdminClient>,
  files: Array<Record<string, unknown>>,
) {
  const signedFiles: SignedFile[] = [];

  for (const file of files) {
    const storagePath = asString(file.storage_path);
    const filename = asString(file.file_name) || "onshape-file";

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

    const signedNativeFiles = await signFiles(admin, nativeFiles);
    const signedStepFiles = await signFiles(admin, stepFiles);

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

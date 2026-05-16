import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isOnshapeReferenceFile(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith(".onshape") ||
    lower.endsWith(".json") ||
    lower.endsWith(".onshape.json")
  );
}

function isAssemblyReference(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.includes("assembly") ||
    lower.includes("-asm") ||
    lower.includes("_asm")
  );
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
      .select("id, organization_id, part_family_id, name, revision")
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
      isOnshapeReferenceFile(String(file.file_name ?? "")),
    );

    if (nativeFiles.length === 0) {
      return NextResponse.json(
        { ok: false, error: "No Onshape document reference files found for this part." },
        { status: 404 },
      );
    }

    const signedFiles = [];

    for (const file of nativeFiles) {
      const storagePath = String(file.storage_path ?? "");

      if (!storagePath) continue;

      const { data: signed, error: signedError } = await admin.storage
        .from(DESIGN_UPLOAD_BUCKET)
        .createSignedUrl(storagePath, 10 * 60);

      if (signedError || !signed?.signedUrl) {
        return NextResponse.json(
          {
            ok: false,
            error: signedError?.message ?? "Could not create signed download URL.",
          },
          { status: 500 },
        );
      }

      signedFiles.push({
        file_id: String(file.id),
        filename: String(file.file_name ?? "onshape-file"),
        mime_type: String(file.file_type ?? "application/octet-stream"),
        size_bytes: file.file_size_bytes ?? null,
        storage_path: storagePath,
        signed_url: signed.signedUrl,
        is_primary: false,
        is_assembly: isAssemblyReference(String(file.file_name ?? "")),
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

    return NextResponse.json({
      ok: true,
      part: {
        id: part.id,
        name: part.name,
        revision: part.revision,
        part_family_id: part.part_family_id,
      },
      files: signedFiles,
      message: "Onshape document references are ready for pull.",
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

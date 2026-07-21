import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isStepFile(fileName: unknown) {
  const lower = String(fileName ?? "").toLowerCase();
  return lower.endsWith(".step") || lower.endsWith(".stp");
}

function toPartSummary(part: Record<string, unknown>) {
  return {
    part_id: String(part.id ?? ""),
    part_family_id: String(part.part_family_id ?? ""),
    name: part.name ?? null,
    revision: part.revision ?? null,
    revision_index: part.revision_index ?? null,
    status: part.status ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "solidworks",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();

    const body = (await request.json().catch(() => ({}))) as {
      source_part_id?: string;
    };

    const sourcePartId = asString(body.source_part_id);

    if (!sourcePartId) {
      return NextResponse.json(
        { ok: false, error: "source_part_id is required." },
        { status: 400 },
      );
    }

    const { data: sourcePart, error: sourcePartError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("id", sourcePartId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (sourcePartError) {
      return NextResponse.json(
        { ok: false, error: sourcePartError.message },
        { status: 500 },
      );
    }

    if (!sourcePart?.id || !sourcePart.part_family_id) {
      return NextResponse.json(
        { ok: false, error: "Source part not found." },
        { status: 404 },
      );
    }

    const { data: revisions, error: revisionsError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("part_family_id", sourcePart.part_family_id)
      .order("revision_index", { ascending: false });

    if (revisionsError) {
      return NextResponse.json(
        { ok: false, error: revisionsError.message },
        { status: 500 },
      );
    }

    const latestPart = ((revisions ?? [])[0] ?? sourcePart) as Record<string, unknown>;

    const { data: files, error: filesError } = await ctx.supabase
      .from("part_files")
      .select("id, file_name, file_type, storage_path, file_size_bytes, created_at")
      .eq("part_id", String(latestPart.id))
      .order("created_at", { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { ok: false, error: filesError.message },
        { status: 500 },
      );
    }

    const stepFiles = (files ?? []).filter((file) => isStepFile(file.file_name));

    if (stepFiles.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Latest revision has no STEP file available for compare." },
        { status: 404 },
      );
    }

    const stepFile = stepFiles[0];
    const storagePath = asString(stepFile.storage_path);

    if (!storagePath) {
      return NextResponse.json(
        { ok: false, error: "STEP file storage path is missing." },
        { status: 500 },
      );
    }

    const { data: signed, error: signedError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .createSignedUrl(storagePath, 10 * 60);

    if (signedError || !signed?.signedUrl) {
      return NextResponse.json(
        { ok: false, error: signedError?.message ?? "Could not create signed STEP URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      source: toPartSummary(sourcePart as Record<string, unknown>),
      latest: toPartSummary(latestPart),
      step_file: {
        file_id: String(stepFile.id),
        filename: String(stepFile.file_name ?? "latest.step"),
        mime_type: String(stepFile.file_type ?? "application/step"),
        size_bytes: stepFile.file_size_bytes ?? null,
        signed_url: signed.signedUrl,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 },
    );
  }
}

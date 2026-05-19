import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getApsManifest,
  getApsStepViewerStatus,
  isApsStepViewerEnabled,
} from "@/lib/aps";
import {
  getApsDerivativeForPartFile,
  normalizeApsDerivativeStatus,
  saveApsDerivativeState,
  toLegacyApsStatus,
  upsertApsDerivativeFromLegacy,
} from "@/lib/aps-derivatives";

type MembershipRow = {
  organization_id: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  storage_path: string;
  aps_object_key: string | null;
  aps_object_id: string | null;
  aps_urn: string | null;
  aps_translation_status: string | null;
  aps_translation_progress: string | null;
  aps_manifest_json: unknown | null;
  aps_last_error: string | null;
};

function getManifestStatus(manifest: unknown) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const value = (manifest as { status?: unknown }).status;
  return typeof value === "string" ? value.toLowerCase() : null;
}

function getManifestProgress(manifest: unknown) {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const value = (manifest as { progress?: unknown }).progress;
  return typeof value === "string" ? value : null;
}

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!isApsStepViewerEnabled()) {
    const viewerStatus = getApsStepViewerStatus();

    return NextResponse.json(
      {
        error: "APS STEP viewer is disabled.",
        missing_config: viewerStatus.missing,
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 400 },
    );
  }

  const membershipOrgIds = ((membershipsRaw ?? []) as MembershipRow[]).map(
    (row) => row.organization_id,
  );

  if (!membershipOrgIds.length) {
    return NextResponse.json(
      { error: "No organization membership found." },
      { status: 403 },
    );
  }

  const { data: fileRaw, error: fileError } = await supabase
    .from("part_files")
    .select(
      `
        id,
        part_id,
        file_name,
        storage_path,
        aps_object_key,
        aps_object_id,
        aps_urn,
        aps_translation_status,
        aps_translation_progress,
        aps_manifest_json,
        aps_last_error
      `,
    )
    .eq("id", fileId)
    .single();

  if (fileError || !fileRaw) {
    return NextResponse.json({ error: "Part file not found." }, { status: 404 });
  }

  const file = fileRaw as PartFileRow;

  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("organization_id")
    .eq("id", file.part_id)
    .single();

  if (partError || !part) {
    return NextResponse.json({ error: "Part not found." }, { status: 404 });
  }

  if (!membershipOrgIds.includes(part.organization_id)) {
    return NextResponse.json(
      { error: "You do not have access to this part file." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const legacyDerivative =
    file.aps_urn && !file.aps_last_error
      ? await upsertApsDerivativeFromLegacy(admin, {
          organizationId: part.organization_id,
          requestedBy: user.id,
          sourceType: "part_file",
          partFileId: file.id,
          fileName: file.file_name,
          storagePath: file.storage_path,
          objectKey: file.aps_object_key,
          objectId: file.aps_object_id,
          urn: file.aps_urn,
          status: file.aps_translation_status,
          progress: file.aps_translation_progress,
          manifestJson: file.aps_manifest_json,
          lastError: file.aps_last_error,
        })
      : null;

  const derivative =
    legacyDerivative || (await getApsDerivativeForPartFile(admin, file.id));
  const urn =
    derivative?.aps_urn || file.aps_urn || url.searchParams.get("urn")?.trim() || "";

  if (!urn) {
    return NextResponse.json(
      { error: "This STEP file has not been prepared yet." },
      { status: 400 },
    );
  }

  if (derivative?.status === "ready" && derivative.manifest_json) {
    return NextResponse.json({
      success: true,
      urn,
      manifest: derivative.manifest_json,
      status: "success",
      progress: derivative.progress,
      cached: true,
    });
  }

  try {
    const manifest = await getApsManifest(urn);
    const nowIso = new Date().toISOString();

    if (!manifest) {
      await admin
        .from("part_files")
        .update({
          aps_urn: urn,
          aps_translation_status: "inprogress",
          aps_translation_progress: "Manifest not ready yet",
          aps_manifest_json: null,
          aps_last_error: null,
        })
        .eq("id", file.id);

      await saveApsDerivativeState(admin, {
        organizationId: part.organization_id,
        requestedBy: user.id,
        sourceType: "part_file",
        partFileId: file.id,
        fileName: file.file_name,
        storagePath: file.storage_path,
        objectKey: derivative?.aps_object_key || file.aps_object_key,
        objectId: derivative?.aps_object_id || file.aps_object_id,
        urn,
        status: "translating",
        progress: "Manifest not ready yet",
        manifestJson: null,
      });

      return NextResponse.json({
        success: true,
        urn,
        manifest: null,
        status: "inprogress",
        progress: "Manifest not ready yet",
      });
    }

    const status = getManifestStatus(manifest) || "unknown";
    const progress = getManifestProgress(manifest);
    const derivativeStatus = normalizeApsDerivativeStatus(status);

    await admin
      .from("part_files")
      .update({
        aps_urn: urn,
        aps_translation_status: toLegacyApsStatus(derivativeStatus),
        aps_translation_progress: progress,
        aps_manifest_json: manifest,
        aps_last_translated_at: derivativeStatus === "ready" ? nowIso : null,
        aps_last_error:
          derivativeStatus === "failed" ? "APS translation failed." : null,
      })
      .eq("id", file.id);

    await saveApsDerivativeState(admin, {
      organizationId: part.organization_id,
      requestedBy: user.id,
      sourceType: "part_file",
      partFileId: file.id,
      fileName: file.file_name,
      storagePath: file.storage_path,
      objectKey: derivative?.aps_object_key || file.aps_object_key,
      objectId: derivative?.aps_object_id || file.aps_object_id,
      urn,
      status: derivativeStatus,
      progress,
      manifestJson: manifest,
      lastError:
        derivativeStatus === "failed" ? "APS translation failed." : null,
    });

    return NextResponse.json({
      success: true,
      urn,
      manifest,
      status: derivativeStatus === "ready" ? "success" : status,
      progress,
    });
  } catch (manifestError) {
    const message =
      manifestError instanceof Error
        ? manifestError.message
        : "Failed to get APS manifest.";

    await admin
      .from("part_files")
      .update({
        aps_translation_status: "failed",
        aps_translation_progress: null,
        aps_last_error: message,
      })
      .eq("id", file.id);

    await saveApsDerivativeState(admin, {
      organizationId: part.organization_id,
      requestedBy: user.id,
      sourceType: "part_file",
      partFileId: file.id,
      fileName: file.file_name,
      storagePath: file.storage_path,
      objectKey: derivative?.aps_object_key || file.aps_object_key,
      objectId: derivative?.aps_object_id || file.aps_object_id,
      urn,
      status: "failed",
      progress: null,
      lastError: message,
    }).catch(() => null);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

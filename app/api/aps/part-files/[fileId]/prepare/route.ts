import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getApsStepViewerStatus,
  isApsStepViewerEnabled,
  startApsTranslation,
  toApsUrn,
  uploadObjectToAps,
} from "@/lib/aps";
import {
  getApsDerivativeForPartFile,
  isReusableApsDerivative,
  reserveApsTranslationQuota,
  saveApsDerivativeState,
  upsertApsDerivativeFromLegacy,
} from "@/lib/aps-derivatives";

type MembershipRow = {
  organization_id: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  aps_object_key: string | null;
  aps_object_id: string | null;
  aps_urn: string | null;
  aps_translation_status: string | null;
  aps_translation_progress: string | null;
  aps_last_error: string | null;
};

function sanitizeObjectKey(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export const runtime = "nodejs";

export async function POST(
  _request: Request,
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
        file_type,
        storage_path,
        aps_object_key,
        aps_object_id,
        aps_urn,
        aps_translation_status,
        aps_translation_progress,
        aps_last_error
      `,
    )
    .eq("id", fileId)
    .single();

  if (fileError || !fileRaw) {
    return NextResponse.json({ error: "Part file not found." }, { status: 404 });
  }

  const file = fileRaw as PartFileRow;
  const extension = file.file_name.split(".").pop()?.toLowerCase() ?? "";

  if (!["step", "stp"].includes(extension)) {
    return NextResponse.json(
      { error: "Only STEP/STP files are supported." },
      { status: 400 },
    );
  }

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
          lastError: file.aps_last_error,
        })
      : null;

  const cachedDerivative =
    legacyDerivative || (await getApsDerivativeForPartFile(admin, file.id));

  if (isReusableApsDerivative(cachedDerivative)) {
    return NextResponse.json({
      success: true,
      fileId: file.id,
      urn: cachedDerivative?.aps_urn,
      cached: true,
      status: cachedDerivative?.status || "unknown",
      progress: cachedDerivative?.progress,
    });
  }

  const nowIso = new Date().toISOString();
  let quotaReserved = false;
  let objectKey = file.aps_object_key;
  let objectId = file.aps_object_id;
  let urn = file.aps_urn;

  try {
    const quota = await reserveApsTranslationQuota(admin, part.organization_id);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error:
            "This organization has reached its monthly STEP preview translation quota.",
          quota,
        },
        { status: 429 },
      );
    }

    quotaReserved = true;

    if (!objectId || !urn) {
      const download = await admin.storage
        .from("part-files")
        .download(file.storage_path);

      if (download.error || !download.data) {
        return NextResponse.json(
          { error: download.error?.message || "Could not read part file." },
          { status: 400 },
        );
      }

      const fileBuffer = await download.data.arrayBuffer();

      objectKey =
        objectKey || `${file.id}-${sanitizeObjectKey(file.file_name)}`;

      const uploaded = await uploadObjectToAps({
        objectKey,
        fileBuffer,
        contentType: file.file_type || "application/octet-stream",
      });

      objectId = uploaded.objectId;
      urn = toApsUrn(uploaded.objectId);

      await admin
        .from("part_files")
        .update({
          aps_object_key: objectKey,
          aps_object_id: objectId,
          aps_urn: urn,
          aps_translation_status: "uploaded",
          aps_translation_progress: "Uploaded to APS",
          aps_last_prepared_at: nowIso,
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
        objectKey,
        objectId,
        urn,
        status: "uploaded",
        progress: "Uploaded to APS",
      });
    }

    await startApsTranslation(urn);

    await admin
      .from("part_files")
      .update({
        aps_object_key: objectKey,
        aps_object_id: objectId,
        aps_urn: urn,
        aps_translation_status: "inprogress",
        aps_translation_progress: "Translation requested",
        aps_last_prepared_at: nowIso,
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
      objectKey,
      objectId,
      urn,
      status: "translating",
      progress: "Translation requested",
    });

    return NextResponse.json({
      success: true,
      fileId: file.id,
      urn,
      cached: false,
      status: "inprogress",
      progress: "Translation requested",
      quota_reserved: quotaReserved,
    });
  } catch (prepareError) {
    const message =
      prepareError instanceof Error
        ? prepareError.message
        : "Failed to prepare STEP preview.";

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
      objectKey,
      objectId,
      urn,
      status: "failed",
      progress: null,
      lastError: message,
    }).catch(() => null);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

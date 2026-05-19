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
  getApsDerivativeForProviderPackageFile,
  isReusableApsDerivative,
  reserveApsTranslationQuota,
  saveApsDerivativeState,
  upsertApsDerivativeFromLegacy,
} from "@/lib/aps-derivatives";

type MembershipRow = {
  organization_id: string;
};

type ProviderPackageFileRow = {
  id: string;
  provider_request_package_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  source_type: string;
  provider_uploaded: boolean | null;
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

function getCandidateBuckets(file: ProviderPackageFileRow) {
  if (file.provider_uploaded) {
    return ["provider-package-files", "provider-files"];
  }

  if (file.source_type === "part_file") {
    return ["part-files"];
  }

  if (file.source_type === "service_request_uploaded_file") {
    return [
      "service-request-files",
      "service-request-uploads",
      "service-request-uploaded-files",
    ];
  }

  return [
    "provider-package-files",
    "part-files",
    "service-request-files",
    "service-request-uploads",
  ];
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
    .from("provider_package_files")
    .select(
      `
        id,
        provider_request_package_id,
        file_name,
        file_type,
        storage_path,
        source_type,
        provider_uploaded,
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
    return NextResponse.json(
      { error: "Provider package file not found." },
      { status: 404 },
    );
  }

  const file = fileRaw as ProviderPackageFileRow;
  const extension = file.file_name.split(".").pop()?.toLowerCase() ?? "";

  if (!["step", "stp"].includes(extension)) {
    return NextResponse.json(
      { error: "Only STEP/STP files are supported." },
      { status: 400 },
    );
  }

  const { data: pkg, error: pkgError } = await supabase
    .from("provider_request_packages")
    .select("provider_org_id, customer_org_id")
    .eq("id", file.provider_request_package_id)
    .single();

  if (pkgError || !pkg) {
    return NextResponse.json(
      { error: "Provider package not found." },
      { status: 404 },
    );
  }

  const allowed =
    membershipOrgIds.includes(pkg.provider_org_id) ||
    membershipOrgIds.includes(pkg.customer_org_id);

  if (!allowed) {
    return NextResponse.json(
      { error: "You do not have access to this package file." },
      { status: 403 },
    );
  }

  const ownerOrgId = file.provider_uploaded
    ? pkg.provider_org_id
    : pkg.customer_org_id;

  const legacyDerivative =
    file.aps_urn && !file.aps_last_error
      ? await upsertApsDerivativeFromLegacy(admin, {
          organizationId: ownerOrgId,
          requestedBy: user.id,
          sourceType: "provider_package_file",
          providerPackageFileId: file.id,
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
    legacyDerivative ||
    (await getApsDerivativeForProviderPackageFile(admin, file.id));

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
    const quota = await reserveApsTranslationQuota(admin, ownerOrgId);

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
      let fileBuffer: ArrayBuffer | null = null;
      let lastError: string | null = null;

      for (const bucket of getCandidateBuckets(file)) {
        const download = await admin.storage.from(bucket).download(file.storage_path);

        if (!download.error && download.data) {
          fileBuffer = await download.data.arrayBuffer();
          lastError = null;
          break;
        }

        lastError =
          download.error?.message || "Could not read provider package file.";
      }

      if (!fileBuffer) {
        return NextResponse.json(
          { error: lastError || "Could not read provider package file." },
          { status: 400 },
        );
      }

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
        .from("provider_package_files")
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
        organizationId: ownerOrgId,
        requestedBy: user.id,
        sourceType: "provider_package_file",
        providerPackageFileId: file.id,
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
      .from("provider_package_files")
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
      organizationId: ownerOrgId,
      requestedBy: user.id,
      sourceType: "provider_package_file",
      providerPackageFileId: file.id,
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
      .from("provider_package_files")
      .update({
        aps_translation_status: "failed",
        aps_translation_progress: null,
        aps_last_error: message,
      })
      .eq("id", file.id);

    await saveApsDerivativeState(admin, {
      organizationId: ownerOrgId,
      requestedBy: user.id,
      sourceType: "provider_package_file",
      providerPackageFileId: file.id,
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

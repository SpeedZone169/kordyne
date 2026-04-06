import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isApsStepViewerEnabled,
  startApsTranslation,
  toApsUrn,
  uploadObjectToAps,
} from "@/lib/aps";

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
    return NextResponse.json(
      { error: "APS STEP viewer is disabled." },
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
        provider_uploaded
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

  let fileBuffer: ArrayBuffer | null = null;
  let lastError: string | null = null;

  for (const bucket of getCandidateBuckets(file)) {
    const download = await admin.storage.from(bucket).download(file.storage_path);

    if (!download.error && download.data) {
      fileBuffer = await download.data.arrayBuffer();
      lastError = null;
      break;
    }

    lastError = download.error?.message || "Could not read provider package file.";
  }

  if (!fileBuffer) {
    return NextResponse.json(
      { error: lastError || "Could not read provider package file." },
      { status: 400 },
    );
  }

  try {
    const objectKey = `${file.id}-${sanitizeObjectKey(file.file_name)}`;

    const uploaded = await uploadObjectToAps({
      objectKey,
      fileBuffer,
      contentType: file.file_type || "application/octet-stream",
    });

    const urn = toApsUrn(uploaded.objectId);
    await startApsTranslation(urn);

    return NextResponse.json({
      success: true,
      fileId: file.id,
      urn,
    });
  } catch (prepareError) {
    return NextResponse.json(
      {
        error:
          prepareError instanceof Error
            ? prepareError.message
            : "Failed to prepare STEP preview.",
      },
      { status: 500 },
    );
  }
}
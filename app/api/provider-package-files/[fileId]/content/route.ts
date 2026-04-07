import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    "provider-files",
    "part-files",
    "service-request-files",
    "service-request-uploads",
    "service-request-uploaded-files",
  ];
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function getPreferredContentType(
  fileName: string,
  fileType: string | null,
): string {
  const extension = getFileExtension(fileName);
  const normalizedType = (fileType || "").toLowerCase();

  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "webp") return "image/webp";
  if (extension === "gif") return "image/gif";
  if (extension === "svg") return "image/svg+xml";
  if (extension === "bmp") return "image/bmp";
  if (extension === "stl") return "model/stl";
  if (extension === "step" || extension === "stp") return "application/step";

  if (normalizedType) {
    return normalizedType;
  }

  return "application/octet-stream";
}

function buildContentDisposition(
  mode: "inline" | "download",
  fileName: string,
) {
  const safeAscii = fileName.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const encoded = encodeURIComponent(fileName);

  if (mode === "download") {
    return `attachment; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
  }

  return `inline; filename="${safeAscii}"; filename*=UTF-8''${encoded}`;
}

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "download" ? "download" : "inline";

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

  const { data: pkg, error: pkgError } = await supabase
    .from("provider_request_packages")
    .select("provider_org_id, customer_org_id, published_at")
    .eq("id", file.provider_request_package_id)
    .single();

  if (pkgError || !pkg) {
    return NextResponse.json(
      { error: "Provider package not found." },
      { status: 404 },
    );
  }

  const allowed =
    membershipOrgIds.includes(pkg.customer_org_id) ||
    (membershipOrgIds.includes(pkg.provider_org_id) && pkg.published_at);

  if (!allowed) {
    return NextResponse.json(
      { error: "You do not have access to this package file." },
      { status: 403 },
    );
  }

  let fileBlob: Blob | null = null;
  let lastError: string | null = null;

  for (const bucket of getCandidateBuckets(file)) {
    const download = await admin.storage.from(bucket).download(file.storage_path);

    if (!download.error && download.data) {
      fileBlob = download.data;
      lastError = null;
      break;
    }

    lastError =
      download.error?.message || "Could not read provider package file.";
  }

  if (!fileBlob) {
    return NextResponse.json(
      { error: lastError || "Could not read provider package file." },
      { status: 404 },
    );
  }

  const contentType = getPreferredContentType(file.file_name, file.file_type);

  return new Response(fileBlob.stream(), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": buildContentDisposition(mode, file.file_name),
      "Content-Length": String(fileBlob.size),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
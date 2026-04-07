import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type MembershipRow = {
  organization_id: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
};

type PartRow = {
  id: string;
  organization_id: string;
};

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
    .from("part_files")
    .select("id, part_id, file_name, file_type, storage_path")
    .eq("id", fileId)
    .single();

  if (fileError || !fileRaw) {
    return NextResponse.json(
      { error: "Part file not found." },
      { status: 404 },
    );
  }

  const file = fileRaw as PartFileRow;

  const { data: partRaw, error: partError } = await supabase
    .from("parts")
    .select("id, organization_id")
    .eq("id", file.part_id)
    .single();

  if (partError || !partRaw) {
    return NextResponse.json(
      { error: "Part not found." },
      { status: 404 },
    );
  }

  const part = partRaw as PartRow;

  if (!membershipOrgIds.includes(part.organization_id)) {
    return NextResponse.json(
      { error: "You do not have access to this part file." },
      { status: 403 },
    );
  }

  const download = await admin.storage
    .from("part-files")
    .download(file.storage_path);

  if (download.error || !download.data) {
    return NextResponse.json(
      { error: download.error?.message || "Could not read part file." },
      { status: 404 },
    );
  }

  const fileBlob = download.data;
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
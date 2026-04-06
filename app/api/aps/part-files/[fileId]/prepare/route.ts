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

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
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
    return NextResponse.json(
      { error: "APS STEP viewer is disabled." },
      { status: 503 },
    );
  }

  const supabase = await createClient();

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

  const { data: file, error: fileError } = await supabase
    .from("part_files")
    .select("id, part_id, file_name, file_type, storage_path")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "Part file not found." }, { status: 404 });
  }

  const typedFile = file as PartFileRow;
  const extension = typedFile.file_name.split(".").pop()?.toLowerCase() ?? "";

  if (!["step", "stp"].includes(extension)) {
    return NextResponse.json(
      { error: "Only STEP/STP files are supported." },
      { status: 400 },
    );
  }

  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("organization_id")
    .eq("id", typedFile.part_id)
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

  const admin = createAdminClient();

  const download = await admin.storage
    .from("part-files")
    .download(typedFile.storage_path);

  if (download.error || !download.data) {
    return NextResponse.json(
      { error: download.error?.message || "Could not read part file." },
      { status: 400 },
    );
  }

  const fileBuffer = await download.data.arrayBuffer();

  try {
    const objectKey = `${typedFile.id}-${sanitizeObjectKey(
      typedFile.file_name,
    )}`;

    const uploaded = await uploadObjectToAps({
      objectKey,
      fileBuffer,
      contentType: typedFile.file_type || "application/octet-stream",
    });

    const urn = toApsUrn(uploaded.objectId);
    const translation = await startApsTranslation(urn);

    return NextResponse.json({
      success: true,
      fileId: typedFile.id,
      urn,
      translation,
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
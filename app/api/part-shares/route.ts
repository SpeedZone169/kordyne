import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SharePolicy =
  | "metadata_only"
  | "preview_only"
  | "selected_files"
  | "downloadable_selected_files";

type ShareRequestBody = {
  partId?: string;
  externalEmail?: string;
  sharePolicy?: SharePolicy;
  fileIds?: string[];
};

const SHARE_POLICIES = new Set<SharePolicy>([
  "metadata_only",
  "preview_only",
  "selected_files",
  "downloadable_selected_files",
]);

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: ShareRequestBody;

  try {
    body = (await request.json()) as ShareRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const partId = body.partId?.trim();
  const externalEmail = normalizeEmail(body.externalEmail ?? "");
  const sharePolicy = body.sharePolicy ?? "metadata_only";
  const fileIds = Array.from(new Set((body.fileIds ?? []).filter(Boolean)));

  if (!partId) {
    return NextResponse.json({ error: "partId is required." }, { status: 400 });
  }

  if (!externalEmail || !externalEmail.includes("@")) {
    return NextResponse.json(
      { error: "A valid external email is required." },
      { status: 400 },
    );
  }

  if (!SHARE_POLICIES.has(sharePolicy)) {
    return NextResponse.json({ error: "Invalid sharing level." }, { status: 400 });
  }

  if (
    (sharePolicy === "selected_files" ||
      sharePolicy === "downloadable_selected_files") &&
    fileIds.length === 0
  ) {
    return NextResponse.json(
      { error: "Select at least one file for this sharing level." },
      { status: 400 },
    );
  }

  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("id, organization_id, part_family_id")
    .eq("id", partId)
    .maybeSingle();

  if (partError || !part) {
    return NextResponse.json({ error: "Part not found." }, { status: 404 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", part.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!["admin", "engineer"].includes(membership?.role ?? "")) {
    return NextResponse.json(
      { error: "Only admins and engineers can share parts." },
      { status: 403 },
    );
  }

  if (fileIds.length > 0) {
    const { data: files, error: filesError } = await supabase
      .from("part_files")
      .select("id")
      .eq("part_id", part.id)
      .in("id", fileIds);

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

    if ((files ?? []).length !== fileIds.length) {
      return NextResponse.json(
        { error: "One or more selected files do not belong to this part." },
        { status: 400 },
      );
    }
  }

  const { data: share, error: shareError } = await supabase
    .from("part_external_shares")
    .insert({
      part_id: part.id,
      part_family_id: part.part_family_id,
      owner_org_id: part.organization_id,
      external_email: externalEmail,
      share_policy: sharePolicy,
      status: "invited",
      invited_by: user.id,
    })
    .select("id")
    .single();

  if (shareError || !share?.id) {
    return NextResponse.json(
      { error: shareError?.message ?? "Failed to create part share." },
      { status: 500 },
    );
  }

  if (fileIds.length > 0) {
    const canDownload = sharePolicy === "downloadable_selected_files";
    const grants = fileIds.map((fileId) => ({
      part_share_id: share.id,
      part_id: part.id,
      part_file_id: fileId,
      can_preview: true,
      can_download: canDownload,
      granted_by: user.id,
    }));

    const { error: grantsError } = await supabase
      .from("part_external_file_grants")
      .insert(grants);

    if (grantsError) {
      return NextResponse.json({ error: grantsError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    shareId: share.id,
  });
}

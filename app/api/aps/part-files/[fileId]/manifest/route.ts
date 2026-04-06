import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApsManifest, isApsStepViewerEnabled } from "@/lib/aps";

type MembershipRow = {
  organization_id: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
};

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  const { fileId } = await params;

  if (!isApsStepViewerEnabled()) {
    return NextResponse.json(
      { error: "APS STEP viewer is disabled." },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const urn = url.searchParams.get("urn")?.trim();

  if (!urn) {
    return NextResponse.json({ error: "Missing urn." }, { status: 400 });
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

  const { data: file, error: fileError } = await supabase
    .from("part_files")
    .select("id, part_id")
    .eq("id", fileId)
    .single();

  if (fileError || !file) {
    return NextResponse.json({ error: "Part file not found." }, { status: 404 });
  }

  const typedFile = file as PartFileRow;

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

  try {
    const manifest = await getApsManifest(urn);

    return NextResponse.json({
      success: true,
      urn,
      manifest,
    });
  } catch (manifestError) {
    return NextResponse.json(
      {
        error:
          manifestError instanceof Error
            ? manifestError.message
            : "Failed to get APS manifest.",
      },
      { status: 500 },
    );
  }
}
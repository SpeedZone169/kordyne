import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getApsManifest, isApsStepViewerEnabled } from "@/lib/aps";

type MembershipRow = {
  organization_id: string;
};

type ProviderPackageFileRow = {
  id: string;
  provider_request_package_id: string;
  aps_urn: string | null;
  aps_translation_status: string | null;
  aps_translation_progress: string | null;
};

function getManifestStatus(manifest: unknown): string | null {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const value = (manifest as Record<string, unknown>).status;
  return typeof value === "string" ? value.toLowerCase() : null;
}

function getManifestProgress(manifest: unknown): string | null {
  if (!manifest || typeof manifest !== "object") {
    return null;
  }

  const value = (manifest as Record<string, unknown>).progress;
  return typeof value === "string" ? value : null;
}

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
        aps_urn,
        aps_translation_status,
        aps_translation_progress
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

  const url = new URL(request.url);
  const urn = file.aps_urn || url.searchParams.get("urn")?.trim() || "";

  if (!urn) {
    return NextResponse.json(
      { error: "This STEP file has not been prepared yet." },
      { status: 400 },
    );
  }

  try {
    const manifest = await getApsManifest(urn);
    const nowIso = new Date().toISOString();

    if (!manifest) {
      await admin
        .from("provider_package_files")
        .update({
          aps_urn: urn,
          aps_translation_status: "inprogress",
          aps_translation_progress: "Manifest not ready yet",
          aps_manifest_json: null,
          aps_last_error: null,
        })
        .eq("id", file.id);

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

    await admin
      .from("provider_package_files")
      .update({
        aps_urn: urn,
        aps_translation_status: status,
        aps_translation_progress: progress,
        aps_manifest_json: manifest,
        aps_last_translated_at: status === "success" ? nowIso : null,
        aps_last_error: status === "failed" ? "APS translation failed." : null,
      })
      .eq("id", file.id);

    return NextResponse.json({
      success: true,
      urn,
      manifest,
      status,
      progress,
    });
  } catch (manifestError) {
    const message =
      manifestError instanceof Error
        ? manifestError.message
        : "Failed to get STEP manifest.";

    await admin
      .from("provider_package_files")
      .update({
        aps_translation_status: "failed",
        aps_translation_progress: null,
        aps_last_error: message,
      })
      .eq("id", file.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
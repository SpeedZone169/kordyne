import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login?next=/dashboard/design-connectors/downloads", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"));
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { ok: false, error: membershipError.message },
      { status: 500 },
    );
  }

  if (!membership?.organization_id || membership.role !== "admin") {
    return NextResponse.json(
      { ok: false, error: "Only organization admins can download connector packages." },
      { status: 403 },
    );
  }

  const { data: entitlement, error: entitlementError } = await supabase
    .from("organization_connector_entitlements")
    .select("current_release_id, is_enabled")
    .eq("organization_id", membership.organization_id)
    .eq("provider_key", "fusion")
    .maybeSingle();

  if (entitlementError) {
    return NextResponse.json(
      { ok: false, error: entitlementError.message },
      { status: 500 },
    );
  }

  if (!entitlement?.is_enabled) {
    return NextResponse.json(
      { ok: false, error: "Fusion connector is not enabled for this organization." },
      { status: 403 },
    );
  }

  const admin = createDesignAppAdminClient();

  let release:
    | {
        id: string;
        storage_bucket: string;
        storage_path: string;
        file_name: string;
        is_active: boolean;
      }
    | null = null;

  if (entitlement.current_release_id) {
    const { data } = await admin
      .from("connector_distribution_releases")
      .select("id, storage_bucket, storage_path, file_name, is_active")
      .eq("id", entitlement.current_release_id)
      .maybeSingle();

    release = data;
  }

  if (!release) {
    const { data } = await admin
      .from("connector_distribution_releases")
      .select("id, storage_bucket, storage_path, file_name, is_active")
      .eq("provider_key", "fusion")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    release = data;
  }

  if (!release?.storage_bucket || !release.storage_path) {
    return NextResponse.json(
      { ok: false, error: "No active Fusion connector package is configured." },
      { status: 404 },
    );
  }

  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from(release.storage_bucket)
    .createSignedUrl(release.storage_path, 300, {
      download: release.file_name,
    });

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: signedUrlError?.message ?? "Could not create download link." },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signedUrlData.signedUrl, 302);
}
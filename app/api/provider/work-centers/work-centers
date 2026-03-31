import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_CENTER_TYPES = new Set([
  "machine",
  "work_cell",
  "manual_station",
  "inspection_station",
  "design_station",
]);

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);

  const providerOrgId =
    typeof body?.providerOrgId === "string" ? body.providerOrgId : null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const code =
    typeof body?.code === "string" && body.code.trim().length > 0
      ? body.code.trim()
      : null;
  const centerType =
    typeof body?.centerType === "string" ? body.centerType : "machine";
  const description =
    typeof body?.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;
  const locationLabel =
    typeof body?.locationLabel === "string" && body.locationLabel.trim().length > 0
      ? body.locationLabel.trim()
      : null;
  const active = typeof body?.active === "boolean" ? body.active : true;

  if (!providerOrgId) {
    return NextResponse.json(
      { error: "Provider organization is required." },
      { status: 400 },
    );
  }

  if (!name) {
    return NextResponse.json(
      { error: "Work center name is required." },
      { status: 400 },
    );
  }

  if (!ALLOWED_CENTER_TYPES.has(centerType)) {
    return NextResponse.json(
      { error: "Invalid work center type." },
      { status: 400 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", providerOrgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json(
      { error: membershipError.message },
      { status: 500 },
    );
  }

  if (!membership || !["admin", "engineer"].includes(membership.role ?? "")) {
    return NextResponse.json(
      { error: "You do not have permission to manage work centers." },
      { status: 403 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("provider_work_centers")
    .insert({
      provider_org_id: providerOrgId,
      name,
      code,
      center_type: centerType,
      description,
      location_label: locationLabel,
      active,
      created_by_user_id: user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    workCenterId: inserted.id,
    success: true,
  });
}
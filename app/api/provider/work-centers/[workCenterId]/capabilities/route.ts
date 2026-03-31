import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{
    workCenterId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { workCenterId } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const providerCapabilityId =
    typeof body?.providerCapabilityId === "string"
      ? body.providerCapabilityId
      : null;

  if (!providerCapabilityId) {
    return NextResponse.json(
      { error: "Provider capability is required." },
      { status: 400 },
    );
  }

  const { data: workCenter, error: workCenterError } = await supabase
    .from("provider_work_centers")
    .select("id, provider_org_id")
    .eq("id", workCenterId)
    .maybeSingle();

  if (workCenterError) {
    return NextResponse.json(
      { error: workCenterError.message },
      { status: 500 },
    );
  }

  if (!workCenter) {
    return NextResponse.json(
      { error: "Work center not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", workCenter.provider_org_id)
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
      { error: "You do not have permission to manage capability mappings." },
      { status: 403 },
    );
  }

  const { data: capability, error: capabilityError } = await supabase
    .from("provider_capabilities")
    .select("id, provider_org_id")
    .eq("id", providerCapabilityId)
    .maybeSingle();

  if (capabilityError) {
    return NextResponse.json(
      { error: capabilityError.message },
      { status: 500 },
    );
  }

  if (!capability || capability.provider_org_id !== workCenter.provider_org_id) {
    return NextResponse.json(
      { error: "Capability does not belong to this provider organization." },
      { status: 400 },
    );
  }

  const { error: insertError } = await supabase
    .from("provider_work_center_capabilities")
    .insert({
      provider_work_center_id: workCenterId,
      provider_capability_id: providerCapabilityId,
      created_by_user_id: user.id,
    });

  if (insertError && insertError.code !== "23505") {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
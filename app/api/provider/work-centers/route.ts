import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDER_WORK_CENTER_TYPES,
  isAllowedValue,
  jsonError,
  requireProviderOrgManager,
  requireRouteUser,
} from "@/lib/provider-schedule";

export async function POST(request: Request) {
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
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
    typeof body?.centerType === "string" ? body.centerType : null;
  const description =
    typeof body?.description === "string" && body.description.trim().length > 0
      ? body.description.trim()
      : null;
  const locationLabel =
    typeof body?.locationLabel === "string" &&
    body.locationLabel.trim().length > 0
      ? body.locationLabel.trim()
      : null;
  const active = typeof body?.active === "boolean" ? body.active : true;

  if (!providerOrgId) {
    return jsonError("Provider organization is required.", 400);
  }

  if (!name) {
    return jsonError("Work center name is required.", 400);
  }

  if (!isAllowedValue(centerType, PROVIDER_WORK_CENTER_TYPES)) {
    return jsonError("Invalid work center type.", 400);
  }

  const access = await requireProviderOrgManager(
    supabase,
    providerOrgId,
    auth.user.id,
    "manage work centers",
  );

  if (!access.ok) {
    return access.response;
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
      created_by_user_id: auth.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return jsonError(insertError.message, 500);
  }

  return NextResponse.json(
    {
      workCenterId: inserted.id,
      success: true,
    },
    { status: 201 },
  );
}
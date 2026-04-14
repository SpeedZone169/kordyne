import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCapabilityInOrg,
  getManagedWorkCenter,
  jsonError,
  requireRouteUser,
} from "@/lib/provider-schedule";

type RouteContext = {
  params: Promise<{
    workCenterId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { workCenterId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);
  const providerCapabilityId =
    typeof body?.providerCapabilityId === "string"
      ? body.providerCapabilityId
      : null;

  if (!providerCapabilityId) {
    return jsonError("Provider capability is required.", 400);
  }

  const workCenterResult = await getManagedWorkCenter(
    supabase,
    workCenterId,
    auth.user.id,
    "manage capability mappings",
  );

  if (!workCenterResult.ok) {
    return workCenterResult.response;
  }

  const capabilityResult = await getCapabilityInOrg(
    supabase,
    providerCapabilityId,
    workCenterResult.workCenter.provider_org_id,
  );

  if (!capabilityResult.ok) {
    return capabilityResult.response;
  }

  const { error: insertError } = await supabase
    .from("provider_work_center_capabilities")
    .insert({
      provider_work_center_id: workCenterId,
      provider_capability_id: providerCapabilityId,
      created_by_user_id: auth.user.id,
    });

  if (insertError && insertError.code !== "23505") {
    return jsonError(insertError.message, 500);
  }

  return NextResponse.json({ success: true });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDER_SCHEDULE_BLOCK_TYPES,
  getWorkCenterInOrg,
  isAllowedValue,
  jsonError,
  parseDateRange,
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
  const providerWorkCenterId =
    typeof body?.providerWorkCenterId === "string" &&
    body.providerWorkCenterId.length > 0
      ? body.providerWorkCenterId
      : null;
  const blockType =
    typeof body?.blockType === "string" ? body.blockType : null;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const notes =
    typeof body?.notes === "string" && body.notes.trim().length > 0
      ? body.notes.trim()
      : null;
  const startDate =
    typeof body?.startDate === "string" ? body.startDate : null;
  const endDate = typeof body?.endDate === "string" ? body.endDate : null;
  const allDay = typeof body?.allDay === "boolean" ? body.allDay : true;

  if (!providerOrgId) {
    return jsonError("Provider organization is required.", 400);
  }

  if (!providerWorkCenterId) {
    return jsonError("Work center is required.", 400);
  }

  if (!isAllowedValue(blockType, PROVIDER_SCHEDULE_BLOCK_TYPES)) {
    return jsonError("Invalid block type.", 400);
  }

  if (!title) {
    return jsonError("Block title is required.", 400);
  }

  const access = await requireProviderOrgManager(
    supabase,
    providerOrgId,
    auth.user.id,
    "manage schedule blocks",
  );

  if (!access.ok) {
    return access.response;
  }

  const workCenterResult = await getWorkCenterInOrg(
    supabase,
    providerWorkCenterId,
    providerOrgId,
  );

  if (!workCenterResult.ok) {
    return workCenterResult.response;
  }

  const rangeResult = parseDateRange(startDate, endDate);
  if (!rangeResult.ok) {
    return rangeResult.response;
  }

  const { data: inserted, error: insertError } = await supabase
    .from("provider_schedule_blocks")
    .insert({
      provider_org_id: providerOrgId,
      provider_work_center_id: providerWorkCenterId,
      block_type: blockType,
      title,
      notes,
      starts_at: rangeResult.startsAt,
      ends_at: rangeResult.endsAt,
      all_day: allDay,
      created_by_user_id: auth.user.id,
    })
    .select("id")
    .single();

  if (insertError) {
    return jsonError(insertError.message, 500);
  }

  return NextResponse.json(
    {
      blockId: inserted.id,
      success: true,
    },
    { status: 201 },
  );
}
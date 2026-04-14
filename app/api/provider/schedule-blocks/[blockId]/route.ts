import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  PROVIDER_SCHEDULE_BLOCK_TYPES,
  getManagedScheduleBlock,
  getWorkCenterInOrg,
  isAllowedValue,
  jsonError,
  parseDateRange,
  requireRouteUser,
} from "@/lib/provider-schedule";

type RouteContext = {
  params: Promise<{
    blockId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json().catch(() => null);

  const providerWorkCenterId =
    typeof body?.providerWorkCenterId === "string"
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

  if (!providerWorkCenterId) {
    return jsonError("Work center is required.", 400);
  }

  if (!isAllowedValue(blockType, PROVIDER_SCHEDULE_BLOCK_TYPES)) {
    return jsonError("Invalid block type.", 400);
  }

  if (!title) {
    return jsonError("Block title is required.", 400);
  }

  const blockResult = await getManagedScheduleBlock(
    supabase,
    blockId,
    auth.user.id,
    "manage schedule blocks",
  );

  if (!blockResult.ok) {
    return blockResult.response;
  }

  const workCenterResult = await getWorkCenterInOrg(
    supabase,
    providerWorkCenterId,
    blockResult.block.provider_org_id,
  );

  if (!workCenterResult.ok) {
    return workCenterResult.response;
  }

  const rangeResult = parseDateRange(startDate, endDate);
  if (!rangeResult.ok) {
    return rangeResult.response;
  }

  const { error: updateError } = await supabase
    .from("provider_schedule_blocks")
    .update({
      provider_work_center_id: providerWorkCenterId,
      block_type: blockType,
      title,
      notes,
      starts_at: rangeResult.startsAt,
      ends_at: rangeResult.endsAt,
      all_day: allDay,
      updated_at: new Date().toISOString(),
    })
    .eq("id", blockId);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { blockId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
  }

  const blockResult = await getManagedScheduleBlock(
    supabase,
    blockId,
    auth.user.id,
    "delete schedule blocks",
  );

  if (!blockResult.ok) {
    return blockResult.response;
  }

  const { error: deleteError } = await supabase
    .from("provider_schedule_blocks")
    .delete()
    .eq("id", blockId);

  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  return NextResponse.json({ success: true });
}
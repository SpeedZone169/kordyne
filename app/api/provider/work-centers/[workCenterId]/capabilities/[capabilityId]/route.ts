import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getManagedWorkCenter,
  requireRouteUser,
} from "@/lib/provider-schedule";

type RouteContext = {
  params: Promise<{
    workCenterId: string;
    capabilityId: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { workCenterId, capabilityId } = await context.params;
  const supabase = await createClient();

  const auth = await requireRouteUser(supabase);
  if (!auth.ok) {
    return auth.response;
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

  const { error: deleteError } = await supabase
    .from("provider_work_center_capabilities")
    .delete()
    .eq("provider_work_center_id", workCenterId)
    .eq("provider_capability_id", capabilityId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
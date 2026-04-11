import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateResourceCapabilityBody = {
  resourceId?: string;
  capabilityId?: string;
  priorityRank?: number | null;
  throughputUnitsPerHour?: number | null;
  setupMinutes?: number | null;
  runMinutesPerUnit?: number | null;
  minimumBatchQty?: number | null;
  maximumBatchQty?: number | null;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  return value;
}

function normalizeRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return jsonError(userError.message, 401);
  }

  if (!user) {
    return jsonError("You must be signed in.", 401);
  }

  let body: CreateResourceCapabilityBody;

  try {
    body = (await request.json()) as CreateResourceCapabilityBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const resourceId = normalizeRequiredText(body.resourceId);
  const capabilityId = normalizeRequiredText(body.capabilityId);

  const priorityRank = normalizeOptionalNumber(body.priorityRank);
  const throughputUnitsPerHour = normalizeOptionalNumber(body.throughputUnitsPerHour);
  const setupMinutes = normalizeOptionalNumber(body.setupMinutes);
  const runMinutesPerUnit = normalizeOptionalNumber(body.runMinutesPerUnit);
  const minimumBatchQty = normalizeOptionalNumber(body.minimumBatchQty);
  const maximumBatchQty = normalizeOptionalNumber(body.maximumBatchQty);

  if (!resourceId) {
    return jsonError("resourceId is required.", 400);
  }

  if (!capabilityId) {
    return jsonError("capabilityId is required.", 400);
  }

  if (priorityRank != null && priorityRank < 1) {
    return jsonError("priorityRank must be 1 or greater.", 400);
  }

  if (throughputUnitsPerHour != null && throughputUnitsPerHour < 0) {
    return jsonError("throughputUnitsPerHour must be 0 or greater.", 400);
  }

  if (setupMinutes != null && setupMinutes < 0) {
    return jsonError("setupMinutes must be 0 or greater.", 400);
  }

  if (runMinutesPerUnit != null && runMinutesPerUnit < 0) {
    return jsonError("runMinutesPerUnit must be 0 or greater.", 400);
  }

  if (minimumBatchQty != null && minimumBatchQty < 1) {
    return jsonError("minimumBatchQty must be 1 or greater.", 400);
  }

  if (maximumBatchQty != null && maximumBatchQty < 1) {
    return jsonError("maximumBatchQty must be 1 or greater.", 400);
  }

  if (
    minimumBatchQty != null &&
    maximumBatchQty != null &&
    minimumBatchQty > maximumBatchQty
  ) {
    return jsonError("minimumBatchQty cannot be greater than maximumBatchQty.", 400);
  }

  const resourceResult = await supabase
    .from("internal_resources")
    .select("id, organization_id, name")
    .eq("id", resourceId)
    .maybeSingle();

  if (resourceResult.error) {
    return jsonError(resourceResult.error.message, 500);
  }

  if (!resourceResult.data) {
    return jsonError("Resource not found.", 404);
  }

  const resource = resourceResult.data as {
    id: string;
    organization_id: string;
    name: string;
  };

  const capabilityResult = await supabase
    .from("internal_capabilities")
    .select("id, organization_id, code, name")
    .eq("id", capabilityId)
    .maybeSingle();

  if (capabilityResult.error) {
    return jsonError(capabilityResult.error.message, 500);
  }

  if (!capabilityResult.data) {
    return jsonError("Capability not found.", 404);
  }

  const capability = capabilityResult.data as {
    id: string;
    organization_id: string;
    code: string;
    name: string;
  };

  if (resource.organization_id !== capability.organization_id) {
    return jsonError("Resource and capability must belong to the same organization.", 400);
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", resource.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipResult.error) {
    return jsonError(membershipResult.error.message, 500);
  }

  if (!membershipResult.data) {
    return jsonError("You do not have access to this organization.", 403);
  }

  const membership = membershipResult.data as {
    organization_id: string;
    role: string;
  };

  if (membership.role !== "admin") {
    return jsonError("Only customer organization admins can map capabilities.", 403);
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", resource.organization_id)
    .maybeSingle();

  if (organizationResult.error) {
    return jsonError(organizationResult.error.message, 500);
  }

  if (!organizationResult.data) {
    return jsonError("Organization not found.", 404);
  }

  const organization = organizationResult.data as {
    id: string;
    organization_type: string | null;
  };

  if (organization.organization_type !== "customer") {
    return jsonError("Capability mapping is only available for customer organizations.", 403);
  }

  const insertResult = await supabase
    .from("internal_resource_capabilities")
    .insert({
      resource_id: resource.id,
      capability_id: capability.id,
      priority_rank: priorityRank,
      throughput_units_per_hour: throughputUnitsPerHour,
      setup_minutes: setupMinutes,
      run_minutes_per_unit: runMinutesPerUnit,
      minimum_batch_qty: minimumBatchQty,
      maximum_batch_qty: maximumBatchQty,
    })
    .select(
      "id, resource_id, capability_id, priority_rank, throughput_units_per_hour, setup_minutes, run_minutes_per_unit, minimum_batch_qty, maximum_batch_qty, created_at",
    )
    .single();

  if (insertResult.error) {
    const isDuplicate =
      insertResult.error.code === "23505" ||
      insertResult.error.message.toLowerCase().includes("duplicate");

    return jsonError(
      isDuplicate
        ? "This capability is already mapped to that resource."
        : insertResult.error.message,
      isDuplicate ? 409 : 500,
    );
  }

  return NextResponse.json(
    {
      resourceCapability: insertResult.data,
      resource: {
        id: resource.id,
        name: resource.name,
      },
      capability: {
        id: capability.id,
        code: capability.code,
        name: capability.name,
      },
    },
    { status: 201 },
  );
}
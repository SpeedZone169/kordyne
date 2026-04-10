import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateResourceBody = {
  organizationId?: string;
  name?: string;
  resourceType?: string;
  serviceDomain?: string;
  locationLabel?: string | null;
  notes?: string | null;
};

const ALLOWED_RESOURCE_TYPES = new Set([
  "printer",
  "cnc_machine",
  "cad_seat",
  "scanner",
  "sheet_metal_machine",
  "composites_cell",
  "inspection_station",
  "finishing_station",
  "oven",
  "manual_cell",
  "operator",
  "work_center",
]);

const ALLOWED_SERVICE_DOMAINS = new Set([
  "additive",
  "cnc",
  "cad",
  "scanning",
  "composites",
  "sheet_metal",
  "qa",
  "finishing",
  "assembly",
  "general",
]);

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function normalizeOptionalText(value: unknown): string | null {
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

  let body: CreateResourceBody;

  try {
    body = (await request.json()) as CreateResourceBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const organizationId = normalizeOptionalText(body.organizationId);
  const name = normalizeOptionalText(body.name);
  const resourceType = normalizeOptionalText(body.resourceType);
  const serviceDomain = normalizeOptionalText(body.serviceDomain);
  const locationLabel = normalizeOptionalText(body.locationLabel);
  const notes = normalizeOptionalText(body.notes);

  if (!organizationId) {
    return jsonError("organizationId is required.", 400);
  }

  if (!name) {
    return jsonError("name is required.", 400);
  }

  if (!resourceType || !ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    return jsonError("resourceType is invalid.", 400);
  }

  if (!serviceDomain || !ALLOWED_SERVICE_DOMAINS.has(serviceDomain)) {
    return jsonError("serviceDomain is invalid.", 400);
  }

  const membershipResult = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", organizationId)
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
    return jsonError("Only customer organization admins can create resources.", 403);
  }

  const organizationResult = await supabase
    .from("organizations")
    .select("id, organization_type")
    .eq("id", organizationId)
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
    return jsonError("Resources can only be created for customer organizations.", 403);
  }

  const insertResult = await supabase
    .from("internal_resources")
    .insert({
      organization_id: organizationId,
      name,
      resource_type: resourceType,
      service_domain: serviceDomain,
      location_label: locationLabel,
      notes,
      status_source: "manual",
      current_status: "idle",
      active: true,
    })
    .select(
      "id, organization_id, name, resource_type, service_domain, current_status, status_source, active, location_label, notes, created_at",
    )
    .single();

  if (insertResult.error) {
    const isDuplicate =
      insertResult.error.code === "23505" ||
      insertResult.error.message.toLowerCase().includes("duplicate");

    return jsonError(
      isDuplicate
        ? "A resource with this name already exists in the organization."
        : insertResult.error.message,
      isDuplicate ? 409 : 500,
    );
  }

  return NextResponse.json({ resource: insertResult.data }, { status: 201 });
}
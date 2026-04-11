import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateCapabilityBody = {
  organizationId?: string;
  serviceDomain?: string;
  code?: string;
  name?: string;
  description?: string | null;
};

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

function normalizeCapabilityCode(value: string | null): string | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized.length > 0 ? normalized : null;
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

  let body: CreateCapabilityBody;

  try {
    body = (await request.json()) as CreateCapabilityBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const organizationId = normalizeOptionalText(body.organizationId);
  const serviceDomain = normalizeOptionalText(body.serviceDomain);
  const rawCode = normalizeOptionalText(body.code);
  const code = normalizeCapabilityCode(rawCode);
  const name = normalizeOptionalText(body.name);
  const description = normalizeOptionalText(body.description);

  if (!organizationId) {
    return jsonError("organizationId is required.", 400);
  }

  if (!serviceDomain || !ALLOWED_SERVICE_DOMAINS.has(serviceDomain)) {
    return jsonError("serviceDomain is invalid.", 400);
  }

  if (!code) {
    return jsonError("code is required.", 400);
  }

  if (!name) {
    return jsonError("name is required.", 400);
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
    return jsonError(
      "Only customer organization admins can create capabilities.",
      403,
    );
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
    return jsonError(
      "Capabilities can only be created for customer organizations.",
      403,
    );
  }

  const insertResult = await supabase
    .from("internal_capabilities")
    .insert({
      organization_id: organizationId,
      service_domain: serviceDomain,
      code,
      name,
      description,
      is_active: true,
    })
    .select(
      "id, organization_id, service_domain, code, name, description, is_active, created_at",
    )
    .single();

  if (insertResult.error) {
    const isDuplicate =
      insertResult.error.code === "23505" ||
      insertResult.error.message.toLowerCase().includes("duplicate");

    return jsonError(
      isDuplicate
        ? "A capability with this code already exists in the organization."
        : insertResult.error.message,
      isDuplicate ? 409 : 500,
    );
  }

  return NextResponse.json({ capability: insertResult.data }, { status: 201 });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateFromDiscoveryBody = {
  organizationId?: string;
  providerKey?: string;
  machineName?: string;
  externalResourceId?: string;
  model?: string | null;
  technology?: string | null;
  locationLabel?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  resourceType?: string | null;
  serviceDomain?: string | null;
  existingCapabilityId?: string | null;
  createCapability?: {
    code?: string;
    name?: string;
    serviceDomain?: string | null;
    description?: string | null;
  } | null;
  createConnection?: {
    displayName?: string | null;
    credentialProfileId?: string | null;
    baseUrl?: string | null;
    syncEnabled?: boolean | null;
    vaultSecretName?: string | null;
    vaultSecretId?: string | null;
  } | null;
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

const ALLOWED_PROVIDER_KEYS = new Set([
  "formlabs",
  "markforged",
  "ultimaker",
  "stratasys",
  "hp",
  "mtconnect",
  "opc_ua",
  "manual",
  "other",
]);

const ALLOWED_CONNECTION_MODES = new Set([
  "api_key",
  "oauth",
  "agent_url",
  "manual",
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

function normalizeMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function getProviderDefaultConnectionMode(providerKey: string): string {
  if (providerKey === "formlabs" || providerKey === "ultimaker") {
    return "oauth";
  }

  if (providerKey === "markforged" || providerKey === "stratasys" || providerKey === "hp") {
    return "api_key";
  }

  if (providerKey === "mtconnect" || providerKey === "opc_ua") {
    return "agent_url";
  }

  if (providerKey === "manual") {
    return "manual";
  }

  return "api_key";
}

function inferResourceDefaults(input: {
  providerKey: string | null;
  machineName: string | null;
  model: string | null;
  technology: string | null;
}) {
  const combined = [
    input.providerKey,
    input.machineName,
    input.model,
    input.technology,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    combined.includes("scanner") ||
    combined.includes("metrotom") ||
    combined.includes("ct scan") ||
    combined.includes("inspection")
  ) {
    return {
      resourceType: "scanner",
      serviceDomain: "scanning",
      inferredTechnology: "Scanning",
      suggestedCapabilityCode: "scanning",
      suggestedCapabilityName: "Scanning",
    };
  }

  if (
    combined.includes("cnc") ||
    combined.includes("mill") ||
    combined.includes("lathe") ||
    combined.includes("machining")
  ) {
    return {
      resourceType: "cnc_machine",
      serviceDomain: "cnc",
      inferredTechnology: "CNC",
      suggestedCapabilityCode: "cnc",
      suggestedCapabilityName: "CNC Machining",
    };
  }

  if (
    combined.includes("form 4") ||
    combined.includes("form-4") ||
    combined.includes("form 3") ||
    combined.includes("form-3") ||
    combined.includes("form 2") ||
    combined.includes("form-2") ||
    combined.includes("sla")
  ) {
    return {
      resourceType: "printer",
      serviceDomain: "additive",
      inferredTechnology: "SLA",
      suggestedCapabilityCode: "sla",
      suggestedCapabilityName: "SLA Printing",
    };
  }

  if (combined.includes("fuse") || combined.includes("sls")) {
    return {
      resourceType: "printer",
      serviceDomain: "additive",
      inferredTechnology: "SLS",
      suggestedCapabilityCode: "sls",
      suggestedCapabilityName: "SLS Printing",
    };
  }

  if (
    combined.includes("fx10") ||
    combined.includes("x7") ||
    combined.includes("x3") ||
    combined.includes("markforged") ||
    combined.includes("composite")
  ) {
    return {
      resourceType: "printer",
      serviceDomain: "additive",
      inferredTechnology: "Composite / FFF",
      suggestedCapabilityCode: "composite_fff",
      suggestedCapabilityName: "Composite / FFF Printing",
    };
  }

  if (
    combined.includes("ultimaker") ||
    combined.includes("fdm") ||
    combined.includes("fff")
  ) {
    return {
      resourceType: "printer",
      serviceDomain: "additive",
      inferredTechnology: "FDM",
      suggestedCapabilityCode: "fdm",
      suggestedCapabilityName: "FDM Printing",
    };
  }

  return {
    resourceType: "printer",
    serviceDomain: "additive",
    inferredTechnology: normalizeOptionalText(input.technology) ?? "Additive",
    suggestedCapabilityCode: "additive",
    suggestedCapabilityName: "Additive Manufacturing",
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return jsonError("Unauthorized.", 401);
  }

  let body: CreateFromDiscoveryBody;

  try {
    body = (await request.json()) as CreateFromDiscoveryBody;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const organizationId = normalizeOptionalText(body.organizationId);
  const providerKey = normalizeOptionalText(body.providerKey);
  const machineName = normalizeOptionalText(body.machineName);
  const externalResourceId = normalizeOptionalText(body.externalResourceId);
  const model = normalizeOptionalText(body.model);
  const technology = normalizeOptionalText(body.technology);
  const locationLabel = normalizeOptionalText(body.locationLabel);
  const notes = normalizeOptionalText(body.notes);
  const metadata = normalizeMetadata(body.metadata);
  const explicitResourceType = normalizeOptionalText(body.resourceType);
  const explicitServiceDomain = normalizeOptionalText(body.serviceDomain);
  const existingCapabilityId = normalizeOptionalText(body.existingCapabilityId);

  if (!organizationId) {
    return jsonError("organizationId is required.", 400);
  }

  if (!machineName) {
    return jsonError("machineName is required.", 400);
  }

  if (!providerKey || !ALLOWED_PROVIDER_KEYS.has(providerKey)) {
    return jsonError("providerKey is invalid.", 400);
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

  if (membershipResult.data.role !== "admin") {
    return jsonError(
      "Only customer organization admins can create resources from discovery.",
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

  if (organizationResult.data.organization_type !== "customer") {
    return jsonError(
      "Resources from discovery can only be created for customer organizations.",
      403,
    );
  }

  const inferred = inferResourceDefaults({
    providerKey,
    machineName,
    model,
    technology,
  });

  const resourceType = explicitResourceType ?? inferred.resourceType;
  const serviceDomain = explicitServiceDomain ?? inferred.serviceDomain;

  if (!ALLOWED_RESOURCE_TYPES.has(resourceType)) {
    return jsonError("resourceType is invalid.", 400);
  }

  if (!ALLOWED_SERVICE_DOMAINS.has(serviceDomain)) {
    return jsonError("serviceDomain is invalid.", 400);
  }

  const resourceMetadata: Record<string, unknown> = {
    ...metadata,
    providerKey,
    technology: metadata.technology ?? technology ?? inferred.inferredTechnology,
    model: metadata.model ?? model ?? null,
    externalResourceId,
    discoveredFromConnector: true,
  };

  const insertResourceResult = await supabase
    .from("internal_resources")
    .insert({
      organization_id: organizationId,
      name: machineName,
      resource_type: resourceType,
      service_domain: serviceDomain,
      location_label: locationLabel,
      notes,
      status_source: "manual",
      current_status: "idle",
      active: true,
      metadata: resourceMetadata,
    })
    .select(
      "id, organization_id, name, resource_type, service_domain, current_status, status_source, active, location_label, notes, metadata, created_at",
    )
    .single();

  if (insertResourceResult.error) {
    const isDuplicate =
      insertResourceResult.error.code === "23505" ||
      insertResourceResult.error.message.toLowerCase().includes("duplicate");

    return jsonError(
      isDuplicate
        ? "A resource with this name already exists in the organization."
        : insertResourceResult.error.message,
      isDuplicate ? 409 : 500,
    );
  }

  const resource = insertResourceResult.data;

  let capability:
    | {
        id: string;
        code: string;
        name: string;
        service_domain: string;
      }
    | null = null;

  let resourceCapability:
    | {
        id: string;
        resource_id: string;
        capability_id: string;
      }
    | null = null;

  if (existingCapabilityId) {
    const capabilityResult = await supabase
      .from("internal_capabilities")
      .select("id, code, name, service_domain, organization_id")
      .eq("id", existingCapabilityId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (capabilityResult.error) {
      return jsonError(capabilityResult.error.message, 500);
    }

    if (!capabilityResult.data) {
      return jsonError("Selected capability was not found.", 404);
    }

    capability = {
      id: capabilityResult.data.id,
      code: capabilityResult.data.code,
      name: capabilityResult.data.name,
      service_domain: capabilityResult.data.service_domain,
    };
  } else if (body.createCapability) {
    const capabilityCode = normalizeCapabilityCode(
      normalizeOptionalText(body.createCapability.code) ?? inferred.suggestedCapabilityCode,
    );
    const capabilityName =
      normalizeOptionalText(body.createCapability.name) ?? inferred.suggestedCapabilityName;
    const capabilityServiceDomain =
      normalizeOptionalText(body.createCapability.serviceDomain) ?? serviceDomain;
    const capabilityDescription = normalizeOptionalText(body.createCapability.description);

    if (!capabilityCode || !capabilityName) {
      return jsonError(
        "Capability code and name are required when createCapability is provided.",
        400,
      );
    }

    if (!ALLOWED_SERVICE_DOMAINS.has(capabilityServiceDomain)) {
      return jsonError("Capability serviceDomain is invalid.", 400);
    }

    const existingCapabilityResult = await supabase
      .from("internal_capabilities")
      .select("id, code, name, service_domain")
      .eq("organization_id", organizationId)
      .eq("code", capabilityCode)
      .maybeSingle();

    if (existingCapabilityResult.error) {
      return jsonError(existingCapabilityResult.error.message, 500);
    }

    if (existingCapabilityResult.data) {
      capability = {
        id: existingCapabilityResult.data.id,
        code: existingCapabilityResult.data.code,
        name: existingCapabilityResult.data.name,
        service_domain: existingCapabilityResult.data.service_domain,
      };
    } else {
      const insertCapabilityResult = await supabase
        .from("internal_capabilities")
        .insert({
          organization_id: organizationId,
          service_domain: capabilityServiceDomain,
          code: capabilityCode,
          name: capabilityName,
          description: capabilityDescription,
          is_active: true,
        })
        .select("id, code, name, service_domain")
        .single();

      if (insertCapabilityResult.error) {
        return jsonError(insertCapabilityResult.error.message, 500);
      }

      capability = {
        id: insertCapabilityResult.data.id,
        code: insertCapabilityResult.data.code,
        name: insertCapabilityResult.data.name,
        service_domain: insertCapabilityResult.data.service_domain,
      };
    }
  }

  if (capability) {
    const insertMappingResult = await supabase
      .from("internal_resource_capabilities")
      .insert({
        resource_id: resource.id,
        capability_id: capability.id,
      })
      .select("id, resource_id, capability_id")
      .single();

    if (insertMappingResult.error) {
      const isDuplicate =
        insertMappingResult.error.code === "23505" ||
        insertMappingResult.error.message.toLowerCase().includes("duplicate");

      if (!isDuplicate) {
        return jsonError(insertMappingResult.error.message, 500);
      }
    } else {
      resourceCapability = insertMappingResult.data;
    }
  }

  let connection:
    | {
        id: string;
        organization_id: string;
        resource_id: string | null;
        provider_key: string;
        connection_mode: string;
        display_name: string;
        credential_profile_id: string | null;
        base_url: string | null;
        external_resource_id: string | null;
        sync_enabled: boolean;
        last_sync_status: string | null;
        metadata: Record<string, unknown> | null;
      }
    | null = null;

  if (body.createConnection) {
    const connectionDisplayName =
      normalizeOptionalText(body.createConnection.displayName) ??
      `${machineName} Connector`;

    const credentialProfileId = normalizeOptionalText(
      body.createConnection.credentialProfileId,
    );
    const baseUrl = normalizeOptionalText(body.createConnection.baseUrl);
    const syncEnabled =
      typeof body.createConnection.syncEnabled === "boolean"
        ? body.createConnection.syncEnabled
        : true;
    const vaultSecretName = normalizeOptionalText(
      body.createConnection.vaultSecretName,
    );
    const vaultSecretId = normalizeOptionalText(body.createConnection.vaultSecretId);
    const connectionMode = getProviderDefaultConnectionMode(providerKey);

    if (!ALLOWED_CONNECTION_MODES.has(connectionMode)) {
      return jsonError("connectionMode is invalid.", 400);
    }

    if (credentialProfileId) {
      const profileResult = await supabase
        .from("internal_connector_profiles")
        .select("id, organization_id, provider_key")
        .eq("id", credentialProfileId)
        .eq("organization_id", organizationId)
        .maybeSingle();

      if (profileResult.error) {
        return jsonError(profileResult.error.message, 500);
      }

      if (!profileResult.data) {
        return jsonError("Selected credential profile does not exist.", 400);
      }

      if (profileResult.data.provider_key !== providerKey) {
        return jsonError(
          "Credential profile provider does not match the selected connector provider.",
          400,
        );
      }
    }

    const insertConnectionResult = await supabase
      .from("internal_resource_connections")
      .insert({
        organization_id: organizationId,
        resource_id: resource.id,
        provider_key: providerKey,
        connection_mode: connectionMode,
        display_name: connectionDisplayName,
        vault_secret_name: vaultSecretName,
        vault_secret_id: vaultSecretId,
        credential_profile_id: credentialProfileId,
        base_url: baseUrl,
        external_resource_id: externalResourceId,
        sync_enabled: syncEnabled,
        last_sync_status: syncEnabled ? "pending" : "disabled",
        metadata: {
          ...resourceMetadata,
          linkedFromDiscovery: true,
        },
      })
      .select(
        "id, organization_id, resource_id, provider_key, connection_mode, display_name, credential_profile_id, base_url, external_resource_id, sync_enabled, last_sync_status, metadata",
      )
      .single();

    if (insertConnectionResult.error) {
      return jsonError(insertConnectionResult.error.message, 500);
    }

    connection = insertConnectionResult.data;
  }

  return NextResponse.json(
    {
      resource,
      capability,
      resourceCapability,
      connection,
      inferred: {
        resourceType,
        serviceDomain,
        technology: resourceMetadata.technology ?? null,
        suggestedCapabilityCode: inferred.suggestedCapabilityCode,
        suggestedCapabilityName: inferred.suggestedCapabilityName,
      },
    },
    { status: 201 },
  );
}
import { cache } from "react";
import type {
  InternalManufacturingCapability,
  InternalManufacturingData,
  InternalManufacturingJob,
  InternalManufacturingOrganization,
  InternalManufacturingResource,
  InternalManufacturingStatusEvent,
  InternalManufacturingSummary,
} from "./types";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  plan: string | null;
  organization_type: string | null;
};

type ResourceRow = {
  id: string;
  organization_id: string;
  name: string;
  resource_type: string;
  service_domain: string;
  current_status: string;
  status_source: string;
  active: boolean;
  location_label: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
};

type CapabilityRow = {
  id: string;
  organization_id: string;
  service_domain: string;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type ResourceCapabilityRow = {
  resource_id: string;
  capability_id: string;
};

type StatusEventRow = {
  id: string;
  organization_id: string;
  resource_id: string;
  source: string;
  status: string;
  reason_code: string | null;
  reason_detail: string | null;
  effective_at: string;
  created_at: string;
  payload?: Record<string, unknown> | null;
};

type JobRow = {
  id: string;
  organization_id: string;
  title: string;
  service_domain: string;
  job_type: string;
  required_quantity: number;
  priority: string;
  status: string;
  routing_decision: string;
  routing_confidence: number | null;
  due_at: string | null;
  created_at: string;
};

const emptySummary: InternalManufacturingSummary = {
  resourceCount: 0,
  activeResourceCount: 0,
  capabilityCount: 0,
  jobCount: 0,
  queuedOrInProgressJobCount: 0,
  blockedResourceCount: 0,
  overdueJobCount: 0,
};

const emptyState: InternalManufacturingData = {
  organization: null,
  resources: [],
  capabilities: [],
  jobs: [],
  recentStatusEvents: [],
  summary: emptySummary,
  errors: [],
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return null;

  if (raw.includes("maintenance")) return "maintenance";
  if (raw.includes("blocked")) return "blocked";
  if (raw.includes("unreachable")) return "unreachable";
  if (raw.includes("offline")) return "offline";
  if (raw.includes("paused")) return "paused";
  if (raw.includes("queue")) return "queued";
  if (raw.includes("run") || raw.includes("print")) return "running";
  if (raw.includes("complete")) return "complete";
  if (raw.includes("idle")) return "idle";

  return raw;
}

function getTelemetryLastSeenAt(
  resourceMetadata: Record<string, unknown>,
  latestStatusEvent: StatusEventRow | undefined,
) {
  const eventPayload = asRecord(latestStatusEvent?.payload);
  const printer = asRecord(eventPayload.printer);
  const printerStatus = asRecord(printer.printerStatus);

  return (
    readString(printerStatus.lastPingedAt) ??
    readString(printer.lastPingedAt) ??
    readString(eventPayload.last_pinged_at) ??
    readString(resourceMetadata.telemetry_last_seen_at) ??
    latestStatusEvent?.effective_at ??
    null
  );
}

function getManualOverride(resourceMetadata: Record<string, unknown>) {
  const status = normalizeStatus(
    readString(resourceMetadata.manual_override_status),
  );
  const reason = readString(resourceMetadata.manual_override_reason);
  const startedAt = readString(resourceMetadata.manual_override_started_at);
  const expiresAt = readString(resourceMetadata.manual_override_expires_at);

  const now = Date.now();
  const isExpired =
    expiresAt != null && !Number.isNaN(new Date(expiresAt).getTime())
      ? new Date(expiresAt).getTime() < now
      : false;

  return {
    status,
    reason,
    startedAt,
    expiresAt,
    expired: isExpired,
  };
}

function getLiveStatus(
  latestStatusEvent: StatusEventRow | undefined,
  resourceMetadata: Record<string, unknown>,
) {
  const eventPayload = asRecord(latestStatusEvent?.payload);
  const printer = asRecord(eventPayload.printer);
  const printerStatus = asRecord(printer.printerStatus);

  return (
    normalizeStatus(readString(eventPayload.live_status)) ??
    normalizeStatus(readString(eventPayload.raw_status)) ??
    normalizeStatus(readString(printer.rawStatus)) ??
    normalizeStatus(readString(printerStatus.status)) ??
    normalizeStatus(readString(resourceMetadata.live_status)) ??
    normalizeStatus(latestStatusEvent?.status) ??
    null
  );
}

function getTelemetryStatus(lastSeenAt: string | null): "fresh" | "stale" | "missing" {
  if (!lastSeenAt) return "missing";

  const timestamp = new Date(lastSeenAt).getTime();
  if (Number.isNaN(timestamp)) return "missing";

  const ageMs = Date.now() - timestamp;
  if (ageMs <= 5 * 60 * 1000) return "fresh";
  return "stale";
}

function resolveEffectiveStatus(input: {
  manualOverrideStatus: string | null;
  manualOverrideExpired: boolean;
  liveStatus: string | null;
  telemetryStatus: "fresh" | "stale" | "missing";
  fallbackStatus: string;
}) {
  if (input.manualOverrideStatus && !input.manualOverrideExpired) {
    return {
      effectiveStatus: input.manualOverrideStatus,
      effectiveStatusSource: "manual_override" as const,
    };
  }

  if (input.liveStatus && input.telemetryStatus === "fresh") {
    return {
      effectiveStatus: input.liveStatus,
      effectiveStatusSource: "live" as const,
    };
  }

  if (input.liveStatus && input.telemetryStatus === "stale") {
    return {
      effectiveStatus: "unreachable",
      effectiveStatusSource: "live" as const,
    };
  }

  return {
    effectiveStatus: normalizeStatus(input.fallbackStatus) ?? "idle",
    effectiveStatusSource: "fallback" as const,
  };
}

export const loadInternalManufacturingData = cache(
  async (): Promise<InternalManufacturingData> => {
    const supabase = await createClient();
    const errors: string[] = [];

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return {
        ...emptyState,
        errors: [userError.message],
      };
    }

    if (!user) {
      return {
        ...emptyState,
        errors: ["You must be signed in to view internal manufacturing."],
      };
    }

    const membershipsResult = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id);

    if (membershipsResult.error) {
      return {
        ...emptyState,
        errors: [membershipsResult.error.message],
      };
    }

    const memberships = (membershipsResult.data ?? []) as MembershipRow[];

    if (memberships.length === 0) {
      return {
        ...emptyState,
        errors: ["No organization membership found for this user."],
      };
    }

    const organizationIds = memberships.map((row) => row.organization_id);

    const organizationsResult = await supabase
      .from("organizations")
      .select("id, name, slug, plan, organization_type")
      .in("id", organizationIds);

    if (organizationsResult.error) {
      return {
        ...emptyState,
        errors: [organizationsResult.error.message],
      };
    }

    const organizations = (organizationsResult.data ?? []) as OrganizationRow[];

    const organizationById = new Map(organizations.map((org) => [org.id, org]));
    const membershipWithOrg = memberships
      .map((membership) => ({
        membership,
        organization: organizationById.get(membership.organization_id) ?? null,
      }))
      .filter(
        (
          row,
        ): row is {
          membership: MembershipRow;
          organization: OrganizationRow;
        } => Boolean(row.organization),
      );

    const chosen =
      membershipWithOrg.find(
        (row) => row.organization.organization_type === "customer",
      ) ?? membershipWithOrg[0];

    if (!chosen) {
      return {
        ...emptyState,
        errors: ["Unable to determine the active organization."],
      };
    }

    const currentOrganization: InternalManufacturingOrganization = {
      id: chosen.organization.id,
      name: chosen.organization.name,
      slug: chosen.organization.slug,
      plan: chosen.organization.plan,
      organizationType: chosen.organization.organization_type,
      membershipRole: chosen.membership.role,
    };

    const organizationId = currentOrganization.id;

    const [
      resourcesResult,
      capabilitiesResult,
      resourceCapabilitiesResult,
      statusEventsResult,
      jobsResult,
    ] = await Promise.all([
      supabase
        .from("internal_resources")
        .select(
          "id, organization_id, name, resource_type, service_domain, current_status, status_source, active, location_label, metadata, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),

      supabase
        .from("internal_capabilities")
        .select(
          "id, organization_id, service_domain, code, name, is_active, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),

      supabase
        .from("internal_resource_capabilities")
        .select("resource_id, capability_id"),

      supabase
        .from("internal_resource_status_events")
        .select(
          "id, organization_id, resource_id, source, status, reason_code, reason_detail, effective_at, created_at, payload",
        )
        .eq("organization_id", organizationId)
        .order("effective_at", { ascending: false })
        .limit(50),

      supabase
        .from("internal_jobs")
        .select(
          "id, organization_id, title, service_domain, job_type, required_quantity, priority, status, routing_decision, routing_confidence, due_at, created_at",
        )
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    if (resourcesResult.error) errors.push(resourcesResult.error.message);
    if (capabilitiesResult.error) errors.push(capabilitiesResult.error.message);
    if (resourceCapabilitiesResult.error) {
      errors.push(resourceCapabilitiesResult.error.message);
    }
    if (statusEventsResult.error) errors.push(statusEventsResult.error.message);
    if (jobsResult.error) errors.push(jobsResult.error.message);

    const resourceRows = (resourcesResult.data ?? []) as ResourceRow[];
    const capabilityRows = (capabilitiesResult.data ?? []) as CapabilityRow[];
    const resourceCapabilityRows = (
      (resourceCapabilitiesResult.data ?? []) as ResourceCapabilityRow[]
    ).filter((row) => {
      const resource = resourceRows.find((resourceItem) => resourceItem.id === row.resource_id);
      const capability = capabilityRows.find(
        (capabilityItem) => capabilityItem.id === row.capability_id,
      );
      return Boolean(resource && capability);
    });
    const statusEventRows = (statusEventsResult.data ?? []) as StatusEventRow[];
    const jobRows = (jobsResult.data ?? []) as JobRow[];

    const capabilityById = new Map(capabilityRows.map((row) => [row.id, row]));
    const resourceById = new Map(resourceRows.map((row) => [row.id, row]));

    const capabilityIdsByResourceId = new Map<string, string[]>();
    const resourceIdsByCapabilityId = new Map<string, string[]>();

    for (const row of resourceCapabilityRows) {
      const capabilityIds = capabilityIdsByResourceId.get(row.resource_id) ?? [];
      capabilityIds.push(row.capability_id);
      capabilityIdsByResourceId.set(row.resource_id, capabilityIds);

      const resourceIds = resourceIdsByCapabilityId.get(row.capability_id) ?? [];
      resourceIds.push(row.resource_id);
      resourceIdsByCapabilityId.set(row.capability_id, resourceIds);
    }

    const latestStatusByResourceId = new Map<string, StatusEventRow>();
    for (const event of statusEventRows) {
      if (!latestStatusByResourceId.has(event.resource_id)) {
        latestStatusByResourceId.set(event.resource_id, event);
      }
    }

    const resources: InternalManufacturingResource[] = resourceRows.map((row) => {
      const capabilityIds = capabilityIdsByResourceId.get(row.id) ?? [];
      const capabilityCodes = capabilityIds
        .map((capabilityId) => capabilityById.get(capabilityId)?.code)
        .filter((value): value is string => Boolean(value));

      const latestStatus = latestStatusByResourceId.get(row.id);
      const resourceMetadata = asRecord(row.metadata);
      const manualOverride = getManualOverride(resourceMetadata);
      const liveStatus = getLiveStatus(latestStatus, resourceMetadata);
      const telemetryLastSeenAt = getTelemetryLastSeenAt(resourceMetadata, latestStatus);
      const telemetryStatus = getTelemetryStatus(telemetryLastSeenAt);

      const resolved = resolveEffectiveStatus({
        manualOverrideStatus: manualOverride.status,
        manualOverrideExpired: manualOverride.expired,
        liveStatus,
        telemetryStatus,
        fallbackStatus: row.current_status,
      });

      return {
        id: row.id,
        organizationId: row.organization_id,
        name: row.name,
        resourceType: row.resource_type,
        serviceDomain: row.service_domain,
        currentStatus: row.current_status,
        derivedStatus: latestStatus?.status ?? row.current_status,
        effectiveStatus: resolved.effectiveStatus,
        effectiveStatusSource: resolved.effectiveStatusSource,
        liveStatus,
        telemetryStatus,
        telemetryLastSeenAt,
        manualOverrideStatus: manualOverride.status,
        manualOverrideReason: manualOverride.reason,
        manualOverrideStartedAt: manualOverride.startedAt,
        manualOverrideExpiresAt: manualOverride.expiresAt,
        manualOverrideExpired: manualOverride.expired,
        statusSource: row.status_source,
        active: row.active,
        locationLabel: row.location_label,
        capabilityCount: capabilityCodes.length,
        capabilityCodes,
        latestStatusAt: latestStatus?.effective_at ?? null,
        createdAt: row.created_at,
      };
    });

    const capabilities: InternalManufacturingCapability[] = capabilityRows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      serviceDomain: row.service_domain,
      code: row.code,
      name: row.name,
      isActive: row.is_active,
      resourceCount: (resourceIdsByCapabilityId.get(row.id) ?? []).length,
      createdAt: row.created_at,
    }));

    const jobs: InternalManufacturingJob[] = jobRows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      title: row.title,
      serviceDomain: row.service_domain,
      jobType: row.job_type,
      requiredQuantity: row.required_quantity,
      priority: row.priority,
      status: row.status,
      routingDecision: row.routing_decision,
      routingConfidence: row.routing_confidence,
      dueAt: row.due_at,
      createdAt: row.created_at,
    }));

    const recentStatusEvents: InternalManufacturingStatusEvent[] = statusEventRows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      resourceId: row.resource_id,
      resourceName: resourceById.get(row.resource_id)?.name ?? "Unknown resource",
      source: row.source,
      status: row.status,
      reasonCode: row.reason_code,
      reasonDetail: row.reason_detail,
      effectiveAt: row.effective_at,
      createdAt: row.created_at,
    }));

    const now = Date.now();

    const summary: InternalManufacturingSummary = {
      resourceCount: resources.length,
      activeResourceCount: resources.filter((row) => row.active).length,
      capabilityCount: capabilities.length,
      jobCount: jobs.length,
      queuedOrInProgressJobCount: jobs.filter(
        (row) => row.status === "queued" || row.status === "in_progress",
      ).length,
      blockedResourceCount: resources.filter(
        (row) => row.effectiveStatus === "blocked",
      ).length,
      overdueJobCount: jobs.filter((row) => {
        if (!row.dueAt) return false;
        return new Date(row.dueAt).getTime() < now && row.status !== "completed";
      }).length,
    };

    return {
      organization: currentOrganization,
      resources,
      capabilities,
      jobs,
      recentStatusEvents,
      summary,
      errors,
    };
  },
);
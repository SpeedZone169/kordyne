export type InternalManufacturingOrganization = {
  id: string;
  name: string;
  slug: string | null;
  plan: string | null;
  organizationType: string | null;
  membershipRole: string;
};

export type InternalManufacturingResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: string;
  currentStatus: string;
  derivedStatus: string;
  effectiveStatus: string;
  effectiveStatusSource: "manual_override" | "live" | "fallback";
  liveStatus: string | null;
  telemetryStatus: "fresh" | "stale" | "missing";
  telemetryLastSeenAt: string | null;
  manualOverrideStatus: string | null;
  manualOverrideReason: string | null;
  manualOverrideStartedAt: string | null;
  manualOverrideExpiresAt: string | null;
  manualOverrideExpired: boolean;
  statusSource: string;
  active: boolean;
  locationLabel: string | null;
  capabilityCount: number;
  capabilityCodes: string[];
  latestStatusAt: string | null;
  createdAt: string;
};

export type InternalManufacturingCapability = {
  id: string;
  organizationId: string;
  serviceDomain: string;
  code: string;
  name: string;
  isActive: boolean;
  resourceCount: number;
  createdAt: string;
};

export type InternalManufacturingJob = {
  id: string;
  organizationId: string;
  title: string;
  serviceDomain: string;
  jobType: string;
  requiredQuantity: number;
  priority: string;
  status: string;
  routingDecision: string;
  routingConfidence: number | null;
  dueAt: string | null;
  createdAt: string;
};

export type InternalManufacturingStatusEvent = {
  id: string;
  organizationId: string;
  resourceId: string;
  resourceName: string;
  source: string;
  status: string;
  reasonCode: string | null;
  reasonDetail: string | null;
  effectiveAt: string;
  createdAt: string;
};

export type InternalManufacturingSummary = {
  resourceCount: number;
  activeResourceCount: number;
  capabilityCount: number;
  jobCount: number;
  queuedOrInProgressJobCount: number;
  blockedResourceCount: number;
  overdueJobCount: number;
};

export type InternalManufacturingData = {
  organization: InternalManufacturingOrganization | null;
  resources: InternalManufacturingResource[];
  capabilities: InternalManufacturingCapability[];
  jobs: InternalManufacturingJob[];
  recentStatusEvents: InternalManufacturingStatusEvent[];
  summary: InternalManufacturingSummary;
  errors: string[];
};
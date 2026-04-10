export type InternalResourceStatus =
  | "idle"
  | "queued"
  | "running"
  | "paused"
  | "blocked"
  | "maintenance"
  | "offline"
  | "complete";

export type InternalServiceDomain =
  | "additive"
  | "cnc"
  | "cad"
  | "scanning"
  | "composites"
  | "sheet_metal"
  | "qa"
  | "finishing"
  | "assembly"
  | "general";

export interface InternalManufacturingOrganization {
  id: string;
  name: string;
  slug: string | null;
  plan: string | null;
  organizationType: "customer" | "provider" | string | null;
  membershipRole: string;
}

export interface InternalManufacturingResource {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: InternalServiceDomain | string;
  currentStatus: InternalResourceStatus | string;
  derivedStatus: InternalResourceStatus | string;
  statusSource: string;
  active: boolean;
  locationLabel: string | null;
  capabilityCount: number;
  capabilityCodes: string[];
  latestStatusAt: string | null;
  createdAt: string;
}

export interface InternalManufacturingCapability {
  id: string;
  organizationId: string;
  serviceDomain: InternalServiceDomain | string;
  code: string;
  name: string;
  isActive: boolean;
  resourceCount: number;
  createdAt: string;
}

export interface InternalManufacturingJob {
  id: string;
  organizationId: string;
  title: string;
  serviceDomain: InternalServiceDomain | string;
  jobType: string;
  requiredQuantity: number;
  priority: string;
  status: string;
  routingDecision: string;
  routingConfidence: number | null;
  dueAt: string | null;
  createdAt: string;
}

export interface InternalManufacturingStatusEvent {
  id: string;
  organizationId: string;
  resourceId: string;
  resourceName: string;
  source: string;
  status: InternalResourceStatus | string;
  reasonCode: string | null;
  reasonDetail: string | null;
  effectiveAt: string;
  createdAt: string;
}

export interface InternalManufacturingSummary {
  resourceCount: number;
  activeResourceCount: number;
  capabilityCount: number;
  jobCount: number;
  queuedOrInProgressJobCount: number;
  blockedResourceCount: number;
  overdueJobCount: number;
}

export interface InternalManufacturingData {
  organization: InternalManufacturingOrganization | null;
  resources: InternalManufacturingResource[];
  capabilities: InternalManufacturingCapability[];
  jobs: InternalManufacturingJob[];
  recentStatusEvents: InternalManufacturingStatusEvent[];
  summary: InternalManufacturingSummary;
  errors: string[];
}
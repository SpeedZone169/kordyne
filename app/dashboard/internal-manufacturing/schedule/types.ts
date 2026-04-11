import type { InternalManufacturingOrganization } from "../types";
import type { PlanningConfidence, PlanningRisk } from "@/lib/planning-core";

export type InternalScheduleCapabilitySummary = {
  id: string;
  code: string;
  name: string;
  serviceDomain: string;
  isActive: boolean;
};

export type InternalScheduleResource = {
  id: string;
  organizationId: string;
  name: string;
  resourceType: string;
  serviceDomain: string;
  currentStatus: string;
  active: boolean;
  locationLabel: string | null;
  mappedCapabilities: InternalScheduleCapabilitySummary[];
};

export type InternalScheduleBlock = {
  id: string;
  organizationId: string;
  resourceId: string;
  blockType: "maintenance" | "downtime" | "holiday" | "internal_hold" | "other";
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  enteredByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InternalScheduleAssignment = {
  id: string;
  organizationId: string;
  operationId: string;
  jobId: string;
  jobTitle: string;
  operationSequenceNo: number;
  operationType: string;
  serviceDomain: string;
  resourceId: string;
  resourceName: string;
  capabilityId: string | null;
  capabilityName: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  confidenceScore: number | null;
  riskLevel: PlanningRisk | null;
  createdBy: string;
  createdAt: string;
};

export type InternalScheduleBacklogItem = {
  operationId: string;
  jobId: string;
  jobTitle: string;
  serviceDomain: string;
  operationType: string;
  sequenceNo: number;
  capabilityId: string | null;
  capabilityName: string | null;
  requiredQuantity: number | null;
  estimatedSetupMinutes: number | null;
  estimatedRunMinutes: number | null;
  estimatedTotalMinutes: number | null;
  dueAt: string | null;
  priority: string;
  jobStatus: string;
  routingDecision: string;
  notes: string | null;
};

export type InternalScheduleRecommendation = {
  operationId: string;
  suggestedResourceId: string | null;
  suggestedResourceName: string | null;
  suggestedCapabilityId: string | null;
  suggestedCapabilityName: string | null;
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
  confidence: PlanningConfidence;
  riskLevel: PlanningRisk;
  isFeasible: boolean;
  reasons: string[];
};

export type InternalScheduleData = {
  organization: InternalManufacturingOrganization | null;
  resources: InternalScheduleResource[];
  blocks: InternalScheduleBlock[];
  assignments: InternalScheduleAssignment[];
  backlog: InternalScheduleBacklogItem[];
  recommendationsByOperationId: Record<string, InternalScheduleRecommendation>;
  summary: {
    resourceCount: number;
    activeResourceCount: number;
    blockCount: number;
    assignmentCount: number;
    backlogCount: number;
    dueSoonAssignmentCount: number;
    overdueAssignmentCount: number;
    overloadedResourceCount: number;
    underusedResourceCount: number;
  };
  errors: string[];
};
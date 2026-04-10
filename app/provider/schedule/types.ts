import type {
  ProviderCapabilityRow,
  ProviderOrganizationSummary,
} from "../types";

export type ProviderScheduleCapabilitySummary = Pick<
  ProviderCapabilityRow,
  "id" | "processFamily" | "processName" | "machineType" | "active"
>;

export type ProviderScheduleWorkCenter = {
  id: string;
  providerOrgId: string;
  name: string;
  code: string | null;
  centerType: string;
  description: string | null;
  locationLabel: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  mappedCapabilities: ProviderScheduleCapabilitySummary[];
};

export type ProviderScheduleBlock = {
  id: string;
  providerOrgId: string;
  providerWorkCenterId: string | null;
  blockType: "maintenance" | "downtime" | "holiday" | "internal_hold" | "other";
  title: string;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderScheduleBooking = {
  id: string;
  providerOrgId: string;
  customerOrgId: string | null;
  customerOrgName: string | null;
  providerWorkCenterId: string | null;
  providerCapabilityId: string | null;
  capabilityName: string | null;
  providerRequestPackageId: string | null;
  providerQuoteId: string | null;
  serviceRequestId: string | null;
  bookingStatus:
    | "unscheduled"
    | "scheduled"
    | "in_progress"
    | "paused"
    | "completed"
    | "cancelled";
  title: string;
  jobReference: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string;
  estimatedHours: number | null;
  setupHours: number | null;
  runHours: number | null;
  requestedQuantity: number | null;
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: string;
  updatedAt: string;
};

export type ProviderScheduleUnscheduledAward = {
  packageId: string;
  serviceRequestId: string;
  title: string | null;
  customerOrgName: string;
  targetDueDate: string | null;
  requestedQuantity: number | null;
  latestQuoteStatus: string | null;
  latestLeadTimeDays: number | null;
  latestTotalPrice: number | null;
  latestCurrencyCode: string | null;
  requestType: string | null;
  targetProcess: string | null;
  targetMaterial: string | null;
};

export type ProviderScheduleRisk = "none" | "low" | "medium" | "high";

export type ProviderScheduleRecommendation = {
  packageId: string;
  suggestedWorkCenterId: string | null;
  suggestedWorkCenterName: string | null;
  suggestedCapabilityId: string | null;
  suggestedCapabilityName: string | null;
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
  confidence: "low" | "medium" | "high";
  riskLevel: ProviderScheduleRisk;
  isFeasible: boolean;
  reasons: string[];
};

export type ProviderScheduleData = {
  organization: ProviderOrganizationSummary | null;
  capabilities: ProviderCapabilityRow[];
  workCenters: ProviderScheduleWorkCenter[];
  blocks: ProviderScheduleBlock[];
  bookings: ProviderScheduleBooking[];
  unscheduledAwards: ProviderScheduleUnscheduledAward[];
  recommendationsByPackageId: Record<string, ProviderScheduleRecommendation>;
  summary: {
    workCenterCount: number;
    activeWorkCenterCount: number;
    blockCount: number;
    bookingCount: number;
    unscheduledAwardCount: number;
    dueSoonBookingCount: number;
    overdueBookingCount: number;
    overloadedLaneCount: number;
    underusedLaneCount: number;
  };
};
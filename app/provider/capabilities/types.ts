import type {
  ProviderCapabilityRow,
  ProviderOrganizationSummary,
} from "../types";

export type ProviderCapabilitiesWorkCenterCapability = Pick<
  ProviderCapabilityRow,
  "id" | "processFamily" | "processName" | "machineType" | "active"
>;

export type ProviderCapabilitiesWorkCenter = {
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
  mappedCapabilities: ProviderCapabilitiesWorkCenterCapability[];
};

export type ProviderCapabilitiesData = {
  organization: ProviderOrganizationSummary | null;
  capabilities: ProviderCapabilityRow[];
  workCenters: ProviderCapabilitiesWorkCenter[];
  stats: {
    activeCapabilityCount: number;
    inactiveCapabilityCount: number;
    processFamilyCount: number;
    leadTimeNotesCount: number;
    workCenterCount: number;
    activeWorkCenterCount: number;
    mappedWorkCenterCount: number;
    unmappedCapabilityCount: number;
  };
};
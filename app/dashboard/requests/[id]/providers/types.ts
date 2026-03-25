import type {
  ProviderRelationshipStatus,
  ProviderRoundMode,
  ProviderRoundStatus,
  ProviderTrustStatus,
} from "@/lib/providers";

export type ServiceRequestSummary = {
  id: string;
  organizationId: string;
  partId: string | null;
  title: string | null;
  requestType: string | null;
  status: string | null;
  dueDate: string | null;
  quantity: number | null;
  requestOrigin: string | null;
  requestedItemName: string | null;
  requestedItemReference: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderCandidate = {
  relationshipId: string;
  providerOrgId: string;
  providerName: string;
  providerSlug: string | null;
  relationshipStatus: ProviderRelationshipStatus;
  trustStatus: ProviderTrustStatus;
  isPreferred: boolean;
  providerCode: string | null;
};

export type ShareableRequestFile = {
  id: string;
  sourceType: "part_file" | "service_request_uploaded_file";
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  storagePath: string | null;
  createdAt: string;
};

export type PreviousRound = {
  id: string;
  roundNumber: number;
  mode: ProviderRoundMode;
  status: ProviderRoundStatus;
  createdAt: string;
};
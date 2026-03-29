export type ProviderOrganizationSummary = {
  id: string;
  name: string;
  slug: string | null;
  memberRole: string | null;
};

export type ProviderProfileData = {
  organizationId: string;
  website: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  logoPath: string | null;
  logoPublicUrl: string | null;
  shortDescription: string | null;
  certifications: string | null;
  industriesServed: string | null;
  capabilitiesSummary: string | null;
  softwareNotes: string | null;
  onboardingCompletedAt: string | null;
};

export type ProviderCapabilityRow = {
  id: string;
  providerOrgId: string;
  processFamily: string;
  processName: string;
  materialFamily: string | null;
  materialName: string | null;
  machineType: string | null;
  certification: string | null;
  minQuantity: number | null;
  maxQuantity: number | null;
  leadTimeNotes: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ProviderInboxRow = {
  packageId: string;
  serviceRequestId: string;
  packageTitle: string | null;
  customerOrgName: string;
  packageStatus: string;
  customerVisibleStatus: string | null;
  targetDueDate: string | null;
  requestedQuantity: number | null;
  responseDeadline: string | null;
  publishedAt: string | null;
  viewedAt: string | null;
  providerRespondedAt: string | null;
  awardedAt: string | null;
  createdAt: string;
  latestQuoteStatus: string | null;
  latestQuoteVersion: number | null;
  latestQuoteSubmittedAt: string | null;
  latestTotalPrice: number | null;
  latestCurrencyCode: string | null;
  latestLeadTimeDays: number | null;
};

export type ProviderDashboardData = {
  organization: ProviderOrganizationSummary | null;
  profile: ProviderProfileData | null;
  capabilities: ProviderCapabilityRow[];
  rows: ProviderInboxRow[];
  stats: {
    packageCount: number;
    awaitingResponseCount: number;
    respondedCount: number;
    awardedCount: number;
    latestSubmittedQuoteCount: number;
    activeCapabilityCount: number;
    profileCompletionCompleted: number;
    profileCompletionTotal: number;
    profileCompletionPercent: number;
    missingItems: string[];
  };
};

/**
 * Backward-compatible alias in case any file still imports ProviderInboxData.
 */
export type ProviderInboxData = ProviderDashboardData;
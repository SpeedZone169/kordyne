import type {
  ProviderPackageStatus,
  ProviderQuoteStatus,
} from "@/lib/providers";

export type ProviderInboxRow = {
  packageId: string;
  serviceRequestId: string;
  packageTitle: string | null;
  customerOrgName: string;
  packageStatus: ProviderPackageStatus;
  customerVisibleStatus: string | null;
  targetDueDate: string | null;
  requestedQuantity: number | null;
  responseDeadline: string | null;
  publishedAt: string | null;
  viewedAt: string | null;
  providerRespondedAt: string | null;
  awardedAt: string | null;
  createdAt: string;
  latestQuoteStatus: ProviderQuoteStatus | null;
  latestQuoteVersion: number | null;
  latestQuoteSubmittedAt: string | null;
  latestTotalPrice: number | null;
  latestCurrencyCode: string | null;
  latestLeadTimeDays: number | null;
};

export type ProviderInboxData = {
  rows: ProviderInboxRow[];
};
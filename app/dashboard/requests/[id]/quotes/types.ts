import type {
  ProviderPackageStatus,
  ProviderQuoteStatus,
  ProviderRoundMode,
  ProviderRoundStatus,
} from "@/lib/providers";

export type QuoteRoundOption = {
  id: string;
  roundNumber: number;
  mode: ProviderRoundMode;
  status: ProviderRoundStatus;
  targetDueDate: string | null;
  requestedQuantity: number | null;
  currencyCode: string | null;
  selectedProviderPackageId: string | null;
  publishedAt: string | null;
  awardedAt: string | null;
  closedAt: string | null;
  createdAt: string;
};

export type QuoteComparisonRowView = {
  packageId: string;
  providerName: string;
  packageStatus: ProviderPackageStatus;
  quoteStatus?: ProviderQuoteStatus | null;
  totalPrice?: number | null;
  estimatedLeadTimeDays?: number | null;
  earliestStartDate?: string | null;
  estimatedCompletionDate?: string | null;
  isCheapest: boolean;
  isQuickest: boolean;
  meetsTargetDueDate: boolean;
  packageTitle: string | null;
  customerVisibleStatus: string | null;
  viewedAt: string | null;
  providerRespondedAt: string | null;
  awardedAt: string | null;
  currencyCode: string;
  quoteId: string | null;
  quoteReference: string | null;
  quoteNotes: string | null;
  quoteSubmittedAt: string | null;
  quoteVersion: number | null;
  isAwarded: boolean;
};

export type QuoteComparisonPageData = {
  request: {
    id: string;
    title: string | null;
    requestType: string | null;
    status: string | null;
    dueDate: string | null;
    quantity: number | null;
    requestOrigin: string | null;
    requestedItemName: string | null;
    requestedItemReference: string | null;
  };
  rounds: QuoteRoundOption[];
  selectedRoundId: string | null;
  selectedRound: QuoteRoundOption | null;
  rows: QuoteComparisonRowView[];
};
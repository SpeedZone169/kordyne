import type {
  ProviderFileSourceType,
  ProviderPackageStatus,
  ProviderQuoteStatus,
} from "@/lib/providers";

export type ProviderPackageDetailFile = {
  id: string;
  sourceType: ProviderFileSourceType;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  storagePath: string | null;
  providerUploaded: boolean;
  sharedAt: string | null;
  createdAt: string;
};

export type ProviderPackageDetailQuote = {
  id: string;
  quoteVersion: number;
  status: ProviderQuoteStatus;
  currencyCode: string;
  setupPrice: number | null;
  unitPrice: number | null;
  totalPrice: number | null;
  shippingPrice: number | null;
  estimatedLeadTimeDays: number | null;
  earliestStartDate: string | null;
  estimatedCompletionDate: string | null;
  quoteValidUntil: string | null;
  notes: string | null;
  exceptions: string | null;
  submittedAt: string | null;
  createdAt: string;
};

export type ProviderPackageDetailData = {
  package: {
    id: string;
    serviceRequestId: string;
    customerOrgName: string;
    packageTitle: string | null;
    packageStatus: ProviderPackageStatus;
    customerVisibleStatus: string | null;
    sharedSummary: string | null;
    targetDueDate: string | null;
    requestedQuantity: number | null;
    responseDeadline: string | null;
    publishedAt: string | null;
    viewedAt: string | null;
    providerRespondedAt: string | null;
    awardedAt: string | null;
    createdAt: string;
  };
  request: {
    id: string;
    title: string | null;
    requestType: string | null;
    requestOrigin: string | null;
    requestedItemName: string | null;
    requestedItemReference: string | null;
    dueDate: string | null;
    quantity: number | null;
    status: string | null;
    targetProcess: string | null;
    targetMaterial: string | null;
  } | null;
  files: ProviderPackageDetailFile[];
  quotes: ProviderPackageDetailQuote[];
};
export type ProviderPackageDetailFile = {
  id: string;
  sourceType: keyof typeof import("@/lib/providers").providerFileSourceTypeLabels;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  storagePath: string;
  providerUploaded: boolean | null;
  sharedAt: string | null;
  createdAt: string;
};

export type ProviderPackageDetailQuote = {
  id: string;
  quoteReference: string | null;
  quoteVersion: number;
  status: string;
  currencyCode: string | null;
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

export type ProviderInvoiceSummary = {
  id: string;
  invoiceNumber: string;
  invoiceSource: "kordyne_generated" | "provider_uploaded";
  status: string;
  currencyCode: string | null;
  subtotalAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  uploadedFileName: string | null;
  createdAt: string;
};

export type ProviderPackageDetailData = {
  package: {
    id: string;
    providerOrgId: string;
    serviceRequestId: string;
    customerOrgName: string;
    packageTitle: string | null;
    packageStatus: string;
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
  invoices: ProviderInvoiceSummary[];
};
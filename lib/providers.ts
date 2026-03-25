export const PROVIDER_RELATIONSHIP_STATUSES = [
  "invited",
  "active",
  "suspended",
  "archived",
] as const;

export type ProviderRelationshipStatus =
  (typeof PROVIDER_RELATIONSHIP_STATUSES)[number];

export const PROVIDER_TRUST_STATUSES = [
  "pending_review",
  "approved",
  "probation",
  "blocked",
] as const;

export type ProviderTrustStatus = (typeof PROVIDER_TRUST_STATUSES)[number];

export const PROVIDER_ROUND_MODES = [
  "competitive_quote",
  "direct_award",
] as const;

export type ProviderRoundMode = (typeof PROVIDER_ROUND_MODES)[number];

export const PROVIDER_ROUND_STATUSES = [
  "draft",
  "published",
  "responses_open",
  "comparison_ready",
  "awarded",
  "closed",
  "cancelled",
] as const;

export type ProviderRoundStatus = (typeof PROVIDER_ROUND_STATUSES)[number];

export const PROVIDER_PACKAGE_STATUSES = [
  "draft",
  "published",
  "viewed",
  "awaiting_provider_response",
  "declined",
  "quote_submitted",
  "quote_revised",
  "awarded",
  "not_awarded",
  "scheduled",
  "in_production",
  "completed",
  "dispatched",
  "delivered",
  "issue_raised",
  "closed",
  "cancelled",
  "on_hold",
] as const;

export type ProviderPackageStatus = (typeof PROVIDER_PACKAGE_STATUSES)[number];

export const PROVIDER_QUOTE_STATUSES = [
  "draft",
  "submitted",
  "superseded",
  "accepted",
  "rejected",
  "withdrawn",
  "expired",
] as const;

export type ProviderQuoteStatus = (typeof PROVIDER_QUOTE_STATUSES)[number];

export const PROVIDER_MESSAGE_TYPES = [
  "message",
  "question",
  "clarification",
  "status_update",
  "issue",
  "delivery_update",
  "system_event",
] as const;

export type ProviderMessageType = (typeof PROVIDER_MESSAGE_TYPES)[number];

export const PROVIDER_FILE_SOURCE_TYPES = [
  "part_file",
  "service_request_uploaded_file",
  "provider_upload",
] as const;

export type ProviderFileSourceType =
  (typeof PROVIDER_FILE_SOURCE_TYPES)[number];

export const PROVIDER_SCHEDULE_VISIBILITIES = [
  "hidden",
  "milestones_only",
  "dates_only",
  "full",
] as const;

export type ProviderScheduleVisibility =
  (typeof PROVIDER_SCHEDULE_VISIBILITIES)[number];

export const PROVIDER_READINESS_STATUSES = [
  "ready",
  "blocked",
  "awaiting_material",
  "awaiting_file_clarification",
  "awaiting_revision_confirmation",
  "awaiting_capacity",
  "awaiting_approval",
] as const;

export type ProviderReadinessStatus =
  (typeof PROVIDER_READINESS_STATUSES)[number];

export type ProviderStatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger";

export const providerRelationshipStatusLabels: Record<
  ProviderRelationshipStatus,
  string
> = {
  invited: "Invited",
  active: "Active",
  suspended: "Suspended",
  archived: "Archived",
};

export const providerTrustStatusLabels: Record<ProviderTrustStatus, string> = {
  pending_review: "Pending review",
  approved: "Approved",
  probation: "Probation",
  blocked: "Blocked",
};

export const providerRoundModeLabels: Record<ProviderRoundMode, string> = {
  competitive_quote: "Request quotes",
  direct_award: "Direct award",
};

export const providerRoundStatusLabels: Record<ProviderRoundStatus, string> = {
  draft: "Draft",
  published: "Published",
  responses_open: "Responses open",
  comparison_ready: "Comparison ready",
  awarded: "Awarded",
  closed: "Closed",
  cancelled: "Cancelled",
};

export const providerPackageStatusLabels: Record<ProviderPackageStatus, string> =
  {
    draft: "Draft",
    published: "Published",
    viewed: "Viewed",
    awaiting_provider_response: "Awaiting response",
    declined: "Declined",
    quote_submitted: "Quote submitted",
    quote_revised: "Quote revised",
    awarded: "Awarded",
    not_awarded: "Not awarded",
    scheduled: "Scheduled",
    in_production: "In production",
    completed: "Completed",
    dispatched: "Dispatched",
    delivered: "Delivered",
    issue_raised: "Issue raised",
    closed: "Closed",
    cancelled: "Cancelled",
    on_hold: "On hold",
  };

export const providerQuoteStatusLabels: Record<ProviderQuoteStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  superseded: "Superseded",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  expired: "Expired",
};

export const providerMessageTypeLabels: Record<ProviderMessageType, string> = {
  message: "Message",
  question: "Question",
  clarification: "Clarification",
  status_update: "Status update",
  issue: "Issue",
  delivery_update: "Delivery update",
  system_event: "System event",
};

export const providerFileSourceTypeLabels: Record<
  ProviderFileSourceType,
  string
> = {
  part_file: "Vault file",
  service_request_uploaded_file: "Request upload",
  provider_upload: "Provider upload",
};

export const providerScheduleVisibilityLabels: Record<
  ProviderScheduleVisibility,
  string
> = {
  hidden: "Hidden",
  milestones_only: "Milestones only",
  dates_only: "Dates only",
  full: "Full",
};

export const providerReadinessStatusLabels: Record<
  ProviderReadinessStatus,
  string
> = {
  ready: "Ready",
  blocked: "Blocked",
  awaiting_material: "Awaiting material",
  awaiting_file_clarification: "Awaiting file clarification",
  awaiting_revision_confirmation: "Awaiting revision confirmation",
  awaiting_capacity: "Awaiting capacity",
  awaiting_approval: "Awaiting approval",
};

export const providerRelationshipStatusTones: Record<
  ProviderRelationshipStatus,
  ProviderStatusTone
> = {
  invited: "info",
  active: "success",
  suspended: "warning",
  archived: "neutral",
};

export const providerTrustStatusTones: Record<
  ProviderTrustStatus,
  ProviderStatusTone
> = {
  pending_review: "warning",
  approved: "success",
  probation: "warning",
  blocked: "danger",
};

export const providerRoundStatusTones: Record<
  ProviderRoundStatus,
  ProviderStatusTone
> = {
  draft: "neutral",
  published: "info",
  responses_open: "info",
  comparison_ready: "warning",
  awarded: "success",
  closed: "neutral",
  cancelled: "danger",
};

export const providerPackageStatusTones: Record<
  ProviderPackageStatus,
  ProviderStatusTone
> = {
  draft: "neutral",
  published: "info",
  viewed: "info",
  awaiting_provider_response: "warning",
  declined: "danger",
  quote_submitted: "success",
  quote_revised: "warning",
  awarded: "success",
  not_awarded: "neutral",
  scheduled: "info",
  in_production: "info",
  completed: "success",
  dispatched: "info",
  delivered: "success",
  issue_raised: "danger",
  closed: "neutral",
  cancelled: "danger",
  on_hold: "warning",
};

export const providerQuoteStatusTones: Record<
  ProviderQuoteStatus,
  ProviderStatusTone
> = {
  draft: "neutral",
  submitted: "success",
  superseded: "neutral",
  accepted: "success",
  rejected: "danger",
  withdrawn: "warning",
  expired: "danger",
};

export const providerReadinessStatusTones: Record<
  ProviderReadinessStatus,
  ProviderStatusTone
> = {
  ready: "success",
  blocked: "danger",
  awaiting_material: "warning",
  awaiting_file_clarification: "warning",
  awaiting_revision_confirmation: "warning",
  awaiting_capacity: "warning",
  awaiting_approval: "warning",
};

export const providerRoundModeOptions = PROVIDER_ROUND_MODES.map((value) => ({
  value,
  label: providerRoundModeLabels[value],
}));

export const providerMessageTypeOptions = PROVIDER_MESSAGE_TYPES.map(
  (value) => ({
    value,
    label: providerMessageTypeLabels[value],
  }),
);

export const providerScheduleVisibilityOptions =
  PROVIDER_SCHEDULE_VISIBILITIES.map((value) => ({
    value,
    label: providerScheduleVisibilityLabels[value],
  }));

export const providerReadinessStatusOptions = PROVIDER_READINESS_STATUSES.map(
  (value) => ({
    value,
    label: providerReadinessStatusLabels[value],
  }),
);

export function isCompetitiveQuoteRound(mode: ProviderRoundMode): boolean {
  return mode === "competitive_quote";
}

export function isDirectAwardRound(mode: ProviderRoundMode): boolean {
  return mode === "direct_award";
}

export function isProviderRoundClosed(status: ProviderRoundStatus): boolean {
  return ["awarded", "closed", "cancelled"].includes(status);
}

export function isProviderRoundEditable(status: ProviderRoundStatus): boolean {
  return status === "draft";
}

export function isProviderPackageVisibleToProvider(
  status: ProviderPackageStatus,
): boolean {
  return status !== "draft";
}

export function canProviderRespondToPackage(
  status: ProviderPackageStatus,
): boolean {
  return [
    "published",
    "viewed",
    "awaiting_provider_response",
    "quote_revised",
    "on_hold",
  ].includes(status);
}

export function canProviderSubmitQuote(
  packageStatus: ProviderPackageStatus,
  quoteStatus?: ProviderQuoteStatus | null,
): boolean {
  if (!canProviderRespondToPackage(packageStatus)) return false;
  if (!quoteStatus) return true;
  return ["draft", "withdrawn", "expired"].includes(quoteStatus);
}

export function canCustomerAwardPackage(
  roundStatus: ProviderRoundStatus,
  packageStatus: ProviderPackageStatus,
  quoteStatus?: ProviderQuoteStatus | null,
): boolean {
  if (!["published", "responses_open", "comparison_ready"].includes(roundStatus))
    return false;

  if (!["quote_submitted", "quote_revised"].includes(packageStatus))
    return false;

  if (!quoteStatus) return false;

  return quoteStatus === "submitted";
}

export function getProviderRoundStatusLabel(status: ProviderRoundStatus): string {
  return providerRoundStatusLabels[status];
}

export function getProviderPackageStatusLabel(
  status: ProviderPackageStatus,
): string {
  return providerPackageStatusLabels[status];
}

export function getProviderQuoteStatusLabel(status: ProviderQuoteStatus): string {
  return providerQuoteStatusLabels[status];
}

export function getProviderRelationshipStatusLabel(
  status: ProviderRelationshipStatus,
): string {
  return providerRelationshipStatusLabels[status];
}

export function getProviderTrustStatusLabel(
  status: ProviderTrustStatus,
): string {
  return providerTrustStatusLabels[status];
}

export function getProviderMessageTypeLabel(type: ProviderMessageType): string {
  return providerMessageTypeLabels[type];
}

export function getProviderReadinessStatusLabel(
  status: ProviderReadinessStatus,
): string {
  return providerReadinessStatusLabels[status];
}

export function getProviderScheduleVisibilityLabel(
  visibility: ProviderScheduleVisibility,
): string {
  return providerScheduleVisibilityLabels[visibility];
}

export interface QuoteComparisonInput {
  packageId: string;
  providerName: string;
  packageStatus: ProviderPackageStatus;
  quoteStatus?: ProviderQuoteStatus | null;
  totalPrice?: number | null;
  estimatedLeadTimeDays?: number | null;
  earliestStartDate?: string | null;
  estimatedCompletionDate?: string | null;
}

export interface QuoteComparisonRow extends QuoteComparisonInput {
  isCheapest: boolean;
  isQuickest: boolean;
  meetsTargetDueDate: boolean;
}

function parseDateOrNull(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildQuoteComparisonRows(
  quotes: QuoteComparisonInput[],
  targetDueDate?: string | null,
): QuoteComparisonRow[] {
  const submittedQuotes = quotes.filter(
    (quote) =>
      quote.quoteStatus === "submitted" &&
      typeof quote.totalPrice === "number" &&
      typeof quote.estimatedLeadTimeDays === "number",
  );

  const cheapestPrice =
    submittedQuotes.length > 0
      ? Math.min(...submittedQuotes.map((quote) => quote.totalPrice as number))
      : null;

  const quickestLeadTime =
    submittedQuotes.length > 0
      ? Math.min(
          ...submittedQuotes.map(
            (quote) => quote.estimatedLeadTimeDays as number,
          ),
        )
      : null;

  const targetDate = parseDateOrNull(targetDueDate);

  return quotes.map((quote) => {
    const completionDate = parseDateOrNull(quote.estimatedCompletionDate);

    return {
      ...quote,
      isCheapest:
        quote.quoteStatus === "submitted" &&
        cheapestPrice !== null &&
        typeof quote.totalPrice === "number" &&
        quote.totalPrice === cheapestPrice,
      isQuickest:
        quote.quoteStatus === "submitted" &&
        quickestLeadTime !== null &&
        typeof quote.estimatedLeadTimeDays === "number" &&
        quote.estimatedLeadTimeDays === quickestLeadTime,
      meetsTargetDueDate:
        !!targetDate &&
        !!completionDate &&
        completionDate.getTime() <= targetDate.getTime(),
    };
  });
}

export function getQuoteValueSignal(row: QuoteComparisonRow): string[] {
  const signals: string[] = [];

  if (row.isCheapest) signals.push("Cheapest");
  if (row.isQuickest) signals.push("Quickest");
  if (row.meetsTargetDueDate) signals.push("Meets due date");

  return signals;
}

export function formatCurrencyValue(
  value?: number | null,
  currency = "EUR",
  locale = "en-IE",
): string {
  if (typeof value !== "number") return "—";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatLeadTime(days?: number | null): string {
  if (typeof days !== "number") return "—";
  return days === 1 ? "1 day" : `${days} days`;
}

export function defaultNextRoundNumber(existingRoundNumbers: number[]): number {
  if (existingRoundNumbers.length === 0) return 1;
  return Math.max(...existingRoundNumbers) + 1;
}

export function getDefaultRoundModeForRequest(
  requestType?: string | null,
): ProviderRoundMode {
  if (requestType === "manufacture") return "competitive_quote";
  return "direct_award";
}
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buildQuoteComparisonRows } from "@/lib/providers";
import Client from "./Client";
import type {
  QuoteComparisonPageData,
  QuoteComparisonRowView,
  QuoteRoundOption,
} from "./types";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    roundId?: string;
  }>;
};

export default async function RequestQuotesPage({
  params,
  searchParams,
}: PageProps) {
  const { id: requestId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError || !memberships?.length) {
    notFound();
  }

  const membershipOrgIds = memberships.map((m) => m.organization_id);

  const { data: serviceRequest, error: serviceRequestError } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        organization_id,
        title,
        request_type,
        status,
        due_date,
        quantity,
        request_origin,
        requested_item_name,
        requested_item_reference
      `,
    )
    .eq("id", requestId)
    .single();

  if (
    serviceRequestError ||
    !serviceRequest ||
    !membershipOrgIds.includes(serviceRequest.organization_id)
  ) {
    notFound();
  }

  const { data: rounds, error: roundsError } = await supabase
    .from("provider_quote_rounds")
    .select(
      `
        id,
        round_number,
        mode,
        status,
        target_due_date,
        requested_quantity,
        currency_code,
        selected_provider_package_id,
        published_at,
        awarded_at,
        closed_at,
        created_at
      `,
    )
    .eq("service_request_id", serviceRequest.id)
    .order("round_number", { ascending: false });

  if (roundsError) {
    throw new Error(roundsError.message);
  }

  const roundOptions: QuoteRoundOption[] =
    rounds?.map((round) => ({
      id: round.id,
      roundNumber: round.round_number,
      mode: round.mode as QuoteRoundOption["mode"],
      status: round.status as QuoteRoundOption["status"],
      targetDueDate: round.target_due_date,
      requestedQuantity: round.requested_quantity,
      currencyCode: round.currency_code,
      selectedProviderPackageId: round.selected_provider_package_id,
      publishedAt: round.published_at,
      awardedAt: round.awarded_at,
      closedAt: round.closed_at,
      createdAt: round.created_at,
    })) ?? [];

  const selectedRound =
    roundOptions.find((round) => round.id === resolvedSearchParams.roundId) ??
    roundOptions[0] ??
    null;

  if (!selectedRound) {
    const emptyData: QuoteComparisonPageData = {
      request: {
        id: serviceRequest.id,
        title: serviceRequest.title,
        requestType: serviceRequest.request_type,
        status: serviceRequest.status,
        dueDate: serviceRequest.due_date,
        quantity: serviceRequest.quantity,
        requestOrigin: serviceRequest.request_origin,
        requestedItemName: serviceRequest.requested_item_name,
        requestedItemReference: serviceRequest.requested_item_reference,
      },
      rounds: [],
      selectedRoundId: null,
      selectedRound: null,
      rows: [],
    };

    return <Client data={emptyData} />;
  }

  const { data: packages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        provider_org_id,
        package_status,
        package_title,
        customer_visible_status,
        viewed_at,
        provider_responded_at,
        awarded_at,
        created_at
      `,
    )
    .eq("provider_quote_round_id", selectedRound.id)
    .order("created_at", { ascending: true });

  if (packagesError) {
    throw new Error(packagesError.message);
  }

  const providerOrgIds = [
    ...new Set((packages ?? []).map((pkg) => pkg.provider_org_id)),
  ];

  let providerNamesById = new Map<string, string>();

  if (providerOrgIds.length > 0) {
    const { data: providerOrgs, error: providerOrgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", providerOrgIds);

    if (providerOrgsError) {
      throw new Error(providerOrgsError.message);
    }

    providerNamesById = new Map(
      (providerOrgs ?? []).map((org) => [org.id, org.name]),
    );
  }

  const packageIds = (packages ?? []).map((pkg) => pkg.id);

  let latestQuoteByPackageId = new Map<
    string,
    {
      provider_request_package_id: string;
      quote_version: number;
      status: string;
      currency_code: string;
      total_price: number | null;
      estimated_lead_time_days: number | null;
      earliest_start_date: string | null;
      estimated_completion_date: string | null;
      notes: string | null;
      submitted_at: string | null;
    }
  >();

  if (packageIds.length > 0) {
    const { data: quotes, error: quotesError } = await supabase
      .from("provider_quotes")
      .select(
        `
          provider_request_package_id,
          quote_version,
          status,
          currency_code,
          total_price,
          estimated_lead_time_days,
          earliest_start_date,
          estimated_completion_date,
          notes,
          submitted_at
        `,
      )
      .in("provider_request_package_id", packageIds)
      .order("quote_version", { ascending: false });

    if (quotesError) {
      throw new Error(quotesError.message);
    }

    for (const quote of quotes ?? []) {
      if (!latestQuoteByPackageId.has(quote.provider_request_package_id)) {
        latestQuoteByPackageId.set(quote.provider_request_package_id, quote);
      }
    }
  }

  const comparisonInputs = (packages ?? []).map((pkg) => {
    const quote = latestQuoteByPackageId.get(pkg.id);

    return {
      packageId: pkg.id,
      providerName:
        providerNamesById.get(pkg.provider_org_id) ?? "Unknown provider",
      packageStatus:
        pkg.package_status as QuoteComparisonRowView["packageStatus"],
      quoteStatus:
        (quote?.status as QuoteComparisonRowView["quoteStatus"]) ?? null,
      totalPrice: quote?.total_price ?? null,
      estimatedLeadTimeDays: quote?.estimated_lead_time_days ?? null,
      earliestStartDate: quote?.earliest_start_date ?? null,
      estimatedCompletionDate: quote?.estimated_completion_date ?? null,
    };
  });

  const rows: QuoteComparisonRowView[] = buildQuoteComparisonRows(
    comparisonInputs,
    selectedRound.targetDueDate,
  ).map((row) => {
    const pkg = packages?.find((item) => item.id === row.packageId);
    const quote = latestQuoteByPackageId.get(row.packageId);

    return {
      ...row,
      packageTitle: pkg?.package_title ?? null,
      customerVisibleStatus: pkg?.customer_visible_status ?? null,
      viewedAt: pkg?.viewed_at ?? null,
      providerRespondedAt: pkg?.provider_responded_at ?? null,
      awardedAt: pkg?.awarded_at ?? null,
      currencyCode: quote?.currency_code ?? selectedRound.currencyCode ?? "EUR",
      quoteNotes: quote?.notes ?? null,
      quoteSubmittedAt: quote?.submitted_at ?? null,
      quoteVersion: quote?.quote_version ?? null,
      isAwarded: selectedRound.selectedProviderPackageId === row.packageId,
    };
  });

  const data: QuoteComparisonPageData = {
    request: {
      id: serviceRequest.id,
      title: serviceRequest.title,
      requestType: serviceRequest.request_type,
      status: serviceRequest.status,
      dueDate: serviceRequest.due_date,
      quantity: serviceRequest.quantity,
      requestOrigin: serviceRequest.request_origin,
      requestedItemName: serviceRequest.requested_item_name,
      requestedItemReference: serviceRequest.requested_item_reference,
    },
    rounds: roundOptions,
    selectedRoundId: selectedRound.id,
    selectedRound,
    rows,
  };

  return <Client data={data} />;
}
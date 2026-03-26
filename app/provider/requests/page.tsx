import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Client from "./Client";
import type { ProviderInboxData, ProviderInboxRow } from "./types";

export default async function ProviderRequestsPage() {
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
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipOrgIds = (memberships ?? []).map((m) => m.organization_id);

  if (membershipOrgIds.length === 0) {
    const emptyData: ProviderInboxData = { rows: [] };
    return <Client data={emptyData} />;
  }

  const { data: packages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        service_request_id,
        customer_org_id,
        provider_org_id,
        package_status,
        package_title,
        target_due_date,
        requested_quantity,
        response_deadline,
        customer_visible_status,
        published_at,
        viewed_at,
        provider_responded_at,
        awarded_at,
        created_at
      `,
    )
    .in("provider_org_id", membershipOrgIds)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });

  if (packagesError) {
    throw new Error(packagesError.message);
  }

  const customerOrgIds = [
    ...new Set((packages ?? []).map((pkg) => pkg.customer_org_id)),
  ];

  let customerNamesById = new Map<string, string>();

  if (customerOrgIds.length > 0) {
    const { data: customerOrgs, error: customerOrgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", customerOrgIds);

    if (customerOrgsError) {
      throw new Error(customerOrgsError.message);
    }

    customerNamesById = new Map(
      (customerOrgs ?? []).map((org) => [org.id, org.name]),
    );
  }

  const packageIds = (packages ?? []).map((pkg) => pkg.id);

  let latestQuoteByPackageId = new Map<
    string,
    {
      provider_request_package_id: string;
      quote_version: number;
      status: string;
      submitted_at: string | null;
      total_price: number | null;
      currency_code: string | null;
      estimated_lead_time_days: number | null;
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
          submitted_at,
          total_price,
          currency_code,
          estimated_lead_time_days
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

  const rows: ProviderInboxRow[] = (packages ?? []).map((pkg) => {
    const latestQuote = latestQuoteByPackageId.get(pkg.id);

    return {
      packageId: pkg.id,
      serviceRequestId: pkg.service_request_id,
      packageTitle: pkg.package_title,
      customerOrgName:
        customerNamesById.get(pkg.customer_org_id) ?? "Unknown customer",
      packageStatus: pkg.package_status as ProviderInboxRow["packageStatus"],
      customerVisibleStatus: pkg.customer_visible_status,
      targetDueDate: pkg.target_due_date,
      requestedQuantity: pkg.requested_quantity,
      responseDeadline: pkg.response_deadline,
      publishedAt: pkg.published_at,
      viewedAt: pkg.viewed_at,
      providerRespondedAt: pkg.provider_responded_at,
      awardedAt: pkg.awarded_at,
      createdAt: pkg.created_at,
      latestQuoteStatus:
        (latestQuote?.status as ProviderInboxRow["latestQuoteStatus"]) ?? null,
      latestQuoteVersion: latestQuote?.quote_version ?? null,
      latestQuoteSubmittedAt: latestQuote?.submitted_at ?? null,
      latestTotalPrice: latestQuote?.total_price ?? null,
      latestCurrencyCode: latestQuote?.currency_code ?? null,
      latestLeadTimeDays: latestQuote?.estimated_lead_time_days ?? null,
    };
  });

  const data: ProviderInboxData = { rows };

  return <Client data={data} />;
}
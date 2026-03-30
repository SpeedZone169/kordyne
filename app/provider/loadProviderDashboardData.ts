import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type {
  ProviderCapabilityRow,
  ProviderDashboardData,
  ProviderInboxRow,
  ProviderProfileData,
} from "./types";

type ProviderCapabilityDbRow = {
  id: string;
  provider_org_id: string;
  process_family: string | null;
  process_name: string | null;
  material_family: string | null;
  material_name: string | null;
  machine_type: string | null;
  certification: string | null;
  min_quantity: number | null;
  max_quantity: number | null;
  lead_time_notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ProviderPackageDbRow = {
  id: string;
  service_request_id: string;
  customer_org_id: string;
  package_status: string;
  package_title: string | null;
  requested_quantity: number | null;
  customer_visible_status: string | null;
  target_due_date: string | null;
  response_deadline: string | null;
  published_at: string | null;
  viewed_at: string | null;
  provider_responded_at: string | null;
  awarded_at: string | null;
  created_at: string;
};

type ProviderOrganizationRow = {
  id: string;
  name: string;
};

type LatestQuoteSummaryRow = {
  provider_request_package_id: string;
  quote_version: number;
  status: string;
  submitted_at: string | null;
  total_price: number | null;
  currency_code: string | null;
  estimated_lead_time_days: number | null;
};

type MembershipRow = {
  organization_id: string;
  role: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
};

type ProviderRelationshipRow = {
  provider_org_id: string;
};

type ProviderProfileRow = {
  organization_id: string;
  website: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  logo_path: string | null;
  short_description: string | null;
  certifications: string | null;
  industries_served: string | null;
  capabilities_summary: string | null;
  software_notes: string | null;
  onboarding_completed_at: string | null;
};

function getEmptyData(): ProviderDashboardData {
  return {
    organization: null,
    profile: null,
    capabilities: [],
    rows: [],
    stats: {
      packageCount: 0,
      awaitingResponseCount: 0,
      respondedCount: 0,
      awardedCount: 0,
      latestSubmittedQuoteCount: 0,
      activeCapabilityCount: 0,
      profileCompletionCompleted: 0,
      profileCompletionTotal: 6,
      profileCompletionPercent: 0,
      missingItems: [
        "Company logo",
        "Short company description",
        "Website",
        "Country",
        "Phone",
        "At least one active capability",
      ],
    },
  };
}

export async function loadProviderDashboardData(): Promise<ProviderDashboardData> {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];
  const membershipOrgIds = memberships.map((m) => m.organization_id);

  if (membershipOrgIds.length === 0) {
    return getEmptyData();
  }

  const [
    { data: organizationsRaw, error: organizationsError },
    { data: providerRelationshipsRaw, error: providerRelationshipsError },
    { data: providerProfilesRaw, error: providerProfilesError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug")
      .in("id", membershipOrgIds),
    supabase
      .from("provider_relationships")
      .select("provider_org_id")
      .in("provider_org_id", membershipOrgIds),
    supabase
      .from("provider_profiles")
      .select(
        "organization_id, website, phone, country, city, logo_path, short_description, certifications, industries_served, capabilities_summary, software_notes, onboarding_completed_at",
      )
      .in("organization_id", membershipOrgIds),
  ]);

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (providerRelationshipsError) {
    throw new Error(providerRelationshipsError.message);
  }

  if (providerProfilesError) {
    throw new Error(providerProfilesError.message);
  }

  const organizations = (organizationsRaw ?? []) as OrganizationRow[];
  const providerRelationships =
    (providerRelationshipsRaw ?? []) as ProviderRelationshipRow[];
  const providerProfiles = (providerProfilesRaw ?? []) as ProviderProfileRow[];

  const providerCandidateIds = new Set<string>([
    ...providerRelationships.map((row) => row.provider_org_id),
    ...providerProfiles.map((row) => row.organization_id),
  ]);

  const selectedMembership =
    memberships.find((membership) =>
      providerCandidateIds.has(membership.organization_id),
    ) ?? memberships[0];

  const selectedOrganization =
    organizations.find((org) => org.id === selectedMembership.organization_id) ??
    null;

  if (!selectedOrganization) {
    notFound();
  }

  const selectedProfile =
    providerProfiles.find(
      (profile) => profile.organization_id === selectedOrganization.id,
    ) ?? null;

  const [
    { data: capabilitiesRaw, error: capabilitiesError },
    { data: packagesRaw, error: packagesError },
  ] = await Promise.all([
    supabase
      .from("provider_capabilities")
      .select(
        "id, provider_org_id, process_family, process_name, material_family, material_name, machine_type, certification, min_quantity, max_quantity, lead_time_notes, active, created_at, updated_at",
      )
      .eq("provider_org_id", selectedOrganization.id)
      .order("active", { ascending: false })
      .order("process_family", { ascending: true })
      .order("process_name", { ascending: true }),
    supabase
      .from("provider_request_packages")
      .select(
        `
          id,
          service_request_id,
          customer_org_id,
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
      .eq("provider_org_id", selectedOrganization.id)
      .not("published_at", "is", null)
      .order("published_at", { ascending: false }),
  ]);

  if (capabilitiesError) {
    throw new Error(capabilitiesError.message);
  }

  if (packagesError) {
    throw new Error(packagesError.message);
  }

  const capabilityRows = (capabilitiesRaw ?? []) as ProviderCapabilityDbRow[];

  const capabilities: ProviderCapabilityRow[] = capabilityRows.map((row) => ({
    id: row.id,
    providerOrgId: row.provider_org_id,
    processFamily: row.process_family ?? "",
    processName: row.process_name ?? "",
    materialFamily: row.material_family,
    materialName: row.material_name,
    machineType: row.machine_type,
    certification: row.certification,
    minQuantity: row.min_quantity,
    maxQuantity: row.max_quantity,
    leadTimeNotes: row.lead_time_notes,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const packageRows = (packagesRaw ?? []) as ProviderPackageDbRow[];

  const customerOrgIds = [
    ...new Set(packageRows.map((pkg) => pkg.customer_org_id)),
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
      ((customerOrgs ?? []) as ProviderOrganizationRow[]).map((org) => [
        org.id,
        org.name,
      ]),
    );
  }

  const packageIds = packageRows.map((pkg) => pkg.id);
  const latestQuoteByPackageId = new Map<string, LatestQuoteSummaryRow>();

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

    const quoteRows = (quotes ?? []) as LatestQuoteSummaryRow[];

    for (const quote of quoteRows) {
      if (!latestQuoteByPackageId.has(quote.provider_request_package_id)) {
        latestQuoteByPackageId.set(quote.provider_request_package_id, quote);
      }
    }
  }

  const rows: ProviderInboxRow[] = packageRows.map((pkg) => {
    const latestQuote = latestQuoteByPackageId.get(pkg.id);

    return {
      packageId: pkg.id,
      serviceRequestId: pkg.service_request_id,
      packageTitle: pkg.package_title,
      customerOrgName:
        customerNamesById.get(pkg.customer_org_id) ?? "Unknown customer",
      packageStatus: pkg.package_status,
      customerVisibleStatus: pkg.customer_visible_status,
      targetDueDate: pkg.target_due_date,
      requestedQuantity: pkg.requested_quantity,
      responseDeadline: pkg.response_deadline,
      publishedAt: pkg.published_at,
      viewedAt: pkg.viewed_at,
      providerRespondedAt: pkg.provider_responded_at,
      awardedAt: pkg.awarded_at,
      createdAt: pkg.created_at,
      latestQuoteStatus: latestQuote?.status ?? null,
      latestQuoteVersion: latestQuote?.quote_version ?? null,
      latestQuoteSubmittedAt: latestQuote?.submitted_at ?? null,
      latestTotalPrice: latestQuote?.total_price ?? null,
      latestCurrencyCode: latestQuote?.currency_code ?? null,
      latestLeadTimeDays: latestQuote?.estimated_lead_time_days ?? null,
    };
  });

  const activeCapabilityCount = capabilities.filter((cap) => cap.active).length;
  const packageCount = rows.length;
  const awaitingResponseCount = rows.filter(
    (row) =>
      !row.providerRespondedAt &&
      !["awarded", "not_awarded", "closed", "cancelled"].includes(
        row.packageStatus,
      ),
  ).length;
  const respondedCount = rows.filter((row) => !!row.providerRespondedAt).length;
  const awardedCount = rows.filter(
    (row) => row.packageStatus === "awarded",
  ).length;
  const latestSubmittedQuoteCount = rows.filter(
    (row) => row.latestQuoteStatus === "submitted",
  ).length;

  const profileCompletionChecks = [
    { label: "Company logo", done: Boolean(selectedProfile?.logo_path) },
    {
      label: "Short company description",
      done: Boolean(selectedProfile?.short_description?.trim()),
    },
    { label: "Website", done: Boolean(selectedProfile?.website?.trim()) },
    { label: "Country", done: Boolean(selectedProfile?.country?.trim()) },
    { label: "Phone", done: Boolean(selectedProfile?.phone?.trim()) },
    { label: "At least one active capability", done: activeCapabilityCount > 0 },
  ];

  const profileCompletionCompleted = profileCompletionChecks.filter(
    (item) => item.done,
  ).length;
  const profileCompletionTotal = profileCompletionChecks.length;
  const profileCompletionPercent = Math.round(
    (profileCompletionCompleted / profileCompletionTotal) * 100,
  );
  const missingItems = profileCompletionChecks
    .filter((item) => !item.done)
    .map((item) => item.label);

  let profile: ProviderProfileData | null = null;

  if (selectedProfile) {
    const logoPublicUrl = selectedProfile.logo_path
      ? supabase.storage
          .from("provider-assets")
          .getPublicUrl(selectedProfile.logo_path).data.publicUrl
      : null;

    profile = {
      organizationId: selectedProfile.organization_id,
      website: selectedProfile.website,
      phone: selectedProfile.phone,
      country: selectedProfile.country,
      city: selectedProfile.city,
      logoPath: selectedProfile.logo_path,
      logoPublicUrl,
      shortDescription: selectedProfile.short_description,
      certifications: selectedProfile.certifications,
      industriesServed: selectedProfile.industries_served,
      capabilitiesSummary: selectedProfile.capabilities_summary,
      softwareNotes: selectedProfile.software_notes,
      onboardingCompletedAt: selectedProfile.onboarding_completed_at,
    };
  }

  return {
    organization: {
      id: selectedOrganization.id,
      name: selectedOrganization.name,
      slug: selectedOrganization.slug,
      memberRole: selectedMembership.role,
    },
    profile,
    capabilities,
    rows,
    stats: {
      packageCount,
      awaitingResponseCount,
      respondedCount,
      awardedCount,
      latestSubmittedQuoteCount,
      activeCapabilityCount,
      profileCompletionCompleted,
      profileCompletionTotal,
      profileCompletionPercent,
      missingItems,
    },
  };
}
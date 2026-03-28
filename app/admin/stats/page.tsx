import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type OrganizationRow = {
  id: string;
  billing_status: string;
  onboarding_status: string;
};

type MembershipRow = {
  organization_id: string;
  user_id: string;
};

type ProviderRelationshipRow = {
  customer_org_id: string;
  provider_org_id: string;
  relationship_status: string;
};

type InviteRow = {
  organization_id: string;
  status: string;
};

type RequestRow = {
  id: string;
  organization_id: string;
  request_origin: string;
  status: string;
};

type QuoteRoundRow = {
  id: string;
  service_request_id: string;
  status: string;
  awarded_at: string | null;
};

type DistributionRow = {
  label: string;
  value: number;
};

function formatPercent(value: number) {
  return `${Math.round(value)}%`;
}

function getPercent(value: number, total: number) {
  if (!total) return 0;
  return (value / total) * 100;
}

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "dark" | "soft";
}) {
  const dark = accent === "dark";

  return (
    <div
      className={cx(
        "rounded-[30px] border p-6 shadow-sm",
        dark
          ? "border-slate-900 bg-slate-950 text-white"
          : "border-zinc-200 bg-white text-slate-950"
      )}
    >
      <p
        className={cx(
          "text-xs font-semibold uppercase tracking-[0.24em]",
          dark ? "text-slate-300" : "text-slate-500"
        )}
      >
        {label}
      </p>
      <p className="mt-4 text-4xl font-semibold tracking-tight">{value}</p>
      {hint ? (
        <p
          className={cx(
            "mt-4 text-sm leading-6",
            dark ? "text-slate-300" : "text-slate-600"
          )}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SectionCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-zinc-200 bg-white shadow-sm">
      <div className="border-b border-zinc-200 px-8 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          {eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      <div className="px-8 py-8">{children}</div>
    </section>
  );
}

function HorizontalBarChart({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle?: string;
  rows: DistributionRow[];
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="mb-5">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const percent = getPercent(row.value, total);

          return (
            <div key={row.label} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-slate-700">
                  {row.label}
                </span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-slate-950">{row.value}</span>
                  <span className="text-slate-400">{formatPercent(percent)}</span>
                </div>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-zinc-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StackedBar({
  title,
  totalLabel,
  rows,
}: {
  title: string;
  totalLabel: string;
  rows: Array<DistributionRow & { tone: string }>;
}) {
  const total = rows.reduce((sum, row) => sum + row.value, 0);

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{totalLabel}</p>
        </div>
        <p className="text-2xl font-semibold tracking-tight text-slate-950">
          {total}
        </p>
      </div>

      <div className="mt-5 h-4 overflow-hidden rounded-full bg-zinc-200">
        <div className="flex h-full w-full overflow-hidden rounded-full">
          {rows.map((row) => {
            const percent = getPercent(row.value, total);
            return (
              <div
                key={row.label}
                className={row.tone}
                style={{ width: `${percent}%` }}
                title={`${row.label}: ${row.value}`}
              />
            );
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const percent = getPercent(row.value, total);
          return (
            <div
              key={row.label}
              className="flex items-center justify-between rounded-[18px] border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className={cx("h-3 w-3 rounded-full", row.tone)} />
                <span className="text-sm font-medium text-slate-700">
                  {row.label}
                </span>
              </div>
              <div className="text-sm">
                <span className="font-semibold text-slate-950">{row.value}</span>
                <span className="ml-2 text-slate-400">{formatPercent(percent)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RingStat({
  label,
  value,
  total,
}: {
  label: string;
  value: number;
  total: number;
}) {
  const percent = Math.max(0, Math.min(100, getPercent(value, total)));
  const degrees = Math.round((percent / 100) * 360);

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
      <p className="text-sm font-semibold text-slate-950">{label}</p>

      <div className="mt-6 flex items-center gap-6">
        <div
          className="grid h-24 w-24 place-items-center rounded-full"
          style={{
            background: `conic-gradient(#0f172a 0deg ${degrees}deg, #e4e4e7 ${degrees}deg 360deg)`,
          }}
        >
          <div className="grid h-16 w-16 place-items-center rounded-full bg-white text-center">
            <div>
              <p className="text-lg font-semibold text-slate-950">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                {formatPercent(percent)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-950">{value}</span> of{" "}
            <span className="font-semibold text-slate-950">{total}</span>
          </p>
          <p>Useful for quickly spotting operational conversion health.</p>
        </div>
      </div>
    </div>
  );
}

export default async function AdminStatsPage() {
  await requirePlatformOwner();
  const supabase = createAdminClient();

  const [
    { data: organizations, error: organizationsError },
    { data: memberships, error: membershipsError },
    { data: providerRelationships, error: providerRelationshipsError },
    { data: invites, error: invitesError },
    { data: requests, error: requestsError },
    { data: quoteRounds, error: quoteRoundsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, billing_status, onboarding_status"),
    supabase
      .from("organization_members")
      .select("organization_id, user_id"),
    supabase
      .from("provider_relationships")
      .select("customer_org_id, provider_org_id, relationship_status"),
    supabase
      .from("organization_invites")
      .select("organization_id, status"),
    supabase
      .from("service_requests")
      .select("id, organization_id, request_origin, status"),
    supabase
      .from("provider_quote_rounds")
      .select("id, service_request_id, status, awarded_at"),
    supabase
      .from("profiles")
      .select("user_id"),
  ]);

  if (organizationsError) throw new Error(organizationsError.message);
  if (membershipsError) throw new Error(membershipsError.message);
  if (providerRelationshipsError) throw new Error(providerRelationshipsError.message);
  if (invitesError) throw new Error(invitesError.message);
  if (requestsError) throw new Error(requestsError.message);
  if (quoteRoundsError) throw new Error(quoteRoundsError.message);
  if (profilesError) throw new Error(profilesError.message);

  const orgRows = (organizations ?? []) as OrganizationRow[];
  const membershipRows = (memberships ?? []) as MembershipRow[];
  const providerRows = (providerRelationships ?? []) as ProviderRelationshipRow[];
  const inviteRows = (invites ?? []) as InviteRow[];
  const requestRows = (requests ?? []) as RequestRow[];
  const quoteRoundRows = (quoteRounds ?? []) as QuoteRoundRow[];

  const providerOrgIds = new Set(providerRows.map((row) => row.provider_org_id));
  const customerOrgIds = new Set(providerRows.map((row) => row.customer_org_id));

  const totalOrganizations = orgRows.length;
  const totalUsers = (profiles ?? []).length;
  const totalMemberships = membershipRows.length;
  const totalProviders = providerOrgIds.size;
  const totalCustomers =
    customerOrgIds.size > 0
      ? customerOrgIds.size
      : orgRows.filter((org) => !providerOrgIds.has(org.id)).length;

  const totalProviderRelationships = providerRows.length;
  const activeProviderRelationships = providerRows.filter(
    (row) => row.relationship_status === "active"
  ).length;

  const pendingInvites = inviteRows.filter((row) => row.status === "pending").length;

  const totalRequests = requestRows.length;
  const vaultRequests = requestRows.filter(
    (row) => row.request_origin === "vault"
  ).length;
  const standaloneRequests = requestRows.filter(
    (row) => row.request_origin === "standalone"
  ).length;

  const routedRequestIds = new Set(
    quoteRoundRows.map((row) => row.service_request_id)
  );
  const routedRequests = routedRequestIds.size;

  const awardedQuoteRounds = quoteRoundRows.filter(
    (row) => !!row.awarded_at || row.status === "awarded"
  ).length;

  const customerBillingCounts = {
    pending: 0,
    paid: 0,
    trial: 0,
    overdue: 0,
    inactive: 0,
  };

  const onboardingCounts = {
    lead: 0,
    contacted: 0,
    approved: 0,
    invited: 0,
    active: 0,
    paused: 0,
  };

  for (const org of orgRows) {
    if (!providerOrgIds.has(org.id) && org.billing_status in customerBillingCounts) {
      customerBillingCounts[
        org.billing_status as keyof typeof customerBillingCounts
      ] += 1;
    }

    if (org.onboarding_status in onboardingCounts) {
      onboardingCounts[org.onboarding_status as keyof typeof onboardingCounts] += 1;
    }
  }

  const requestStatusCounts = {
    draft: 0,
    submitted: 0,
    in_review: 0,
    awaiting_customer: 0,
    approved: 0,
    in_progress: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
  };

  for (const request of requestRows) {
    if (request.status in requestStatusCounts) {
      requestStatusCounts[request.status as keyof typeof requestStatusCounts] += 1;
    }
  }

  const orgMixRows = [
    { label: "Customer organizations", value: totalCustomers },
    { label: "Provider organizations", value: totalProviders },
  ];

  const billingRows = [
    { label: "Pending", value: customerBillingCounts.pending, tone: "bg-slate-300" },
    { label: "Paid", value: customerBillingCounts.paid, tone: "bg-slate-900" },
    { label: "Trial", value: customerBillingCounts.trial, tone: "bg-slate-500" },
    { label: "Overdue", value: customerBillingCounts.overdue, tone: "bg-slate-700" },
    { label: "Inactive", value: customerBillingCounts.inactive, tone: "bg-zinc-400" },
  ];

  const onboardingRows = [
    { label: "Lead", value: onboardingCounts.lead, tone: "bg-slate-300" },
    { label: "Contacted", value: onboardingCounts.contacted, tone: "bg-slate-400" },
    { label: "Approved", value: onboardingCounts.approved, tone: "bg-slate-500" },
    { label: "Invited", value: onboardingCounts.invited, tone: "bg-slate-700" },
    { label: "Active", value: onboardingCounts.active, tone: "bg-slate-900" },
    { label: "Paused", value: onboardingCounts.paused, tone: "bg-zinc-400" },
  ];

  const requestOriginRows = [
    { label: "Vault-linked requests", value: vaultRequests },
    { label: "Standalone requests", value: standaloneRequests },
  ];

  const requestStatusRows: DistributionRow[] = [
    { label: "Submitted", value: requestStatusCounts.submitted },
    { label: "In review", value: requestStatusCounts.in_review },
    { label: "Approved", value: requestStatusCounts.approved },
    { label: "In progress", value: requestStatusCounts.in_progress },
    { label: "Completed", value: requestStatusCounts.completed },
    { label: "Rejected", value: requestStatusCounts.rejected },
    { label: "Cancelled", value: requestStatusCounts.cancelled },
  ].filter((row) => row.value > 0);

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
            Platform overview
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
            Kordyne operating metrics
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
            Internal view of platform growth, onboarding progress, request flow,
            provider coordination, and customer commercial state.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total users"
              value={totalUsers}
              hint={`${totalMemberships} memberships across organizations`}
            />
            <StatCard
              label="Organizations"
              value={totalOrganizations}
              hint={`${totalCustomers} customer companies · ${totalProviders} provider organizations`}
            />
            <StatCard
              label="Requests"
              value={totalRequests}
              hint={`${vaultRequests} vault-linked · ${standaloneRequests} standalone`}
            />
            <StatCard
              label="Pending invites"
              value={pendingInvites}
              hint="Customer and provider invites waiting to be accepted"
              accent="dark"
            />
          </div>
        </div>

        <RingStat
          label="Routed request ratio"
          value={routedRequests}
          total={totalRequests}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Provider relationships"
          value={totalProviderRelationships}
          hint={`${activeProviderRelationships} active relationships`}
        />
        <StatCard
          label="Awarded rounds"
          value={awardedQuoteRounds}
          hint={`${quoteRoundRows.length} total quote rounds`}
        />
        <StatCard
          label="Paid customers"
          value={customerBillingCounts.paid}
          hint="Customer organizations currently marked paid"
        />
        <StatCard
          label="Provider organizations"
          value={totalProviders}
          hint="Distinct provider orgs connected to the platform"
        />
      </section>

      <SectionCard
        eyebrow="Commercial and onboarding"
        title="Customer commercial state"
        description="Track where customer companies sit in billing and onboarding so you can understand commercial readiness and who is ready for activation."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <StackedBar
            title="Billing breakdown"
            totalLabel="Customer organizations by billing state"
            rows={billingRows}
          />

          <StackedBar
            title="Onboarding breakdown"
            totalLabel="Organizations by onboarding stage"
            rows={onboardingRows}
          />
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Operational flow"
        title="Request and routing performance"
        description="Understand how requests are entering the platform, how much is routed to providers, and where operational load sits."
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <HorizontalBarChart
            title="Organization mix"
            subtitle="Customer versus provider footprint"
            rows={orgMixRows}
          />

          <HorizontalBarChart
            title="Request origin mix"
            subtitle="How work enters Kordyne"
            rows={requestOriginRows}
          />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <HorizontalBarChart
            title="Request status distribution"
            subtitle="Current operational backlog and progress"
            rows={
              requestStatusRows.length > 0
                ? requestStatusRows
                : [{ label: "No request statuses yet", value: 0 }]
            }
          />

          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-sm font-semibold text-slate-950">
              Conversion summary
            </p>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-[18px] border border-zinc-200 bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Requests routed to providers
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Requests with at least one quote round
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-950">
                    {routedRequests}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatPercent(getPercent(routedRequests, totalRequests))}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-zinc-200 bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Awarded quote rounds
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Rounds reaching award stage
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-950">
                    {awardedQuoteRounds}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatPercent(
                      getPercent(awardedQuoteRounds, quoteRoundRows.length)
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-[18px] border border-zinc-200 bg-white px-4 py-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Active provider relationships
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Relationship readiness
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-slate-950">
                    {activeProviderRelationships}
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatPercent(
                      getPercent(
                        activeProviderRelationships,
                        totalProviderRelationships
                      )
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Traffic and interest"
        title="External interest tracking"
        description="This page shows internal platform data. For public traffic, referrers, page views, countries, and visitor trends, use Vercel Web Analytics."
      >
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-sm font-semibold text-slate-950">
              What to watch in analytics
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                "Homepage visits",
                "/platform visits",
                "/enterprise visits",
                "/providers visits",
                "/contact visits",
                "Referrers and campaigns",
                "Countries and devices",
                "Traffic over time",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-[18px] border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-700"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-slate-950 p-6 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
              Next actions
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
              Combine traffic and platform data
            </h3>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              Use this page for internal operating metrics, and Vercel Analytics
              for public market interest and traffic behavior.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/admin/organizations"
                className="rounded-full bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-zinc-100"
              >
                Manage organizations
              </Link>
              <Link
                href="/admin/providers"
                className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
              >
                Manage providers
              </Link>
              <Link
                href="/admin/requests"
                className="rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-900"
              >
                Review requests
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
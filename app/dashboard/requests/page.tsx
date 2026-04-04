import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServiceRequestActions from "../parts/[id]/ServiceRequestActions";
import StandaloneRequestActions from "./StandaloneRequestActions";
import {
  STATUS_BADGE_CLASSES,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_TYPES,
  getManufacturingTypeLabel,
  getPriorityLabel,
  getRequestOriginLabel,
  getServiceRequestStatusLabel,
  getServiceRequestTypeLabel,
  getSourceReferenceTypeLabel,
} from "@/lib/service-requests";

type RequestsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    type?: string;
    mine?: string;
    part?: string;
    mode?: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type PartFileRow = {
  id: string;
  file_name: string;
  asset_category: string | null;
  file_type: string | null;
};

type RequestPartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
};

type ServiceRequestFileRow = {
  id: string;
};

type UploadedRequestFileRow = {
  id: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type ServiceRequestRow = {
  id: string;
  organization_id: string;
  part_id: string | null;
  requested_by_user_id: string;
  title: string | null;
  request_type: string;
  request_origin: string | null;
  requested_item_name: string | null;
  requested_item_reference: string | null;
  status: string;
  priority: string | null;
  notes: string | null;
  due_date: string | null;
  manufacturing_type: string | null;
  source_reference_type: string | null;
  created_at: string;
  completed_at: string | null;
  quoted_price_cents: number | null;
  parts: RequestPartRow | RequestPartRow[] | null;
  service_request_files: ServiceRequestFileRow[] | null;
  service_request_uploaded_files: UploadedRequestFileRow[] | null;
};

type RequesterSummary = {
  userId: string;
  fullName: string | null;
  email: string | null;
  total: number;
  open: number;
  completed: number;
  overdue: number;
};

type ProviderPackageWorkflowRow = {
  id: string;
  service_request_id: string;
  package_status: string;
  response_deadline: string | null;
  provider_responded_at: string | null;
  awarded_at: string | null;
  published_at: string | null;
};

type ProviderQuoteWorkflowRow = {
  id: string;
  provider_request_package_id: string;
  status: string;
  submitted_at: string | null;
  created_at: string;
};

type ProviderInvoiceWorkflowRow = {
  id: string;
  provider_request_package_id: string;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

type RequestWorkflowSummary = {
  tone: "neutral" | "info" | "success" | "warning";
  label: string;
  helper: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatCurrencyFromCents(value: number | null) {
  if (value == null || value <= 0) return "—";
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getPriorityBadgeClass(priority: string | null) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-amber-100 text-amber-800";
    case "normal":
      return "bg-blue-100 text-blue-800";
    case "low":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-slate-900 text-white";
    case "engineer":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isTerminalStatus(status: string) {
  return ["completed", "rejected", "cancelled"].includes(status);
}

function isOverdue(request: Pick<ServiceRequestRow, "due_date" | "status">) {
  if (!request.due_date || isTerminalStatus(request.status)) return false;

  const due = new Date(request.due_date);
  const now = new Date();
  due.setHours(23, 59, 59, 999);

  return due.getTime() < now.getTime();
}

function getDaysBetween(start: string, end: string) {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();

  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate < startDate) {
    return null;
  }

  return (endDate - startDate) / (1000 * 60 * 60 * 24);
}

function getRequesterLabel(profile: ProfileRow | null | undefined) {
  if (!profile) return "Unknown user";
  return profile.full_name || profile.email || "Unknown user";
}

function buildRequestsHref(params: {
  part?: string;
  q?: string;
  status?: string;
  type?: string;
  mine?: string;
  mode?: string;
}) {
  const search = new URLSearchParams();

  if (params.part) search.set("part", params.part);
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  if (params.mine) search.set("mine", params.mine);
  if (params.mode) search.set("mode", params.mode);

  const query = search.toString();
  return query ? `/dashboard/requests?${query}` : "/dashboard/requests";
}

function StepBadge({ step }: { step: string }) {
  return (
    <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
      {step}
    </span>
  );
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold text-slate-900">{value}</div>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
}

function pluralize(count: number, singular: string, plural?: string) {
  return `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`;
}

function isAwaitingProviderResponse(status: string) {
  return ["published", "viewed", "awaiting_provider_response"].includes(status);
}

function isQuoteSubmitted(quote: Pick<ProviderQuoteWorkflowRow, "status" | "submitted_at">) {
  return Boolean(quote.submitted_at) || quote.status === "submitted";
}

function getActionToneClasses(
  tone: RequestWorkflowSummary["tone"],
) {
  switch (tone) {
    case "info":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "success":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "warning":
      return "bg-amber-100 text-amber-800 border-amber-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function getRequestWorkflowSummary(args: {
  request: ServiceRequestRow;
  packages: ProviderPackageWorkflowRow[];
  quotes: ProviderQuoteWorkflowRow[];
  invoices: ProviderInvoiceWorkflowRow[];
}) {
  const { request, packages, quotes, invoices } = args;

  const submittedQuotes = quotes.filter(isQuoteSubmitted);
  const unpaidInvoices = invoices.filter((invoice) => !invoice.paid_at);
  const awardedPackages = packages.filter(
    (pkg) => pkg.package_status === "awarded" || Boolean(pkg.awarded_at),
  );
  const awaitingPackages = packages.filter(
    (pkg) =>
      isAwaitingProviderResponse(pkg.package_status) &&
      !pkg.provider_responded_at,
  );
  const overdueAwaitingPackages = awaitingPackages.filter((pkg) => {
    if (!pkg.response_deadline) return false;
    return new Date(pkg.response_deadline).getTime() < Date.now();
  });

  if (unpaidInvoices.length > 0) {
    return {
      tone: "warning",
      label: "Invoice received",
      helper: `${pluralize(unpaidInvoices.length, "invoice")} ready for customer review and AP follow-up.`,
      primaryHref: `/dashboard/requests/${request.id}/invoices`,
      primaryLabel: "Open invoices",
      secondaryHref: `/dashboard/requests/${request.id}`,
      secondaryLabel: "View request",
    } satisfies RequestWorkflowSummary;
  }

  if (awardedPackages.length > 0) {
    return {
      tone: "success",
      label: "Awarded",
      helper: "Provider award is in place. Track delivery progress and incoming invoicing.",
      primaryHref: `/dashboard/requests/${request.id}/quotes`,
      primaryLabel: "View award",
      secondaryHref: `/dashboard/requests/${request.id}`,
      secondaryLabel: "View request",
    } satisfies RequestWorkflowSummary;
  }

  if (submittedQuotes.length > 1) {
    return {
      tone: "info",
      label: "Compare quotes",
      helper: `${pluralize(submittedQuotes.length, "provider quote")} submitted. Review and award the best option.`,
      primaryHref: `/dashboard/requests/${request.id}/quotes`,
      primaryLabel: "Compare quotes",
      secondaryHref: `/dashboard/requests/${request.id}`,
      secondaryLabel: "View request",
    } satisfies RequestWorkflowSummary;
  }

  if (submittedQuotes.length === 1) {
    return {
      tone: "info",
      label: "Quote received",
      helper: "1 provider quote is ready for review and award decision.",
      primaryHref: `/dashboard/requests/${request.id}/quotes`,
      primaryLabel: "Review quote",
      secondaryHref: `/dashboard/requests/${request.id}`,
      secondaryLabel: "View request",
    } satisfies RequestWorkflowSummary;
  }

  if (overdueAwaitingPackages.length > 0) {
    return {
      tone: "warning",
      label: "Overdue response",
      helper: `${pluralize(overdueAwaitingPackages.length, "provider response")} overdue. Check routing and follow up.`,
      primaryHref: `/dashboard/requests/${request.id}/providers`,
      primaryLabel: "Manage routing",
      secondaryHref: `/dashboard/requests/${request.id}`,
      secondaryLabel: "View request",
    } satisfies RequestWorkflowSummary;
  }

  if (awaitingPackages.length > 0) {
    return {
      tone: "neutral",
      label: "Awaiting quotes",
      helper: `Waiting on ${pluralize(awaitingPackages.length, "provider response")} for this request.`,
      primaryHref: `/dashboard/requests/${request.id}/quotes`,
      primaryLabel: "Track quotes",
      secondaryHref: `/dashboard/requests/${request.id}/providers`,
      secondaryLabel: "Routing",
    } satisfies RequestWorkflowSummary;
  }

  if (isTerminalStatus(request.status)) {
    return {
      tone: "neutral",
      label: "Closed request",
      helper: "This request is closed. Open the record for full history and documents.",
      primaryHref: `/dashboard/requests/${request.id}`,
      primaryLabel: "Open request",
      secondaryHref: `/dashboard/requests/${request.id}/quotes`,
      secondaryLabel: "View quotes",
    } satisfies RequestWorkflowSummary;
  }

  return {
    tone: "neutral",
    label: "Ready to route",
    helper: "No provider package is live yet. Publish routing when the request is ready.",
    primaryHref: `/dashboard/requests/${request.id}/providers`,
    primaryLabel: "Manage routing",
    secondaryHref: `/dashboard/requests/${request.id}`,
    secondaryLabel: "Open request",
  } satisfies RequestWorkflowSummary;
}

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryText = resolvedSearchParams.q?.trim() || "";
  const statusFilter = resolvedSearchParams.status?.trim() || "";
  const typeFilter = resolvedSearchParams.type?.trim() || "";
  const selectedPartId = resolvedSearchParams.part?.trim() || "";
  const mineFilter = resolvedSearchParams.mine === "true";
  const mode =
    resolvedSearchParams.mode === "standalone" ? "standalone" : "vault";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const membershipRows = (memberships as MembershipRow[] | null) ?? [];
  const organizationIds = membershipRows.map((m) => m.organization_id);
  const orgRole = membershipRows[0]?.role || null;
  const activeOrganizationId = membershipRows[0]?.organization_id || null;
  const isAdmin = orgRole === "admin";
  const canRequest = orgRole === "admin" || orgRole === "engineer";

  if (organizationIds.length === 0 || !activeOrganizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Service Requests
        </h1>
        <p className="text-sm text-slate-600">
          You are not a member of any organization.
        </p>
      </div>
    );
  }

  const { data: orgParts } = await supabase
    .from("parts")
    .select("id, name, part_number, revision, status, updated_at, created_at")
    .in("organization_id", organizationIds)
    .order("updated_at", { ascending: false });

  const partOptions = (orgParts as PartRow[] | null) ?? [];

  const selectedPart = selectedPartId
    ? partOptions.find((part) => part.id === selectedPartId) || null
    : null;

  const { data: selectedPartFiles } =
    selectedPartId && selectedPart
      ? await supabase
          .from("part_files")
          .select("id, file_name, asset_category, file_type")
          .eq("part_id", selectedPartId)
          .order("created_at", { ascending: false })
      : { data: [] as PartFileRow[] };

  let query = supabase
    .from("service_requests")
    .select(
      `
      id,
      organization_id,
      part_id,
      requested_by_user_id,
      title,
      request_type,
      request_origin,
      requested_item_name,
      requested_item_reference,
      status,
      priority,
      notes,
      due_date,
      manufacturing_type,
      source_reference_type,
      created_at,
      completed_at,
      quoted_price_cents,
      parts (
        id,
        name,
        part_number,
        revision
      ),
      service_request_files (
        id
      ),
      service_request_uploaded_files (
        id
      )
    `,
    )
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.or(
      `title.ilike.%${queryText}%,notes.ilike.%${queryText}%,requested_item_name.ilike.%${queryText}%,requested_item_reference.ilike.%${queryText}%`,
    );
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (typeFilter) {
    query = query.eq("request_type", typeFilter);
  }

  if (mineFilter) {
    query = query.eq("requested_by_user_id", user.id);
  }

  const { data: requests, error } = await query;
  const requestRows = (requests as ServiceRequestRow[] | null) ?? [];

  const requesterIds = Array.from(
    new Set(
      requestRows
        .map((request) => request.requested_by_user_id)
        .filter(Boolean),
    ),
  );

  const { data: requesterProfiles } =
    requesterIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", requesterIds)
      : { data: [] as ProfileRow[] };

  const requesterProfileMap = new Map(
    ((requesterProfiles as ProfileRow[] | null) ?? []).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );

  const requestIds = requestRows.map((request) => request.id);

  const { data: workflowPackages, error: workflowPackagesError } =
    requestIds.length > 0
      ? await supabase
          .from("provider_request_packages")
          .select(
            `
              id,
              service_request_id,
              package_status,
              response_deadline,
              provider_responded_at,
              awarded_at,
              published_at
            `,
          )
          .in("service_request_id", requestIds)
      : { data: [] as ProviderPackageWorkflowRow[], error: null };

  if (workflowPackagesError) {
    throw new Error(workflowPackagesError.message);
  }

  const packageRows = (workflowPackages as ProviderPackageWorkflowRow[] | null) ?? [];
  const packageIds = packageRows.map((pkg) => pkg.id);

  const { data: workflowQuotes, error: workflowQuotesError } =
    packageIds.length > 0
      ? await supabase
          .from("provider_quotes")
          .select(
            `
              id,
              provider_request_package_id,
              status,
              submitted_at,
              created_at
            `,
          )
          .in("provider_request_package_id", packageIds)
      : { data: [] as ProviderQuoteWorkflowRow[], error: null };

  if (workflowQuotesError) {
    throw new Error(workflowQuotesError.message);
  }

  const quoteRows = (workflowQuotes as ProviderQuoteWorkflowRow[] | null) ?? [];

  const { data: workflowInvoices, error: workflowInvoicesError } =
    packageIds.length > 0
      ? await supabase
          .from("provider_invoices")
          .select(
            `
              id,
              provider_request_package_id,
              status,
              due_date,
              paid_at,
              created_at
            `,
          )
          .in("provider_request_package_id", packageIds)
      : { data: [] as ProviderInvoiceWorkflowRow[], error: null };

  if (workflowInvoicesError) {
    throw new Error(workflowInvoicesError.message);
  }

  const invoiceRows =
    (workflowInvoices as ProviderInvoiceWorkflowRow[] | null) ?? [];

  const packagesByRequestId = new Map<string, ProviderPackageWorkflowRow[]>();
  for (const pkg of packageRows) {
    const current = packagesByRequestId.get(pkg.service_request_id) ?? [];
    current.push(pkg);
    packagesByRequestId.set(pkg.service_request_id, current);
  }

  const quotesByPackageId = new Map<string, ProviderQuoteWorkflowRow[]>();
  for (const quote of quoteRows) {
    const current = quotesByPackageId.get(quote.provider_request_package_id) ?? [];
    current.push(quote);
    quotesByPackageId.set(quote.provider_request_package_id, current);
  }

  const invoicesByPackageId = new Map<string, ProviderInvoiceWorkflowRow[]>();
  for (const invoice of invoiceRows) {
    const current =
      invoicesByPackageId.get(invoice.provider_request_package_id) ?? [];
    current.push(invoice);
    invoicesByPackageId.set(invoice.provider_request_package_id, current);
  }

  const totalRequests = requestRows.length;
  const activeRequestsCount = requestRows.filter(
    (request) => !isTerminalStatus(request.status),
  ).length;
  const overdueRequestsCount = requestRows.filter(isOverdue).length;

  const completedRequests = requestRows.filter(
    (request) => request.status === "completed" && request.completed_at,
  );

  const averageCompletionDays =
    completedRequests.length > 0
      ? (
          completedRequests.reduce((sum, request) => {
            const days = request.completed_at
              ? getDaysBetween(request.created_at, request.completed_at)
              : null;
            return sum + (days ?? 0);
          }, 0) / completedRequests.length
        ).toFixed(1)
      : null;

  const requesterSummaryMap = new Map<string, RequesterSummary>();

  for (const request of requestRows) {
    const existing = requesterSummaryMap.get(request.requested_by_user_id);
    const profile = requesterProfileMap.get(request.requested_by_user_id) ?? null;

    if (!existing) {
      requesterSummaryMap.set(request.requested_by_user_id, {
        userId: request.requested_by_user_id,
        fullName: profile?.full_name ?? null,
        email: profile?.email ?? null,
        total: 1,
        open: isTerminalStatus(request.status) ? 0 : 1,
        completed: request.status === "completed" ? 1 : 0,
        overdue: isOverdue(request) ? 1 : 0,
      });
    } else {
      existing.total += 1;
      if (!isTerminalStatus(request.status)) existing.open += 1;
      if (request.status === "completed") existing.completed += 1;
      if (isOverdue(request)) existing.overdue += 1;
    }
  }

  const requesterSummaries = Array.from(requesterSummaryMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              ← Back to dashboard
            </Link>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard/parts"
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Open Parts Vault
              </Link>
              <Link
                href="/dashboard/insights"
                className="inline-flex rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Operational insights
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                orgRole,
              )}`}
            >
              {orgRole || "unknown"}
            </span>
            <span className="text-sm text-slate-500">
              {isAdmin
                ? "Admin visibility across the full organization request queue."
                : canRequest
                  ? "You can create and manage your organization requests."
                  : "Read-only visibility. Viewers can monitor requests only."}
            </span>
          </div>

          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Service Requests
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Start from an exact vault revision or begin as a standalone intake
              and link it to the vault later.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="space-y-6">
          <div>
            <StepBadge step="Step 1" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
              Choose how to start
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              From vault keeps exact revision context from the start. Standalone
              begins with request uploads and links to the vault later.
            </p>
          </div>

          <div className="inline-flex w-full max-w-md rounded-2xl border border-slate-200 bg-slate-50 p-1">
            <Link
              href={buildRequestsHref({
                q: queryText || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                mine: mineFilter ? "true" : undefined,
                part: selectedPartId || undefined,
                mode: "vault",
              })}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition ${
                mode === "vault"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              From vault
            </Link>

            <Link
              href={buildRequestsHref({
                q: queryText || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                mine: mineFilter ? "true" : undefined,
                mode: "standalone",
              })}
              className={`flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition ${
                mode === "standalone"
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white"
              }`}
            >
              Standalone
            </Link>
          </div>

          {mode === "vault" ? (
            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <div>
                  <StepBadge step="Step 2" />
                  <h3 className="mt-3 text-xl font-semibold text-slate-900">
                    Select vault revision
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Choose the exact revision that should anchor the request.
                  </p>
                </div>

                <form className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      Select part revision
                    </label>
                    <select
                      name="part"
                      defaultValue={selectedPartId}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      disabled={!canRequest}
                    >
                      <option value="">Choose a part revision</option>
                      {partOptions.map((part) => (
                        <option key={part.id} value={part.id}>
                          {part.name}
                          {part.part_number ? ` · ${part.part_number}` : ""}
                          {part.revision ? ` · Rev ${part.revision}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={!canRequest}
                      className="inline-flex w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50 lg:w-auto"
                    >
                      Load part
                    </button>
                  </div>

                  <div className="flex items-end">
                    <Link
                      href={buildRequestsHref({
                        q: queryText || undefined,
                        status: statusFilter || undefined,
                        type: typeFilter || undefined,
                        mine: mineFilter ? "true" : undefined,
                        mode: "vault",
                      })}
                      className="inline-flex w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50 lg:w-auto"
                    >
                      Clear
                    </Link>
                  </div>
                </form>

                {selectedPart ? (
                  <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="font-medium text-slate-900">
                          {selectedPart.name}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
                          <span>Part Number {selectedPart.part_number || "—"}</span>
                          <span>Revision {selectedPart.revision || "—"}</span>
                          <span>Status {selectedPart.status || "—"}</span>
                          <span>
                            Updated{" "}
                            {formatDateTime(
                              selectedPart.updated_at || selectedPart.created_at,
                            )}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/dashboard/parts/${selectedPart.id}`}
                        className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                      >
                        Open part revision
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                    Load a revision to unlock the final request step.
                  </div>
                )}
              </section>

              {selectedPart ? (
                <ServiceRequestActions
                  partId={selectedPart.id}
                  canRequest={canRequest}
                  availableFiles={((selectedPartFiles as PartFileRow[] | null) ?? []).map(
                    (file) => ({
                      id: file.id,
                      fileName: file.file_name,
                      assetCategory: file.asset_category,
                      fileType: file.file_type,
                    }),
                  )}
                />
              ) : null}
            </div>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <div>
                <StepBadge step="Step 2" />
                <h3 className="mt-3 text-xl font-semibold text-slate-900">
                  Create standalone request
                </h3>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Choose the request type and continue with uploads and request
                  details inside the request flow.
                </p>
              </div>

              <div className="mt-6">
                <StandaloneRequestActions
                  organizationId={activeOrganizationId}
                  canRequest={canRequest}
                />
              </div>
            </section>
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Request queue
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Review service requests across the current workspace and act on the
              next commercial step without drilling into every record first.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={buildRequestsHref({
                part: selectedPartId || undefined,
                q: queryText || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                mode,
              })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                !mineFilter
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              All requests
            </Link>
            <Link
              href={buildRequestsHref({
                part: selectedPartId || undefined,
                q: queryText || undefined,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                mine: "true",
                mode,
              })}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                mineFilter
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Requested by me
            </Link>
          </div>
        </div>

        <form className="mt-6 grid gap-4 md:grid-cols-4">
          <input type="hidden" name="part" value={selectedPartId} />
          <input type="hidden" name="mode" value={mode} />

          <div className="md:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              type="text"
              name="q"
              defaultValue={queryText}
              placeholder="Search by title, notes, requested item, or reference"
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All statuses</option>
              {SERVICE_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getServiceRequestStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              name="type"
              defaultValue={typeFilter}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All types</option>
              {SERVICE_REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getServiceRequestTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Scope
            </label>
            <select
              name="mine"
              defaultValue={mineFilter ? "true" : ""}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All requests</option>
              <option value="true">Requested by me</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply
            </button>

            <Link
              href={buildRequestsHref({
                mode,
              })}
              className="inline-flex rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </div>
        </form>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load requests.
          </div>
        ) : requestRows.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
            No requests found for the current filters.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {requestRows.map((request) => {
              const part = Array.isArray(request.parts)
                ? request.parts[0]
                : request.parts;

              const vaultAttachmentCount = Array.isArray(request.service_request_files)
                ? request.service_request_files.length
                : 0;

              const uploadedAttachmentCount = Array.isArray(
                request.service_request_uploaded_files,
              )
                ? request.service_request_uploaded_files.length
                : 0;

              const attachmentCount =
                vaultAttachmentCount + uploadedAttachmentCount;

              const statusKey =
                request.status as keyof typeof STATUS_BADGE_CLASSES;

              const requestTypeLabel = getServiceRequestTypeLabel(
                request.request_type as
                  | "manufacture_part"
                  | "cad_creation"
                  | "optimization",
              );

              const requesterProfile =
                requesterProfileMap.get(request.requested_by_user_id) ?? null;

              const requestPackages = packagesByRequestId.get(request.id) ?? [];
              const requestQuotes = requestPackages.flatMap(
                (pkg) => quotesByPackageId.get(pkg.id) ?? [],
              );
              const requestInvoices = requestPackages.flatMap(
                (pkg) => invoicesByPackageId.get(pkg.id) ?? [],
              );
              const workflowSummary = getRequestWorkflowSummary({
                request,
                packages: requestPackages,
                quotes: requestQuotes,
                invoices: requestInvoices,
              });

              const submittedQuotesCount =
                requestQuotes.filter(isQuoteSubmitted).length;
              const awaitingResponsesCount = requestPackages.filter(
                (pkg) =>
                  isAwaitingProviderResponse(pkg.package_status) &&
                  !pkg.provider_responded_at,
              ).length;
              const outstandingInvoicesCount = requestInvoices.filter(
                (invoice) => !invoice.paid_at,
              ).length;

              return (
                <div
                  key={request.id}
                  className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm lg:p-6"
                >
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.62fr)_minmax(320px,1fr)] lg:items-start">
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/dashboard/requests/${request.id}`}
                              className="text-lg font-semibold text-slate-900 transition hover:text-slate-700"
                            >
                              {request.title || requestTypeLabel}
                            </Link>

                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                STATUS_BADGE_CLASSES[statusKey] ??
                                "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {getServiceRequestStatusLabel(
                                request.status as
                                  | "draft"
                                  | "submitted"
                                  | "in_review"
                                  | "awaiting_customer"
                                  | "approved"
                                  | "in_progress"
                                  | "completed"
                                  | "rejected"
                                  | "cancelled",
                              )}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                              {getRequestOriginLabel(request.request_origin)}
                            </span>

                            {isOverdue(request) ? (
                              <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                                Overdue
                              </span>
                            ) : null}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1">
                              {requestTypeLabel}
                            </span>

                            {request.request_type === "manufacture_part" ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                {getManufacturingTypeLabel(
                                  request.manufacturing_type,
                                )}
                              </span>
                            ) : null}

                            <span
                              className={`rounded-full px-2.5 py-1 font-medium ${getPriorityBadgeClass(
                                request.priority,
                              )}`}
                            >
                              {request.priority
                                ? getPriorityLabel(
                                    request.priority as
                                      | "low"
                                      | "normal"
                                      | "high"
                                      | "urgent",
                                  )
                                : "No priority"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1">
                              {attachmentCount} attached
                            </span>

                            <span className="rounded-full bg-slate-100 px-2.5 py-1">
                              {getSourceReferenceTypeLabel(
                                request.source_reference_type,
                              )}
                            </span>

                            {request.due_date ? (
                              <span className="rounded-full bg-slate-100 px-2.5 py-1">
                                Due {formatDate(request.due_date)}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="text-xs text-slate-500 lg:text-right">
                          <div>Created {formatDateTime(request.created_at)}</div>
                          {request.quoted_price_cents != null ? (
                            <div className="mt-1">
                              Quote {formatCurrencyFromCents(request.quoted_price_cents)}
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span>
                          Requested by {getRequesterLabel(requesterProfile)}
                        </span>
                      </div>

                      {part ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {part.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>Part Number {part.part_number || "—"}</span>
                            <span>Revision {part.revision || "—"}</span>
                          </div>
                        </div>
                      ) : request.request_origin === "standalone" ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                          <div className="font-medium text-slate-900">
                            {request.requested_item_name || "Standalone item"}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>
                              Reference {request.requested_item_reference || "—"}
                            </span>
                            <span>Not yet linked to vault</span>
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                          No linked part revision
                        </div>
                      )}

                      {request.notes ? (
                        <p className="line-clamp-2 text-sm leading-6 text-slate-600">
                          {request.notes}
                        </p>
                      ) : null}
                    </div>

                    <aside className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getActionToneClasses(
                              workflowSummary.tone,
                            )}`}
                          >
                            {workflowSummary.label}
                          </span>
                          <h3 className="mt-3 text-lg font-semibold text-slate-900">
                            Next action
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">
                            {workflowSummary.helper}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            Quote activity
                          </div>
                          <div className="mt-2 text-base font-semibold text-slate-900">
                            {submittedQuotesCount > 0
                              ? `${submittedQuotesCount} received`
                              : awaitingResponsesCount > 0
                                ? `${awaitingResponsesCount} awaiting`
                                : "Not started"}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-white p-4 shadow-sm">
                          <div className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            Invoice activity
                          </div>
                          <div className="mt-2 text-base font-semibold text-slate-900">
                            {outstandingInvoicesCount > 0
                              ? `${outstandingInvoicesCount} open`
                              : requestInvoices.length > 0
                                ? "Completed"
                                : "No invoices"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">
                        <Link
                          href={workflowSummary.primaryHref}
                          className="inline-flex rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                        >
                          {workflowSummary.primaryLabel}
                        </Link>

                        <Link
                          href={workflowSummary.secondaryHref}
                          className="inline-flex rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                        >
                          {workflowSummary.secondaryLabel}
                        </Link>
                      </div>
                    </aside>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total requests"
          value={totalRequests.toString()}
          helper="All requests in the current view."
        />
        <MetricCard
          label="Active queue"
          value={activeRequestsCount.toString()}
          helper="Requests not yet closed."
        />
        <MetricCard
          label="Overdue"
          value={overdueRequestsCount.toString()}
          helper="Open requests past due date."
        />
        <MetricCard
          label="Avg. completion time"
          value={averageCompletionDays ? `${averageCompletionDays}d` : "—"}
          helper="Based on completed requests only."
        />
      </section>

      {isAdmin ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                Request activity by requester
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Organization-wide visibility of request ownership and queue
                distribution.
              </p>
            </div>

            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {requesterSummaries.length} requester
              {requesterSummaries.length === 1 ? "" : "s"}
            </div>
          </div>

          {requesterSummaries.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
              No requester activity found for the current filters.
            </div>
          ) : (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {requesterSummaries.map((summary) => (
                <div
                  key={summary.userId}
                  className="rounded-2xl border border-slate-200 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-900">
                        {summary.fullName || summary.email || "Unknown user"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {summary.email || "No email"}
                      </div>
                    </div>

                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                      {summary.total} request{summary.total === 1 ? "" : "s"}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Open</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {summary.open}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Completed</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {summary.completed}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="text-xs text-slate-500">Overdue</div>
                      <div className="mt-1 text-lg font-semibold text-slate-900">
                        {summary.overdue}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
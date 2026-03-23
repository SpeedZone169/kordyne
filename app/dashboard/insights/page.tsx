import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type InsightsPageProps = {
  searchParams?: Promise<{
    range?: string;
    scope?: string;
    requestType?: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  plan: string | null;
};

type ServiceRequestMetricRow = {
  id: string;
  requested_by_user_id: string;
  request_type: string;
  status: string;
  due_date: string | null;
  created_at: string;
  completed_at: string | null;
  quoted_price_cents: number | null;
};

type ChartSegment = {
  label: string;
  value: number;
  color: string;
};

type BarDatum = {
  label: string;
  value: number;
};

const RANGE_OPTIONS = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "12m", label: "Last 12 months" },
] as const;

const SCOPE_OPTIONS = [
  { value: "all", label: "All requests" },
  { value: "mine", label: "My requests" },
] as const;

const REQUEST_TYPE_OPTIONS = [
  { value: "all", label: "All request types" },
  { value: "manufacture_part", label: "Manufacture" },
  { value: "cad_creation", label: "CAD creation" },
  { value: "optimization", label: "Optimization" },
] as const;

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-gray-900 text-white";
    case "engineer":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatCurrencyFromCents(value: number | null) {
  if (!value || value <= 0) return "—";

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatPercent(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}%`;
}

function formatDays(value: number | null) {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(1)}d`;
}

function isTerminalStatus(status: string) {
  return ["completed", "rejected", "cancelled"].includes(status);
}

function isOverdue(request: Pick<ServiceRequestMetricRow, "due_date" | "status">) {
  if (!request.due_date || isTerminalStatus(request.status)) return false;

  const due = new Date(request.due_date);
  const now = new Date();
  due.setHours(23, 59, 59, 999);

  return due.getTime() < now.getTime();
}

function isCompletedOnTime(
  request: Pick<ServiceRequestMetricRow, "due_date" | "completed_at" | "status">
) {
  if (request.status !== "completed" || !request.completed_at || !request.due_date) {
    return false;
  }

  const completed = new Date(request.completed_at);
  const due = new Date(request.due_date);
  due.setHours(23, 59, 59, 999);

  return completed.getTime() <= due.getTime();
}

function getDaysBetween(start: string, end: string) {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();

  if (Number.isNaN(startDate) || Number.isNaN(endDate) || endDate < startDate) {
    return null;
  }

  return (endDate - startDate) / (1000 * 60 * 60 * 24);
}

function getRequestTypeLabel(type: string) {
  switch (type) {
    case "manufacture_part":
      return "Manufacture";
    case "cad_creation":
      return "CAD creation";
    case "optimization":
      return "Optimization";
    default:
      return type;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "submitted":
      return "Submitted";
    case "in_review":
      return "In review";
    case "awaiting_customer":
      return "Awaiting customer";
    case "approved":
      return "Approved";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function buildConicGradient(segments: ChartSegment[]) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (total <= 0) {
    return "conic-gradient(#e5e7eb 0% 100%)";
  }

  let current = 0;
  const stops: string[] = [];

  for (const segment of segments) {
    if (segment.value <= 0) continue;
    const next = current + (segment.value / total) * 100;
    stops.push(`${segment.color} ${current}% ${next}%`);
    current = next;
  }

  if (current < 100) {
    stops.push(`#e5e7eb ${current}% 100%`);
  }

  return `conic-gradient(${stops.join(", ")})`;
}

function getRangeStart(range: string) {
  const now = new Date();

  switch (range) {
    case "30d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    case "90d":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
    case "12m":
      return new Date(now.getFullYear(), now.getMonth() - 12, 1);
    case "6m":
    default:
      return new Date(now.getFullYear(), now.getMonth() - 6, 1);
  }
}

function buildMonthlyBuckets(count: number) {
  const buckets: Array<{ key: string; label: string }> = [];
  const now = new Date();

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = date.toLocaleString("en-IE", { month: "short" });
    buckets.push({ key, label });
  }

  return buckets;
}

function buildWeeklyBuckets(weeks: number) {
  const buckets: Array<{
    key: string;
    label: string;
    start: Date;
    end: Date;
  }> = [];
  const now = new Date();

  for (let i = weeks - 1; i >= 0; i -= 1) {
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
    end.setHours(23, 59, 59, 999);

    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);

    const key = `${start.toISOString()}_${end.toISOString()}`;
    const label = start.toLocaleString("en-IE", { day: "2-digit", month: "short" });
    buckets.push({ key, label, start, end });
  }

  return buckets;
}

function getMonthKey(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-600">{helper}</p>
    </div>
  );
}

function DoughnutChartCard({
  title,
  subtitle,
  segments,
  centerValue,
  centerLabel,
}: {
  title: string;
  subtitle: string;
  segments: ChartSegment[];
  centerValue: string;
  centerLabel: string;
}) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const gradient = buildConicGradient(segments);

  return (
    <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>
      </div>

      <div className="mt-6 flex justify-center">
        <div className="relative h-56 w-56">
          <div
            className="h-56 w-56 rounded-full"
            style={{ background: gradient }}
          />
          <div className="absolute inset-[28px] flex items-center justify-center rounded-full bg-white text-center shadow-inner">
            <div>
              <div className="text-3xl font-bold text-gray-900">{centerValue}</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-gray-500">
                {centerLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        {segments.map((segment) => {
          const percent = total > 0 ? (segment.value / total) * 100 : 0;

          return (
            <div
              key={segment.label}
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <span className="truncate text-xs font-medium text-gray-900">
                  {segment.label}
                </span>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs font-semibold text-gray-900">
                  {segment.value}
                </div>
                <div className="text-[10px] text-gray-500">
                  {percent.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}

        {segments.length === 0 || total === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500">
            No data available yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BarChartCard({
  title,
  subtitle,
  data,
  valueFormatter,
  barColor = "#0f172a",
}: {
  title: string;
  subtitle: string;
  data: BarDatum[];
  valueFormatter: (value: number) => string;
  barColor?: string;
}) {
  const maxValue = Math.max(...data.map((item) => item.value), 0);

  return (
    <div className="min-w-0 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-gray-600">{subtitle}</p>
      </div>

      <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex h-72 items-end gap-3 sm:gap-4">
          {data.map((item) => {
            const height =
              maxValue > 0 ? Math.max((item.value / maxValue) * 100, 8) : 0;

            return (
              <div
                key={item.label}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-3"
              >
                <div className="text-center text-xs font-medium text-gray-500">
                  {valueFormatter(item.value)}
                </div>

                <div className="flex h-52 w-full items-end justify-center">
                  <div
                    className="w-full max-w-[56px] rounded-t-2xl"
                    style={{
                      height: `${height}%`,
                      backgroundColor: item.value > 0 ? barColor : "#d1d5db",
                    }}
                  />
                </div>

                <div className="text-xs font-medium uppercase tracking-[0.14em] text-gray-500">
                  {item.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SignalCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-gray-600">{helper}</p>
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: InsightsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const selectedRange = RANGE_OPTIONS.some(
    (option) => option.value === resolvedSearchParams.range
  )
    ? resolvedSearchParams.range!
    : "6m";

  const selectedScope = SCOPE_OPTIONS.some(
    (option) => option.value === resolvedSearchParams.scope
  )
    ? resolvedSearchParams.scope!
    : "all";

  const selectedRequestType = REQUEST_TYPE_OPTIONS.some(
    (option) => option.value === resolvedSearchParams.requestType
  )
    ? resolvedSearchParams.requestType!
    : "all";

  const { data: orgRole } = await supabase.rpc("get_current_org_role");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const typedMembership = membership as MembershipRow | null;
  const organizationId = typedMembership?.organization_id || null;

  if (!organizationId) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-gray-900">Operational Insights</h1>
        <p className="text-sm text-gray-600">
          You are not a member of any organization.
        </p>
      </div>
    );
  }

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, plan")
    .eq("id", organizationId)
    .maybeSingle();

  const typedOrganization = organization as OrganizationRow | null;

  const rangeStart = getRangeStart(selectedRange);

  let query = supabase
    .from("service_requests")
    .select(
      "id, requested_by_user_id, request_type, status, due_date, created_at, completed_at, quoted_price_cents"
    )
    .eq("organization_id", organizationId)
    .gte("created_at", rangeStart.toISOString())
    .order("created_at", { ascending: false });

  if (selectedScope === "mine") {
    query = query.eq("requested_by_user_id", user.id);
  }

  if (selectedRequestType !== "all") {
    query = query.eq("request_type", selectedRequestType);
  }

  const { data: serviceRequests } = await query;
  const requestRows = (serviceRequests as ServiceRequestMetricRow[] | null) ?? [];

  const totalRequests = requestRows.length;
  const activeQueueCount = requestRows.filter(
    (request) => !isTerminalStatus(request.status)
  ).length;
  const overdueCount = requestRows.filter(isOverdue).length;

  const completedRequests = requestRows.filter(
    (request) => request.status === "completed" && request.completed_at
  );

  const totalQuotedValueCents = requestRows.reduce(
    (sum, request) => sum + (request.quoted_price_cents ?? 0),
    0
  );

  const quotedRequests = requestRows.filter(
    (request) => (request.quoted_price_cents ?? 0) > 0
  );

  const averageQuoteCents =
    quotedRequests.length > 0
      ? totalQuotedValueCents / quotedRequests.length
      : null;

  const averageCompletionDays =
    completedRequests.length > 0
      ? completedRequests.reduce((sum, request) => {
          const days = request.completed_at
            ? getDaysBetween(request.created_at, request.completed_at)
            : null;
          return sum + (days ?? 0);
        }, 0) / completedRequests.length
      : null;

  const completionRate =
    totalRequests > 0 ? (completedRequests.length / totalRequests) * 100 : null;

  const completedWithDueDate = completedRequests.filter(
    (request) => Boolean(request.due_date)
  );

  const onTimeCompletionRate =
    completedWithDueDate.length > 0
      ? (completedWithDueDate.filter(isCompletedOnTime).length /
          completedWithDueDate.length) *
        100
      : null;

  const quoteCoverageRate =
    totalRequests > 0 ? (quotedRequests.length / totalRequests) * 100 : null;

  const statusOrder = [
    "submitted",
    "in_review",
    "awaiting_customer",
    "approved",
    "in_progress",
    "completed",
    "rejected",
    "cancelled",
  ];

  const statusColors: Record<string, string> = {
    submitted: "#0f172a",
    in_review: "#334155",
    awaiting_customer: "#60a5fa",
    approved: "#10b981",
    in_progress: "#8b5cf6",
    completed: "#22c55e",
    rejected: "#ef4444",
    cancelled: "#94a3b8",
  };

  const statusSegments: ChartSegment[] = statusOrder.map((status) => ({
    label: getStatusLabel(status),
    value: requestRows.filter((request) => request.status === status).length,
    color: statusColors[status],
  }));

  const requestTypeOrder = [
    "manufacture_part",
    "cad_creation",
    "optimization",
  ];

  const requestTypeColors: Record<string, string> = {
    manufacture_part: "#0f172a",
    cad_creation: "#f59e0b",
    optimization: "#10b981",
  };

  const requestTypeSegments: ChartSegment[] = requestTypeOrder.map((type) => ({
    label: getRequestTypeLabel(type),
    value: requestRows.filter((request) => request.request_type === type).length,
    color: requestTypeColors[type],
  }));

  let requestVolumeByPeriod: BarDatum[] = [];
  let quotedValueByPeriod: BarDatum[] = [];

  if (selectedRange === "30d") {
    const weeklyBuckets = buildWeeklyBuckets(5);

    requestVolumeByPeriod = weeklyBuckets.map((bucket) => ({
      label: bucket.label,
      value: requestRows.filter((request) => {
        const created = new Date(request.created_at).getTime();
        return created >= bucket.start.getTime() && created <= bucket.end.getTime();
      }).length,
    }));

    quotedValueByPeriod = weeklyBuckets.map((bucket) => ({
      label: bucket.label,
      value: requestRows
        .filter((request) => {
          const created = new Date(request.created_at).getTime();
          return created >= bucket.start.getTime() && created <= bucket.end.getTime();
        })
        .reduce((sum, request) => sum + (request.quoted_price_cents ?? 0), 0),
    }));
  } else {
    const monthCount = selectedRange === "90d" ? 3 : selectedRange === "12m" ? 12 : 6;
    const monthBuckets = buildMonthlyBuckets(monthCount);

    requestVolumeByPeriod = monthBuckets.map((bucket) => ({
      label: bucket.label,
      value: requestRows.filter(
        (request) => getMonthKey(request.created_at) === bucket.key
      ).length,
    }));

    quotedValueByPeriod = monthBuckets.map((bucket) => ({
      label: bucket.label,
      value: requestRows
        .filter((request) => getMonthKey(request.created_at) === bucket.key)
        .reduce((sum, request) => sum + (request.quoted_price_cents ?? 0), 0),
    }));
  }

  const fastestCompletionDays =
    completedRequests.length > 0
      ? Math.min(
          ...completedRequests
            .map((request) =>
              request.completed_at
                ? getDaysBetween(request.created_at, request.completed_at)
                : null
            )
            .filter((value): value is number => value != null)
        )
      : null;

  const slowestCompletionDays =
    completedRequests.length > 0
      ? Math.max(
          ...completedRequests
            .map((request) =>
              request.completed_at
                ? getDaysBetween(request.created_at, request.completed_at)
                : null
            )
            .filter((value): value is number => value != null)
        )
      : null;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                ← Back to dashboard
              </Link>

              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                  orgRole
                )}`}
              >
                {orgRole || "unknown"}
              </span>

              {typedOrganization?.name ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {typedOrganization.name}
                </span>
              ) : null}

              {typedOrganization?.plan ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  Plan {typedOrganization.plan}
                </span>
              ) : null}
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Operational Insights
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">
              Request activity overview
            </h1>

            <p className="mt-4 max-w-3xl text-gray-600">
              Review queue health, commercial visibility, turnaround, and request
              mix across your organization in one dedicated dashboard.
            </p>
          </div>

          <Link
            href="/dashboard/requests"
            className="inline-flex rounded-2xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
          >
            Open requests workspace
          </Link>
        </div>

        <form className="mt-8 grid gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 md:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Time range
            </label>
            <select
              name="range"
              defaultValue={selectedRange}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Scope
            </label>
            <select
              name="scope"
              defaultValue={selectedScope}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {SCOPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Request type
            </label>
            <select
              name="requestType"
              defaultValue={selectedRequestType}
              className="w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm"
            >
              {REQUEST_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex rounded-2xl bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply
            </button>

            <Link
              href="/dashboard/insights"
              className="inline-flex rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              Clear
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Total requests"
          value={totalRequests.toString()}
          helper="All tracked service requests in the filtered view."
        />
        <MetricCard
          label="Active queue"
          value={activeQueueCount.toString()}
          helper="Requests currently in progress, in review, or awaiting action."
        />
        <MetricCard
          label="Overdue"
          value={overdueCount.toString()}
          helper="Open requests with a passed due date."
        />
        <MetricCard
          label="Avg. completion time"
          value={formatDays(averageCompletionDays)}
          helper="Average turnaround for completed requests."
        />
        <MetricCard
          label="Quoted value"
          value={formatCurrencyFromCents(totalQuotedValueCents)}
          helper="Current quoted commercial value across filtered requests."
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr_1.35fr]">
        <DoughnutChartCard
          title="Status mix"
          subtitle="Distribution of requests across the current workflow lifecycle."
          segments={statusSegments}
          centerValue={totalRequests.toString()}
          centerLabel="requests"
        />

        <DoughnutChartCard
          title="Request type mix"
          subtitle="How request demand is split across manufacturing and engineering workflows."
          segments={requestTypeSegments}
          centerValue={totalRequests.toString()}
          centerLabel="requests"
        />

        <BarChartCard
          title="Request volume by period"
          subtitle="Request creation trend for the selected time range."
          data={requestVolumeByPeriod}
          valueFormatter={(value) => value.toString()}
          barColor="#0f172a"
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <BarChartCard
          title="Quoted value by period"
          subtitle="Quoted commercial value generated in the selected time range."
          data={quotedValueByPeriod}
          valueFormatter={(value) =>
            value > 0 ? formatCurrencyFromCents(value) : "—"
          }
          barColor="#2563eb"
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Delivery and commercial signals
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Key indicators for timing, commercial coverage, and workflow
              completion quality.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <SignalCard
              label="Completion rate"
              value={formatPercent(completionRate)}
              helper="Completed requests as a share of all tracked requests."
            />
            <SignalCard
              label="On-time completion"
              value={formatPercent(onTimeCompletionRate)}
              helper="Completed requests delivered on or before due date."
            />
            <SignalCard
              label="Quote coverage"
              value={formatPercent(quoteCoverageRate)}
              helper="Requests that currently carry a commercial quote."
            />
            <SignalCard
              label="Average quoted request"
              value={formatCurrencyFromCents(averageQuoteCents)}
              helper="Average quote value across quoted requests only."
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Fastest completed request
          </p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {formatDays(fastestCompletionDays)}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Best observed turnaround across completed requests.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Slowest completed request
          </p>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {formatDays(slowestCompletionDays)}
          </p>
          <p className="mt-2 text-sm text-gray-600">
            Longest observed turnaround across completed requests.
          </p>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-gray-500">
            Cost and time savings
          </p>
          <p className="mt-3 text-2xl font-bold text-gray-900">
            Ready for next phase
          </p>
          <p className="mt-2 text-sm text-gray-600">
            This page is ready to show validated savings later, once baseline
            cost and lead-time fields are added to your request model.
          </p>
        </div>
      </section>
    </div>
  );
}
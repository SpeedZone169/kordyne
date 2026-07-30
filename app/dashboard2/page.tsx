import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import Dashboard2LogoutButton from "./Dashboard2LogoutButton";
import Dashboard2SearchBox, {
  type Dashboard2SearchSuggestion,
} from "./Dashboard2SearchBox";
import { createClient } from "@/lib/supabase/server";

type IconName =
  | "dashboard"
  | "vault"
  | "projects"
  | "requests"
  | "network"
  | "calendar"
  | "insights"
  | "plug"
  | "building"
  | "account"
  | "settings"
  | "bell"
  | "mail"
  | "help"
  | "plus"
  | "search"
  | "commit"
  | "message"
  | "check"
  | "file"
  | "alert"
  | "chevron"
  | "chevron-down";

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type ServiceRequestActionRow = {
  id: string;
  title: string | null;
  requested_item_name: string | null;
  requested_item_reference: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  updated_at: string | null;
  created_at: string;
};

type ProviderPackageActionRow = {
  id: string;
  service_request_id: string;
  customer_org_id: string;
  provider_org_id: string;
  package_status: string;
  package_title: string | null;
  customer_visible_status: string | null;
  response_deadline: string | null;
  provider_responded_at: string | null;
  awarded_at: string | null;
  updated_at: string | null;
  created_at: string;
};

type ProviderMessageActionRow = {
  id: string;
  provider_request_package_id: string;
  sender_org_id: string;
  message_type: string;
  message_body: string;
  is_system: boolean;
  created_at: string;
};

type ProviderQuoteActionRow = {
  id: string;
  provider_request_package_id: string;
  status: string;
  currency_code: string | null;
  total_price: number | null;
  submitted_at: string | null;
  created_at: string;
};

type PartReviewAnnotationActionRow = {
  id: string;
  part_id: string;
  title: string;
  status: string;
  severity: string;
  category: string;
  due_date: string | null;
  updated_at: string;
  created_at: string;
};

type PartSummaryRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
};

type Dashboard2PartSearchRow = PartSummaryRow & {
  status: string | null;
  process_type: string | null;
  material: string | null;
  updated_at: string | null;
  created_at: string;
};

type Dashboard2ProjectSearchRow = {
  id: string;
  name: string;
  project_type: string;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type Dashboard2RequestSearchRow = {
  id: string;
  title: string | null;
  requested_item_name: string | null;
  requested_item_reference: string | null;
  status: string;
  request_type: string | null;
  priority: string | null;
  updated_at: string | null;
  created_at: string;
};

type Dashboard2InternalJobRow = {
  id: string;
  title: string;
  service_domain: string;
  priority: string;
  status: string;
  updated_at: string | null;
  created_at: string;
};

type Dashboard2ScheduleBlockRow = {
  id: string;
  block_type: string;
  title: string;
  starts_at: string;
  ends_at: string;
  updated_at: string | null;
  created_at: string;
};

type ActionInboxItem = {
  id: string;
  icon: IconName;
  color: string;
  title: string;
  sub: string;
  href: string;
  primaryAction: string;
  secondaryAction?: string;
  secondaryHref?: string;
  requestPriority?: string | null;
  priority: number;
  timestamp: string;
};

type ActivityFeedItem = {
  id: string;
  title: string;
  detail: string;
  status: string;
  age: string;
  href: string;
  requestPriority?: string | null;
};

type ActivityGroup = {
  key: string;
  label: string;
  description: string;
  icon: IconName;
  href: string;
  accent: string;
  items: ActivityFeedItem[];
};

type WorkspaceSignal = {
  key: string;
  title: string;
  detail: string;
  tone: "positive" | "attention";
  href: string;
};

type ServiceRequestPriority = "low" | "normal" | "high" | "urgent";

const navItems: Array<{ icon: IconName; label: string; href: string }> = [
  { icon: "dashboard", label: "Dashboard", href: "/dashboard" },
  { icon: "vault", label: "Part Vault", href: "/dashboard/parts" },
  { icon: "projects", label: "Projects", href: "/dashboard/projects" },
  { icon: "requests", label: "Service Requests", href: "/dashboard/requests" },
  { icon: "network", label: "Collaboration", href: "/dashboard/collaboration" },
  { icon: "calendar", label: "Schedule", href: "/dashboard/internal-manufacturing/schedule" },
  { icon: "insights", label: "Insights", href: "/dashboard/insights" },
  { icon: "plug", label: "Design Connectors", href: "/dashboard/design-connectors" },
  { icon: "building", label: "Organisation", href: "/dashboard/organization" },
];

const heroActions: Array<{ icon: IconName; label: string; href: string }> = [
  { icon: "plus", label: "New project", href: "/dashboard/projects" },
  { icon: "plus", label: "New request", href: "/dashboard/requests" },
];

const quickAccessItems: Array<{
  icon: IconName;
  label: string;
  description: string;
  href: string;
}> = [
  {
    icon: "vault",
    label: "Part Vault",
    description: "Families, revisions, and files.",
    href: "/dashboard/parts",
  },
  {
    icon: "projects",
    label: "Projects",
    description: "Linked parts and milestones.",
    href: "/dashboard/projects",
  },
  {
    icon: "requests",
    label: "Requests",
    description: "Supplier or internal workflows.",
    href: "/dashboard/requests",
  },
  {
    icon: "calendar",
    label: "Schedule",
    description: "Queue capacity and work.",
    href: "/dashboard/internal-manufacturing/schedule",
  },
  {
    icon: "network",
    label: "Collaboration",
    description: "Part and reviewer conversations.",
    href: "/dashboard/collaboration",
  },
  {
    icon: "insights",
    label: "Insights",
    description: "Queue health and signals.",
    href: "/dashboard/insights",
  },
  {
    icon: "plug",
    label: "Design Connectors",
    description: "CAD connectivity and readiness.",
    href: "/dashboard/design-connectors",
  },
  {
    icon: "building",
    label: "Organization",
    description: "Members, roles, and settings.",
    href: "/dashboard/organization",
  },
];

const ACTION_INBOX_LIMIT = 6;

function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.9,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
  };

  switch (name) {
    case "dashboard":
      return <svg {...common}><path d="M4 5.5h6v6H4z" /><path d="M14 5.5h6v3.75h-6z" /><path d="M14 13h6v5.5h-6z" /><path d="M4 15h6v3.5H4z" /></svg>;
    case "vault":
      return <svg {...common}><path d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5z" /><path d="m5 7.5 7 3.5 7-3.5" /><path d="M12 11v9" /></svg>;
    case "projects":
      return <svg {...common}><path d="M4 6.5h6l1.5 2H20v8.75A1.75 1.75 0 0 1 18.25 19H5.75A1.75 1.75 0 0 1 4 17.25z" /><path d="M8 13h8" /><path d="M8 16h5" /></svg>;
    case "requests":
      return <svg {...common}><path d="M7 4.5h7l3 3V19H7z" /><path d="M14 4.5v3h3" /><path d="M9.5 11h5" /><path d="M9.5 14h5" /><path d="M9.5 17h3" /></svg>;
    case "network":
      return <svg {...common}><path d="M8 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M17 20.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M17 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M10.5 7h4" /><path d="m10 9 5 6" /></svg>;
    case "calendar":
      return <svg {...common}><path d="M6.5 4v3" /><path d="M17.5 4v3" /><path d="M4.5 8h15" /><path d="M5.75 5.5h12.5A1.75 1.75 0 0 1 20 7.25v10.5a1.75 1.75 0 0 1-1.75 1.75H5.75A1.75 1.75 0 0 1 4 17.75V7.25A1.75 1.75 0 0 1 5.75 5.5Z" /></svg>;
    case "insights":
      return <svg {...common}><path d="M5 19V9" /><path d="M12 19V5" /><path d="M19 19v-7" /><path d="M3.5 19.5h17" /></svg>;
    case "plug":
      return <svg {...common}><path d="M8 4v5" /><path d="M16 4v5" /><path d="M7 9h10v3a5 5 0 0 1-10 0z" /><path d="M12 17v3" /></svg>;
    case "building":
      return <svg {...common}><path d="M5 20V6.5L13 4v16" /><path d="M13 9h6v11" /><path d="M8 9h1" /><path d="M8 12h1" /><path d="M8 15h1" /><path d="M16 12h1" /><path d="M16 15h1" /></svg>;
    case "account":
      return <svg {...common}><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4.75 20a7.25 7.25 0 0 1 14.5 0" /></svg>;
    case "settings":
      return <svg {...common}><path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" /><path d="M19 13.4v-2.8l-2.05-.44a5.7 5.7 0 0 0-.58-1.4l1.14-1.76-1.98-1.98-1.76 1.14a5.7 5.7 0 0 0-1.4-.58L11.93 3h-2.8l-.44 2.05a5.7 5.7 0 0 0-1.4.58L5.54 4.49 3.56 6.47 4.7 8.23a5.7 5.7 0 0 0-.58 1.4L2.08 10.07v2.8l2.05.44a5.7 5.7 0 0 0 .58 1.4l-1.14 1.76 1.98 1.98 1.76-1.14a5.7 5.7 0 0 0 1.4.58l.44 2.05h2.8l.44-2.05a5.7 5.7 0 0 0 1.4-.58l1.76 1.14 1.98-1.98-1.14-1.76a5.7 5.7 0 0 0 .58-1.4z" /></svg>;
    case "bell":
      return <svg {...common}><path d="M18 9.5a6 6 0 0 0-12 0c0 7-2.5 7-2.5 7h17s-2.5 0-2.5-7" /><path d="M9.75 19a2.25 2.25 0 0 0 4.5 0" /></svg>;
    case "mail":
      return <svg {...common}><path d="M4.5 6.5h15v11h-15z" /><path d="m5 7 7 6 7-6" /></svg>;
    case "help":
      return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M9.75 9.75a2.4 2.4 0 1 1 3.75 1.98c-.9.56-1.5 1.05-1.5 2.02" /><path d="M12 17h.01" /></svg>;
    case "plus":
      return <svg {...common}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
    case "search":
      return <svg {...common}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>;
    case "commit":
      return <svg {...common}><path d="M4 12h5" /><path d="M15 12h5" /><circle cx="12" cy="12" r="3" /></svg>;
    case "message":
      return <svg {...common}><path d="M5 6.5h14v9H9l-4 3z" /></svg>;
    case "check":
      return <svg {...common}><circle cx="12" cy="12" r="8" /><path d="m8.5 12.5 2.25 2.25L15.75 9" /></svg>;
    case "file":
      return <svg {...common}><path d="M7 4.5h7l3 3V19H7z" /><path d="M14 4.5v3h3" /><path d="m9.25 13 1.75 1.75L15 10.5" /></svg>;
    case "alert":
      return <svg {...common}><path d="M12 4 21 20H3z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>;
    case "chevron":
      return <svg {...common}><path d="m9 6 6 6-6 6" /></svg>;
    case "chevron-down":
      return <svg {...common}><path d="m7 9 5 5 5-5" /></svg>;
    default:
      return null;
  }
}

function formatAge(value: string | null | undefined, now: Date) {
  if (!value) return "just now";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "just now";

  const diffMs = Math.max(0, now.getTime() - timestamp);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return "just now";
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} min ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)} hr ago`;
  return `${Math.floor(diffMs / day)} d ago`;
}

function formatLabel(value: string | null | undefined) {
  return (value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeRequestPriority(
  value: string | null | undefined,
): ServiceRequestPriority {
  if (value === "low" || value === "high" || value === "urgent") {
    return value;
  }

  return "normal";
}

function getRequestPriorityLabel(value: string | null | undefined) {
  const priority = normalizeRequestPriority(value);
  return priority === "normal" ? "Medium" : formatLabel(priority);
}

function getRequestPriorityScore(value: string | null | undefined) {
  switch (normalizeRequestPriority(value)) {
    case "urgent":
      return 96;
    case "high":
      return 86;
    case "low":
      return 60;
    default:
      return 72;
  }
}

function getRequestPriorityClasses(
  value: string | null | undefined,
  surface: "light" | "dark" = "light",
) {
  const priority = normalizeRequestPriority(value);

  if (surface === "dark") {
    switch (priority) {
      case "urgent":
        return "border-red-300/25 bg-red-400/15 text-red-200";
      case "high":
        return "border-amber-300/25 bg-amber-300/15 text-amber-100";
      case "low":
        return "border-white/15 bg-white/[0.06] text-white/60";
      default:
        return "border-[#00bdde]/30 bg-[#00bdde]/12 text-[#7de8f7]";
    }
  }

  switch (priority) {
    case "urgent":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-slate-200 bg-slate-50 text-slate-600";
    default:
      return "border-[#00bdde]/25 bg-[#00bdde]/10 text-[#006f83]";
  }
}

function getTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getRequestName(request: ServiceRequestActionRow | undefined) {
  if (!request) return "request";
  return (
    request.title ||
    request.requested_item_name ||
    request.requested_item_reference ||
    `Request ${request.id.slice(0, 8)}`
  );
}

function getPartName(part: PartSummaryRow | undefined) {
  if (!part) return "part";
  return part.part_number ? `${part.name} (${part.part_number})` : part.name;
}

function truncateText(value: string, maxLength = 68) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength - 1).trim()}...`;
}

function getInitials(value: string) {
  const name = value.includes("@") ? value.split("@")[0] : value;
  const parts = name.replace(/[._-]/g, " ").split(/\s+/).filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]).join("");
  return (initials || "U").toUpperCase();
}

function formatQuoteAmount(quote: ProviderQuoteActionRow) {
  if (quote.total_price === null || quote.total_price === undefined) {
    return "Quote returned";
  }

  return `Quote returned - ${new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: quote.currency_code || "EUR",
    maximumFractionDigits: 0,
  }).format(Number(quote.total_price))}`;
}

function formatScheduleTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Schedule";

  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function buildActivityGroups({
  projects,
  jobs,
  scheduleBlocks,
  requests,
  now,
}: {
  projects: Dashboard2ProjectSearchRow[];
  jobs: Dashboard2InternalJobRow[];
  scheduleBlocks: Dashboard2ScheduleBlockRow[];
  requests: Dashboard2RequestSearchRow[];
  now: Date;
}): ActivityGroup[] {
  return [
    {
      key: "projects",
      label: "Projects",
      description: "Workspace and milestone movement",
      icon: "projects",
      href: "/dashboard/projects",
      accent: "#00bdde",
      items: projects.slice(0, 2).map((project) => ({
        id: project.id,
        title: project.name,
        detail:
          project.project_type === "single_part_workspace"
            ? "Part workspace"
            : "Project workspace",
        status: formatLabel(project.status) || "Active",
        age: formatAge(project.updated_at || project.created_at, now),
        href: `/dashboard/projects/${project.id}`,
      })),
    },
    {
      key: "manufacturing",
      label: "Manufacturing",
      description: "Internal production and routing",
      icon: "building",
      href: "/dashboard/internal-manufacturing",
      accent: "#55c9b3",
      items: jobs.slice(0, 2).map((job) => ({
        id: job.id,
        title: job.title,
        detail: `${formatLabel(job.service_domain)} - ${formatLabel(job.priority)} priority`,
        status: formatLabel(job.status) || "Draft",
        age: formatAge(job.updated_at || job.created_at, now),
        href: "/dashboard/internal-manufacturing",
      })),
    },
    {
      key: "schedule",
      label: "Schedule",
      description: "Capacity, maintenance, and holds",
      icon: "calendar",
      href: "/dashboard/internal-manufacturing/schedule",
      accent: "#7fa8bb",
      items: scheduleBlocks.slice(0, 2).map((block) => ({
        id: block.id,
        title: block.title,
        detail: `${formatLabel(block.block_type)} - ${formatScheduleTime(block.starts_at)}`,
        status: "Scheduled",
        age: formatAge(block.updated_at || block.created_at, now),
        href: "/dashboard/internal-manufacturing/schedule",
      })),
    },
    {
      key: "requests",
      label: "Requests",
      description: "Supplier and internal workflows",
      icon: "requests",
      href: "/dashboard/requests",
      accent: "#ffb547",
      items: requests.slice(0, 2).map((request) => ({
        id: request.id,
        title:
          request.title ||
          request.requested_item_name ||
          request.requested_item_reference ||
          `Request ${request.id.slice(0, 8)}`,
        detail: formatLabel(request.request_type) || "Service request",
        status: formatLabel(request.status) || "Draft",
        age: formatAge(request.updated_at || request.created_at, now),
        href: `/dashboard/requests/${request.id}`,
        requestPriority: request.priority,
      })),
    },
  ];
}

function buildActionInboxItems({
  serviceRequests,
  providerPackages,
  providerMessages,
  providerQuotes,
  annotations,
  organizationsById,
  partsById,
  now,
}: {
  serviceRequests: ServiceRequestActionRow[];
  providerPackages: ProviderPackageActionRow[];
  providerMessages: ProviderMessageActionRow[];
  providerQuotes: ProviderQuoteActionRow[];
  annotations: PartReviewAnnotationActionRow[];
  organizationsById: Map<string, string>;
  partsById: Map<string, PartSummaryRow>;
  now: Date;
}) {
  const requestById = new Map(serviceRequests.map((request) => [request.id, request]));
  const packageById = new Map(providerPackages.map((pkg) => [pkg.id, pkg]));
  const items: ActionInboxItem[] = [];
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  for (const annotation of annotations) {
    const part = partsById.get(annotation.part_id);
    const isSupplierQuestion = annotation.category === "supplier_question";
    const isCritical = annotation.severity === "critical";
    const isIssue = ["issue", "critical"].includes(annotation.severity);
    const dueTimestamp = getTimestamp(annotation.due_date);
    const isOverdue = Boolean(dueTimestamp && dueTimestamp < today.getTime());

    items.push({
      id: `annotation-${annotation.id}`,
      icon: isSupplierQuestion ? "message" : "alert",
      color: isCritical ? "#ff7a7a" : isIssue ? "#ffb547" : "#00bdde",
      title: isSupplierQuestion
        ? annotation.title
        : `${isCritical ? "Critical flag" : "DFM flag"} on ${getPartName(part)}`,
      sub: `${truncateText(annotation.title, 42)} - ${formatLabel(annotation.status)} - ${formatAge(
        annotation.updated_at || annotation.created_at,
        now,
      )}`,
      href: `/dashboard/parts/${annotation.part_id}`,
      primaryAction: "Review",
      secondaryAction: isSupplierQuestion ? "Reply" : "Assign",
      secondaryHref: `/dashboard/parts/${annotation.part_id}`,
      priority: (isCritical ? 95 : isIssue ? 82 : 62) + (isOverdue ? 12 : 0),
      timestamp: annotation.updated_at || annotation.created_at,
    });
  }

  const seenMessagePackages = new Set<string>();
  for (const message of providerMessages) {
    if (message.is_system || seenMessagePackages.has(message.provider_request_package_id)) {
      continue;
    }

    const pkg = packageById.get(message.provider_request_package_id);
    if (!pkg) continue;

    const request = requestById.get(pkg.service_request_id);
    const senderName = organizationsById.get(message.sender_org_id) || "Provider";
    const requestName = getRequestName(request);

    seenMessagePackages.add(message.provider_request_package_id);
    items.push({
      id: `provider-message-${message.id}`,
      icon: message.message_type === "issue" ? "alert" : "message",
      color: message.message_type === "issue" ? "#ffb547" : "#4ad6ee",
      title: `${senderName} asked about ${requestName}`,
      sub: `${truncateText(message.message_body)} - ${formatAge(message.created_at, now)}`,
      href: `/dashboard/collaboration?packageId=${pkg.id}`,
      primaryAction: "Reply",
      secondaryAction: "Open request",
      secondaryHref: `/dashboard/requests/${pkg.service_request_id}`,
      requestPriority: request?.priority,
      priority: Math.max(
        message.message_type === "issue" ? 88 : 76,
        getRequestPriorityScore(request?.priority),
      ),
      timestamp: message.created_at,
    });
  }

  const quotePackagesSeen = new Set<string>();
  for (const quote of providerQuotes) {
    const pkg = packageById.get(quote.provider_request_package_id);
    if (!pkg || quotePackagesSeen.has(pkg.id)) continue;

    const request = requestById.get(pkg.service_request_id);
    const providerName = organizationsById.get(pkg.provider_org_id) || "Provider";
    const quoteTimestamp = quote.submitted_at || quote.created_at;

    quotePackagesSeen.add(pkg.id);
    items.push({
      id: `provider-quote-${quote.id}`,
      icon: "file",
      color: "#00bdde",
      title: formatQuoteAmount(quote),
      sub: `${providerName} - ${getRequestName(request)} - ${formatAge(quoteTimestamp, now)}`,
      href: `/dashboard/requests/${pkg.service_request_id}/quotes`,
      primaryAction: "Compare",
      secondaryAction: "Award",
      secondaryHref: `/dashboard/requests/${pkg.service_request_id}/quotes`,
      requestPriority: request?.priority,
      priority: Math.max(78, getRequestPriorityScore(request?.priority)),
      timestamp: quoteTimestamp,
    });
  }

  for (const pkg of providerPackages) {
    const request = requestById.get(pkg.service_request_id);
    const providerName = organizationsById.get(pkg.provider_org_id) || "Provider";
    const packageTimestamp = pkg.updated_at || pkg.created_at;
    const deadlineTimestamp = getTimestamp(pkg.response_deadline);
    const isDeadlineOpen =
      pkg.response_deadline &&
      ["published", "viewed", "awaiting_provider_response"].includes(pkg.package_status);

    if (pkg.package_status === "declined") {
      items.push({
        id: `provider-declined-${pkg.id}`,
        icon: "alert",
        color: "#ffb547",
        title: `${providerName} declined to quote`,
        sub: `${getRequestName(request)} - ${formatAge(packageTimestamp, now)}`,
        href: `/dashboard/requests/${pkg.service_request_id}/quotes`,
        primaryAction: "Open quotes",
        secondaryAction: "Open request",
        secondaryHref: `/dashboard/requests/${pkg.service_request_id}`,
        requestPriority: request?.priority,
        priority: Math.max(72, getRequestPriorityScore(request?.priority)),
        timestamp: packageTimestamp,
      });
    }

    if (isDeadlineOpen && deadlineTimestamp < now.getTime()) {
      items.push({
        id: `provider-overdue-${pkg.id}`,
        icon: "alert",
        color: "#ff7a7a",
        title: `${providerName} response overdue`,
        sub: `${getRequestName(request)} - Deadline passed`,
        href: `/dashboard/requests/${pkg.service_request_id}`,
        primaryAction: "Remind",
        secondaryAction: "Open",
        secondaryHref: `/dashboard/requests/${pkg.service_request_id}`,
        requestPriority: request?.priority,
        priority: Math.max(86, getRequestPriorityScore(request?.priority)),
        timestamp: pkg.response_deadline || packageTimestamp,
      });
    } else if (isDeadlineOpen && deadlineTimestamp - now.getTime() < 48 * 60 * 60 * 1000) {
      items.push({
        id: `provider-deadline-${pkg.id}`,
        icon: "calendar",
        color: "#00bdde",
        title: "Quote deadline approaching",
        sub: `${providerName} - ${getRequestName(request)} - ${formatAge(packageTimestamp, now)}`,
        href: `/dashboard/requests/${pkg.service_request_id}`,
        primaryAction: "Open",
        secondaryAction: "Remind",
        secondaryHref: `/dashboard/requests/${pkg.service_request_id}`,
        requestPriority: request?.priority,
        priority: Math.max(58, getRequestPriorityScore(request?.priority)),
        timestamp: packageTimestamp,
      });
    }
  }

  for (const request of serviceRequests) {
    const isClosed = ["completed", "rejected", "cancelled"].includes(request.status);
    const dueTimestamp = getTimestamp(request.due_date);
    const isOverdue = Boolean(dueTimestamp && dueTimestamp < today.getTime() && !isClosed);

    if (request.status === "awaiting_customer") {
      items.push({
        id: `customer-approval-${request.id}`,
        icon: "commit",
        color: "#00bdde",
        title: `Approval needed - ${getRequestName(request)}`,
        sub: `${getRequestPriorityLabel(request.priority)} priority - ${formatAge(
          request.updated_at || request.created_at,
          now,
        )}`,
        href: `/dashboard/requests/${request.id}`,
        primaryAction: "Review",
        secondaryAction: "Open",
        secondaryHref: `/dashboard/requests/${request.id}`,
        requestPriority: request.priority,
        priority: Math.min(99, getRequestPriorityScore(request.priority) + 2),
        timestamp: request.updated_at || request.created_at,
      });
    }

    if (isOverdue) {
      items.push({
        id: `request-overdue-${request.id}`,
        icon: "alert",
        color: "#ff7a7a",
        title: `Request overdue - ${getRequestName(request)}`,
        sub: `${formatLabel(request.status)} - Due ${request.due_date}`,
        href: `/dashboard/requests/${request.id}`,
        primaryAction: "Resolve",
        secondaryAction: "Open",
        secondaryHref: `/dashboard/requests/${request.id}`,
        requestPriority: request.priority,
        priority: Math.min(99, getRequestPriorityScore(request.priority) + 6),
        timestamp: request.updated_at || request.created_at,
      });
    }
  }

  return items
    .sort((left, right) => {
      if (right.priority !== left.priority) return right.priority - left.priority;
      return getTimestamp(right.timestamp) - getTimestamp(left.timestamp);
    })
    .slice(0, ACTION_INBOX_LIMIT);
}

function SidebarNav() {
  return (
    <aside className="group/sidebar fixed left-0 top-0 z-[100] flex h-full w-20 flex-col overflow-hidden border-r border-white/10 bg-[#001220] shadow-[8px_0_30px_rgba(0,18,32,0.28)] transition-all duration-300 ease-in-out hover:w-56 hover:shadow-[12px_0_42px_rgba(0,18,32,0.36)]">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,18,32,0.99),rgba(0,24,39,0.97)_42%,rgba(0,18,32,0.99))]" />

      <Link
        href="/dashboard"
        className="relative mx-4 mt-5 flex h-14 items-center overflow-hidden rounded-xl text-white transition-all duration-300 group-hover/sidebar:mx-5"
        aria-label="Kordyne dashboard"
      >
        <span className="block h-12 w-[39px] shrink-0 overflow-hidden transition-all duration-300 group-hover/sidebar:w-0 group-hover/sidebar:opacity-0">
          <Image
            src="/kordyne-logo-white.svg"
            alt=""
            width={188}
            height={48}
            className="h-12 w-[188px] max-w-none object-left"
            priority
          />
        </span>
        <span className="absolute left-0 flex h-12 w-[188px] items-center opacity-0 transition-all duration-300 group-hover/sidebar:opacity-100">
          <Image
            src="/kordyne-logo-white.svg"
            alt="Kordyne"
            width={188}
            height={48}
            className="h-10 w-auto"
            priority
          />
        </span>
      </Link>

      <nav className="relative flex flex-1 flex-col gap-1 overflow-hidden px-2.5 py-5">
        {navItems.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={`group flex h-14 w-full items-center justify-center gap-0 rounded-xl px-0 transition-all duration-150 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3 ${
              index === 0
                ? "bg-[#00bdde]/16 text-white"
                : "text-white/70 hover:bg-[#00bdde]/10 hover:text-[#00bdde]"
            }`}
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
                index === 0
                  ? "bg-[#00bdde] text-[#001827]"
                  : "bg-white/[0.06] text-white ring-1 ring-white/10 group-hover:bg-[#00bdde] group-hover:text-[#001827] group-hover:ring-[#00bdde]"
              }`}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px]" />
            </span>
            <span className="w-0 overflow-hidden whitespace-nowrap text-[13px] opacity-0 transition-all duration-300 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100">
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function TopUtilityBar({
  userName,
  userEmail,
  openActions,
  searchSuggestions,
}: {
  userName: string;
  userEmail: string;
  openActions: number;
  searchSuggestions: Dashboard2SearchSuggestion[];
}) {
  const initials = getInitials(userName || userEmail);

  return (
    <header className="relative z-10 text-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Dashboard2SearchBox suggestions={searchSuggestions} />

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <Link
            href="/dashboard/account"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-3 text-[12px] font-semibold text-white/82 backdrop-blur transition hover:border-[#00bdde]/50 hover:bg-[#00bdde]/14 hover:text-white"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00bdde] text-[11px] font-bold text-[#001220]">
              {initials}
            </span>
            <span className="hidden lg:inline">Profile</span>
            {openActions > 0 ? (
              <span className="ml-0.5 rounded-full bg-[#00bdde] px-1.5 py-0.5 text-[9px] font-bold leading-none text-[#001220]">
                {openActions > 9 ? "9+" : openActions}
              </span>
            ) : null}
          </Link>
          <Link
            href="/dashboard/organization"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/12 bg-white/[0.08] px-3 text-[12px] font-semibold text-white/82 backdrop-blur transition hover:border-[#00bdde]/50 hover:bg-[#00bdde]/14 hover:text-white"
          >
            <Icon name="settings" className="h-4 w-4" />
            <span className="hidden lg:inline">Settings</span>
          </Link>
          <Dashboard2LogoutButton />
        </div>
      </div>
    </header>
  );
}

function ActionInbox({ items }: { items: ActionInboxItem[] }) {
  return (
    <div id="action-inbox" className="w-full rounded-xl bg-white/[0.04] p-5 ring-1 ring-white/10 lg:w-[460px]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.12em] text-[#00bdde]">
            Needs you
          </div>
          <div className="font-display mt-1 text-[18px] tracking-tight text-white">
            Action inbox
          </div>
        </div>
        <span className="rounded-full bg-[#00bdde]/15 px-2.5 py-0.5 text-[11px] text-[#00bdde]">
          {items.length > 0 ? `${items.length} open` : "clear"}
        </span>
      </div>

      <div className="dashboard2-inbox-scroll mt-4 max-h-[220px] space-y-1.5 overflow-y-auto px-2 py-1 [scrollbar-gutter:stable]">
        {items.length === 0 ? (
          <div className="rounded-[6px] border border-white/10 bg-white/[0.03] px-3 py-4 text-[12px] leading-relaxed text-white/60">
            No open approvals, provider questions, DFM flags, quote decisions, or blocking items right now.
          </div>
        ) : null}

        {items.map((item) => (
          <div
            key={item.id}
            className="group flex items-center gap-3 py-1"
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-[#00bdde]/20 bg-[#06384a]"
              style={{ color: item.color }}
            >
              <Icon name={item.icon} className="h-3.5 w-3.5" />
            </div>
            <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[4px] px-2.5 py-2 transition group-hover:bg-white/5">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                    {item.title}
                  </div>
                  {item.requestPriority ? (
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getRequestPriorityClasses(
                        item.requestPriority,
                        "dark",
                      )}`}
                    >
                      {getRequestPriorityLabel(item.requestPriority)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-white/55">{item.sub}</div>
              </div>
              <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                {item.secondaryAction ? (
                  <Link
                    href={item.secondaryHref || item.href}
                    className="rounded-full border border-white/20 px-2.5 py-1 text-[11px] text-white/80 transition hover:bg-white/10"
                  >
                    {item.secondaryAction}
                  </Link>
                ) : null}
                <Link
                  href={item.href}
                  className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#003040] transition hover:bg-white/90"
                >
                  {item.primaryAction}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickAccess() {
  return (
    <div className="relative mt-5">
      <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8eb8c7]">
        Quick access
      </div>
      <div className="grid gap-px overflow-hidden rounded-lg bg-white/10 p-px sm:grid-cols-2 lg:grid-cols-4">
        {quickAccessItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="group flex min-h-[76px] items-start gap-2.5 bg-[#001827]/70 px-3 py-3 backdrop-blur-sm transition duration-200 hover:bg-[#00bdde]/12 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#00bdde]"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#00bdde]/20 bg-[#00bdde]/10 text-[#8fd9e7] transition group-hover:border-[#00bdde]/55 group-hover:bg-[#00bdde] group-hover:text-[#003040]">
              <Icon name={item.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-[12px] font-semibold text-white">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[10.5px] leading-[1.3] text-white/55 transition group-hover:text-white/72">
                {item.description}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CommandHero({
  organizationName,
  userName,
  userEmail,
  inboxItems,
  searchSuggestions,
}: {
  organizationName: string;
  userName: string;
  userEmail: string;
  inboxItems: ActionInboxItem[];
  searchSuggestions: Dashboard2SearchSuggestion[];
}) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#001827] px-10 pb-6 pt-5 text-white shadow-[0_28px_80px_-44px_rgba(0,48,64,0.75)]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(0,18,32,0.18) 0%, rgba(0,18,32,0.86) 100%), linear-gradient(90deg, rgba(0,18,32,0.94) 0%, rgba(0,25,42,0.78) 44%, rgba(0,25,42,0.32) 100%), url('/dashboard2-command-bg.png')",
          backgroundPosition: "35% bottom",
          backgroundSize: "cover",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#00bdde]/70" />

      <TopUtilityBar
        userName={userName}
        userEmail={userEmail}
        openActions={inboxItems.length}
        searchSuggestions={searchSuggestions}
      />

      <div className="relative mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="max-w-xl">
            <h1 className="font-display text-[36px] leading-[1.05] tracking-tight">
              {organizationName} command center
            </h1>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">
              Every part, every partner, every stage of the route - one place to start, route, and ship work.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {heroActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/80 transition hover:border-transparent hover:bg-[#00bdde] hover:text-[#003040]"
                >
                  <Icon name={action.icon} className="h-3.5 w-3.5" />
                  {action.label}
                </Link>
              ))}
            </div>
          </div>

          <QuickAccess />
        </div>

        <ActionInbox items={inboxItems} />
      </div>
    </section>
  );
}

function LatestActivity({ groups }: { groups: ActivityGroup[] }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-[#003040]/8 bg-white">
      <div className="flex flex-col gap-2 px-7 py-6 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-[#003040]/45">
            Live operations
          </div>
          <h2 className="font-display mt-2 text-[24px] tracking-tight text-[#003040]">
            Latest movement across your operation.
          </h2>
          <p className="mt-1 text-[12px] text-[#003040]/50">
            Recent project, production, schedule, and request activity.
          </p>
        </div>
        <span className="hidden text-[11px] uppercase tracking-[0.14em] text-[#003040]/35 sm:block">
          Live workspace activity
        </span>
      </div>

      <div className="grid border-t border-[#003040]/8 sm:grid-cols-2 xl:grid-cols-4">
        {groups.map((group, groupIndex) => (
          <div
            key={group.key}
            className={`min-w-0 px-5 py-5 ${
              groupIndex % 2 === 1 ? "sm:border-l sm:border-[#003040]/8" : ""
            } ${groupIndex > 0 ? "border-t border-[#003040]/8 sm:border-t-0" : ""} ${
              groupIndex > 1 ? "sm:border-t sm:border-[#003040]/8 xl:border-t-0" : ""
            } ${groupIndex > 0 ? "xl:border-l xl:border-[#003040]/8" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: `${group.accent}18`,
                    color: group.accent,
                  }}
                >
                  <Icon name={group.icon} className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[13px] font-semibold text-[#003040]">
                    {group.label}
                  </h3>
                  <p className="truncate text-[10.5px] text-[#003040]/45">
                    {group.description}
                  </p>
                </div>
              </div>
              <Link
                href={group.href}
                aria-label={`Open ${group.label}`}
                className="mt-1 text-[#003040]/35 transition hover:text-[#00a6c4]"
              >
                <Icon name="chevron" className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4">
              {group.items.length > 0 ? (
                group.items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="group block border-t border-[#003040]/8 py-3 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        title={item.title}
                        className="min-w-0 truncate text-[12.5px] font-medium text-[#003040] transition group-hover:text-[#007f98]"
                      >
                        {item.title}
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.requestPriority ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${getRequestPriorityClasses(
                              item.requestPriority,
                            )}`}
                          >
                            {getRequestPriorityLabel(item.requestPriority)}
                          </span>
                        ) : null}
                        <span className="rounded-full bg-[#003040]/5 px-2 py-0.5 text-[9.5px] font-medium text-[#003040]/65">
                          {item.status}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3 text-[10.5px] text-[#003040]/45">
                      <span className="min-w-0 truncate">{item.detail}</span>
                      <span className="shrink-0">{item.age}</span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="border-t border-[#003040]/8 pt-3 text-[11px] text-[#003040]/40">
                  No recent {group.label.toLowerCase()} activity.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkspaceSignals({ signals }: { signals: WorkspaceSignal[] }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#111b27] px-6 py-6 text-white shadow-[0_20px_50px_-36px_rgba(0,48,64,0.85)]">
      <div className="flex items-center justify-between gap-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-white/45">
            Workspace health
          </div>
          <h2 className="mt-1 text-[15px] font-semibold text-white/90">
            Workspace signals
          </h2>
        </div>
        <Link
          href="/dashboard/insights"
          className="inline-flex items-center gap-1 text-[12px] text-white/45 transition hover:text-[#00bdde]"
        >
          View insights
          <span aria-hidden="true">&nearr;</span>
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {signals.map((signal) => {
          const isPositive = signal.tone === "positive";

          return (
            <Link
              key={signal.key}
              href={signal.href}
              className="group flex min-h-[92px] gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-4 transition hover:border-[#00bdde]/35 hover:bg-[#00bdde]/[0.07]"
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                  isPositive
                    ? "border-[#00bdde] text-[#00bdde]"
                    : "border-[#f4b827] text-[#f4b827]"
                }`}
              >
                <Icon
                  name={isPositive ? "check" : "alert"}
                  className="h-3 w-3"
                />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[12.5px] font-semibold text-white/78">
                  {signal.title}
                </h3>
                <p className="mt-1 text-[11.5px] leading-[1.45] text-white/40">
                  {signal.detail}
                </p>
              </div>
              <Icon
                name="chevron"
                className="mt-1 h-4 w-4 shrink-0 text-white/20 transition group-hover:translate-x-0.5 group-hover:text-[#00bdde]"
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default async function Dashboard2Page() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const typedMembership = membership as MembershipRow | null;
  const organizationId = typedMembership?.organization_id || null;

  const { data: organization } = organizationId
    ? await supabase
        .from("organizations")
        .select("id, name")
        .eq("id", organizationId)
        .maybeSingle()
    : { data: null };

  const typedOrganization = organization as OrganizationRow | null;
  const organizationName = typedOrganization?.name || "Company";
  const userEmail = user.email || "User";
  const userMetadata = user.user_metadata as Record<string, unknown>;
  const metadataDisplayName =
    typeof userMetadata.full_name === "string" && userMetadata.full_name.trim()
      ? userMetadata.full_name.trim()
      : typeof userMetadata.name === "string" && userMetadata.name.trim()
        ? userMetadata.name.trim()
        : "";
  const userName =
    metadataDisplayName || (userEmail.includes("@") ? userEmail.split("@")[0] : userEmail);
  const now = new Date();

  const { data: searchPartsRaw } = organizationId
    ? await supabase
        .from("parts")
        .select(
          "id, name, part_number, revision, status, process_type, material, updated_at, created_at",
        )
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(30)
    : { data: [] as Dashboard2PartSearchRow[] };

  const { data: searchProjectsRaw } = organizationId
    ? await supabase
        .from("projects")
        .select("id, name, project_type, status, updated_at, created_at")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] as Dashboard2ProjectSearchRow[] };

  const { data: searchRequestsRaw } = organizationId
    ? await supabase
        .from("service_requests")
        .select(
          "id, title, requested_item_name, requested_item_reference, status, request_type, priority, updated_at, created_at",
        )
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(25)
    : { data: [] as Dashboard2RequestSearchRow[] };

  const { data: internalJobsRaw } = organizationId
    ? await supabase
        .from("internal_jobs")
        .select("id, title, service_domain, priority, status, updated_at, created_at")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(4)
    : { data: [] as Dashboard2InternalJobRow[] };

  const { data: scheduleBlocksRaw } = organizationId
    ? await supabase
        .from("internal_schedule_blocks")
        .select("id, block_type, title, starts_at, ends_at, updated_at, created_at")
        .eq("organization_id", organizationId)
        .order("updated_at", { ascending: false })
        .limit(4)
    : { data: [] as Dashboard2ScheduleBlockRow[] };

  let partFamilyCount = 0;
  let revisionCount = 0;
  let requestCount = 0;
  let multiPartProjectCount = 0;
  let internalJobCount = 0;
  let scheduleBlockCount = 0;

  if (organizationId) {
    const [
      partFamiliesResult,
      revisionsResult,
      requestsResult,
      projectsResult,
      jobsResult,
      scheduleResult,
    ] = await Promise.all([
      supabase
        .from("part_families")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("parts")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("service_requests")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("projects")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("project_type", "multi_part_project"),
      supabase
        .from("internal_jobs")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("internal_schedule_blocks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ]);

    partFamilyCount = partFamiliesResult.count ?? 0;
    revisionCount = revisionsResult.count ?? 0;
    requestCount = requestsResult.count ?? 0;
    multiPartProjectCount = projectsResult.count ?? 0;
    internalJobCount = jobsResult.count ?? 0;
    scheduleBlockCount = scheduleResult.count ?? 0;
  }

  const searchSuggestions: Dashboard2SearchSuggestion[] = [
    ...(((searchPartsRaw ?? []) as Dashboard2PartSearchRow[]).map((part) => ({
      id: part.id,
      type: "part" as const,
      label: part.part_number ? `${part.name} (${part.part_number})` : part.name,
      subtitle:
        [
          part.revision ? `Rev ${part.revision}` : null,
          part.process_type,
          part.material,
          formatLabel(part.status),
        ]
          .filter(Boolean)
          .join(" - ") || "Part Vault",
      href: `/dashboard/parts/${part.id}`,
      updatedAt: part.updated_at || part.created_at,
    }))),
    ...(((searchProjectsRaw ?? []) as Dashboard2ProjectSearchRow[]).map((project) => ({
      id: project.id,
      type: "project" as const,
      label: project.name,
      subtitle:
        [
          project.project_type === "single_part_workspace"
            ? "Part Workspace"
            : "Project",
          formatLabel(project.status),
        ]
          .filter(Boolean)
          .join(" - ") || "Project workspace",
      href: `/dashboard/projects/${project.id}`,
      updatedAt: project.updated_at || project.created_at,
    }))),
    ...(((searchRequestsRaw ?? []) as Dashboard2RequestSearchRow[]).map((request) => {
      const label =
        request.title ||
        request.requested_item_name ||
        request.requested_item_reference ||
        `Request ${request.id.slice(0, 8)}`;

      return {
        id: request.id,
        type: "request" as const,
        label,
        subtitle:
          [
            formatLabel(request.request_type),
            `${getRequestPriorityLabel(request.priority)} priority`,
            formatLabel(request.status),
          ]
            .filter(Boolean)
            .join(" - ") || "Service request",
        href: `/dashboard/requests/${request.id}`,
        updatedAt: request.updated_at || request.created_at,
      };
    })),
  ]
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    )
    .slice(0, 75);

  const { data: serviceRequestsRaw } = organizationId
    ? await supabase
        .from("service_requests")
        .select(
          "id, title, requested_item_name, requested_item_reference, status, priority, due_date, updated_at, created_at",
        )
        .eq("organization_id", organizationId)
        .in("status", ["submitted", "in_review", "awaiting_customer", "approved", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(40)
    : { data: [] as ServiceRequestActionRow[] };

  const serviceRequests =
    (serviceRequestsRaw as ServiceRequestActionRow[] | null) ?? [];

  const { data: annotationsRaw } = organizationId
    ? await supabase
        .from("part_review_annotations")
        .select("id, part_id, title, status, severity, category, due_date, updated_at, created_at")
        .eq("organization_id", organizationId)
        .in("status", ["open", "in_review", "reopened"])
        .order("updated_at", { ascending: false })
        .limit(20)
    : { data: [] as PartReviewAnnotationActionRow[] };

  const annotations =
    (annotationsRaw as PartReviewAnnotationActionRow[] | null) ?? [];

  const { data: providerPackagesRaw } = organizationId
    ? await supabase
        .from("provider_request_packages")
        .select(
          "id, service_request_id, customer_org_id, provider_org_id, package_status, package_title, customer_visible_status, response_deadline, provider_responded_at, awarded_at, updated_at, created_at",
        )
        .or(`customer_org_id.eq.${organizationId},provider_org_id.eq.${organizationId}`)
        .in("package_status", [
          "published",
          "viewed",
          "awaiting_provider_response",
          "declined",
          "quote_submitted",
          "quote_revised",
          "issue_raised",
          "on_hold",
        ])
        .order("updated_at", { ascending: false })
        .limit(40)
    : { data: [] as ProviderPackageActionRow[] };

  const providerPackages =
    (providerPackagesRaw as ProviderPackageActionRow[] | null) ?? [];
  const packageIds = providerPackages.map((pkg) => pkg.id);

  const { data: providerMessagesRaw } =
    packageIds.length > 0 && organizationId
      ? await supabase
          .from("provider_messages")
          .select(
            "id, provider_request_package_id, sender_org_id, message_type, message_body, is_system, created_at",
          )
          .in("provider_request_package_id", packageIds)
          .in("message_type", ["question", "clarification", "issue"])
          .eq("is_system", false)
          .neq("sender_org_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(30)
      : { data: [] as ProviderMessageActionRow[] };

  const providerMessages =
    (providerMessagesRaw as ProviderMessageActionRow[] | null) ?? [];

  const { data: providerQuotesRaw } =
    packageIds.length > 0
      ? await supabase
          .from("provider_quotes")
          .select(
            "id, provider_request_package_id, status, currency_code, total_price, submitted_at, created_at",
          )
          .in("provider_request_package_id", packageIds)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false, nullsFirst: false })
          .limit(30)
      : { data: [] as ProviderQuoteActionRow[] };

  const providerQuotes =
    (providerQuotesRaw as ProviderQuoteActionRow[] | null) ?? [];

  const partIds = [...new Set(annotations.map((annotation) => annotation.part_id))];
  const { data: partsRaw } =
    partIds.length > 0
      ? await supabase
          .from("parts")
          .select("id, name, part_number, revision")
          .in("id", partIds)
      : { data: [] as PartSummaryRow[] };

  const partsById = new Map(
    ((partsRaw ?? []) as PartSummaryRow[]).map((part) => [part.id, part]),
  );

  const actionOrgIds = [
    ...new Set(
      providerPackages.flatMap((pkg) => [
        pkg.customer_org_id,
        pkg.provider_org_id,
      ]),
    ),
  ];
  const { data: actionOrganizationsRaw } =
    actionOrgIds.length > 0
      ? await supabase.from("organizations").select("id, name").in("id", actionOrgIds)
      : { data: [] as OrganizationRow[] };

  const organizationsById = new Map(
    ((actionOrganizationsRaw ?? []) as OrganizationRow[]).map((org) => [
      org.id,
      org.name,
    ]),
  );

  const actionInboxItems = organizationId
    ? buildActionInboxItems({
        serviceRequests,
        providerPackages,
        providerMessages,
        providerQuotes,
        annotations,
        organizationsById,
        partsById,
        now,
      })
    : [];

  const activityGroups = buildActivityGroups({
    projects: (searchProjectsRaw ?? []) as Dashboard2ProjectSearchRow[],
    jobs: (internalJobsRaw ?? []) as Dashboard2InternalJobRow[],
    scheduleBlocks: (scheduleBlocksRaw ?? []) as Dashboard2ScheduleBlockRow[],
    requests: (searchRequestsRaw ?? []) as Dashboard2RequestSearchRow[],
    now,
  });

  const workspaceSignals: WorkspaceSignal[] = [
    {
      key: "vault",
      title:
        partFamilyCount > 0
          ? "Vault is holding the source of truth"
          : "Vault is ready for controlled part records",
      detail: `${partFamilyCount} ${partFamilyCount === 1 ? "family" : "families"} and ${revisionCount} ${revisionCount === 1 ? "revision" : "revisions"} available for review.`,
      tone: partFamilyCount > 0 ? "positive" : "attention",
      href: "/dashboard/parts",
    },
    {
      key: "requests",
      title:
        requestCount > 0
          ? "Request routing is ready"
          : "Request routing is waiting for its first package",
      detail: `${requestCount} manufacturing ${requestCount === 1 ? "request is" : "requests are"} tracked in this workspace.`,
      tone: requestCount > 0 ? "positive" : "attention",
      href: "/dashboard/requests",
    },
    {
      key: "projects",
      title: "Project spaces stay intentional",
      detail: `${multiPartProjectCount} formal multi-part ${multiPartProjectCount === 1 ? "project" : "projects"} outside the standalone Vault flow.`,
      tone: "positive",
      href: "/dashboard/projects",
    },
    {
      key: "production",
      title:
        scheduleBlockCount > 0
          ? "Production planning is visible"
          : "Schedule capacity needs its first plan",
      detail: `${internalJobCount} internal ${internalJobCount === 1 ? "job" : "jobs"} and ${scheduleBlockCount} schedule ${scheduleBlockCount === 1 ? "block" : "blocks"} are tracked.`,
      tone: scheduleBlockCount > 0 || internalJobCount === 0 ? "positive" : "attention",
      href: "/dashboard/internal-manufacturing/schedule",
    },
  ];

  return (
    <div className="flex min-h-screen w-full bg-[#fafbfc] text-[#003040]">
      <style>{`
        .dashboard2-inbox-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 189, 222, 0.35) rgba(0, 48, 64, 0.4);
        }
        .dashboard2-inbox-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .dashboard2-inbox-scroll::-webkit-scrollbar-track {
          background: rgba(0, 48, 64, 0.5);
          border-radius: 999px;
          margin: 6px 0;
        }
        .dashboard2-inbox-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(0, 189, 222, 0.55), rgba(0, 189, 222, 0.25));
          border: 1px solid rgba(0, 48, 64, 0.4);
          border-radius: 999px;
        }
      `}</style>
      <SidebarNav />
      <main className="ml-20 flex-1 space-y-6 px-8 pb-8 pt-5">
        <CommandHero
          organizationName={organizationName}
          userName={userName}
          userEmail={userEmail}
          inboxItems={actionInboxItems}
          searchSuggestions={searchSuggestions}
        />
        <LatestActivity groups={activityGroups} />
        <WorkspaceSignals signals={workspaceSignals} />
      </main>
    </div>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import ShellIcon from "@/components/ShellIcon";
import { createClient } from "@/lib/supabase/server";

type PartRow = {
  id: string;
  part_family_id: string | null;
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

type IconName = Parameters<typeof ShellIcon>[0]["name"];

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "border-[#00bdde]/40 bg-[#00bdde]/14 text-[#9ff0ff]";
    case "engineer":
      return "border-sky-300/30 bg-sky-300/12 text-sky-100";
    case "viewer":
      return "border-slate-300/25 bg-white/8 text-slate-100";
    default:
      return "border-slate-300/25 bg-white/8 text-slate-100";
  }
}

function getRoleDescription(role: string | null) {
  switch (role) {
    case "admin":
      return "You can manage the workspace, invite teams, publish parts, approve revisions, and route work into manufacturing.";
    case "engineer":
      return "You can publish designs, update revisions, prepare request packages, and collaborate around controlled part records.";
    case "viewer":
      return "You can review vault records, projects, and manufacturing request progress without changing controlled data.";
    default:
      return "Your workspace access is being determined.";
  }
}

function CountTile({
  label,
  value,
  helper,
  tone = "aqua",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "aqua" | "teal" | "green" | "amber";
}) {
  const toneClass = {
    aqua: "bg-[#00bdde]",
    teal: "bg-[#003040]",
    green: "bg-emerald-500",
    amber: "bg-amber-500",
  }[tone];

  return (
    <div className="rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`h-1 w-10 rounded-full ${toneClass}`} />
      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

function CommandAction({
  title,
  description,
  href,
  icon,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex min-h-[116px] items-start gap-4 rounded-[12px] border p-4 transition ${
        primary
          ? "border-[#00bdde]/40 bg-[#00bdde]/14 text-white hover:bg-[#00bdde]/20"
          : "border-white/10 bg-white/[0.055] text-white hover:border-[#00bdde]/35 hover:bg-white/[0.085]"
      }`}
    >
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${
          primary ? "bg-[#00bdde] text-[#003040]" : "bg-white/8 text-[#7deaff]"
        }`}
      >
        <ShellIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-slate-300">
          {description}
        </span>
      </span>
    </Link>
  );
}

function ActionInbox({
  serviceRequestCount,
  projectCount,
  resourceCount,
  revisionCount,
}: {
  serviceRequestCount: number;
  projectCount: number;
  resourceCount: number;
  revisionCount: number;
}) {
  const actions = [
    {
      href: "/dashboard/requests",
      icon: "requests" as IconName,
      title: `${serviceRequestCount} request${serviceRequestCount === 1 ? "" : "s"}`,
      detail: "Review packages, quote movement, and returned manufacturing files.",
    },
    {
      href: "/dashboard/projects",
      icon: "projects" as IconName,
      title: `${projectCount} project space${projectCount === 1 ? "" : "s"}`,
      detail: "Open workspaces where parts, milestones, and discussion stay together.",
    },
    {
      href: "/dashboard/internal-manufacturing/schedule",
      icon: "calendar" as IconName,
      title: `${resourceCount} internal resource${resourceCount === 1 ? "" : "s"}`,
      detail: "Check schedule, machines, and internal production readiness.",
    },
    {
      href: "/dashboard/parts",
      icon: "vault" as IconName,
      title: `${revisionCount} controlled revision${revisionCount === 1 ? "" : "s"}`,
      detail: "Keep CAD, preview files, notes, and revision evidence tied to the part.",
    },
  ];

  return (
    <div className="rounded-[14px] border border-white/10 bg-white/[0.055] p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#7deaff]">
            Needs attention
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
            Action inbox
          </h2>
        </div>
        <Link
          href="/dashboard/collaboration"
          className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-[#00bdde]/50 hover:text-white"
        >
          Open thread
        </Link>
      </div>

      <div className="mt-4 divide-y divide-white/10">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group flex gap-3 py-3 transition first:pt-0 last:pb-0"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-[#00bdde]/12 text-[#7deaff] group-hover:bg-[#00bdde] group-hover:text-[#003040]">
              <ShellIcon name={action.icon} className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">
                {action.title}
              </span>
              <span className="mt-1 block text-xs leading-5 text-slate-400">
                {action.detail}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function PipelineStage({
  label,
  count,
  helper,
  href,
  icon,
  active = false,
}: {
  label: string;
  count: number;
  helper: string;
  href: string;
  icon: IconName;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group rounded-[12px] border p-4 transition ${
        active
          ? "border-[#003040] bg-[#003040] text-white shadow-sm"
          : "border-slate-200 bg-white text-slate-950 hover:border-[#00bdde]/55 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-[10px] ${
            active
              ? "bg-[#00bdde]/18 text-[#7deaff]"
              : "bg-[#00bdde]/10 text-[#003040] group-hover:bg-[#00bdde] group-hover:text-[#003040]"
          }`}
        >
          <ShellIcon name={icon} className="h-4 w-4" />
        </span>
        <span
          className={`text-2xl font-semibold leading-none ${
            active ? "text-white" : "text-slate-950"
          }`}
        >
          {count}
        </span>
      </div>
      <h3 className="mt-4 text-sm font-semibold">{label}</h3>
      <p
        className={`mt-2 text-xs leading-5 ${
          active ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {helper}
      </p>
    </Link>
  );
}

function ModuleCard({
  title,
  description,
  href,
  icon,
  count,
}: {
  title: string;
  description: string;
  href: string;
  icon: IconName;
  count?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex h-full items-start gap-4 rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#00bdde]/55 hover:shadow-md"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#00bdde]/10 text-[#003040] transition group-hover:bg-[#00bdde]">
        <ShellIcon name={icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-950">{title}</span>
          {count ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {count}
            </span>
          ) : null}
        </span>
        <span className="mt-2 block text-sm leading-6 text-slate-600">
          {description}
        </span>
      </span>
    </Link>
  );
}

function ActivityFeed({
  familyCount,
  revisionCount,
  serviceRequestCount,
  projectCount,
}: {
  familyCount: number;
  revisionCount: number;
  serviceRequestCount: number;
  projectCount: number;
}) {
  const events = [
    {
      icon: "vault" as IconName,
      title: "Vault is holding the source of truth",
      detail: `${familyCount} families and ${revisionCount} revisions are available for controlled review.`,
      tone: "bg-[#00bdde]",
    },
    {
      icon: "requests" as IconName,
      title: "Request routing is ready",
      detail: `${serviceRequestCount} manufacturing or engineering request${serviceRequestCount === 1 ? "" : "s"} in the workspace.`,
      tone: "bg-emerald-500",
    },
    {
      icon: "projects" as IconName,
      title: "Project spaces stay intentional",
      detail: `${projectCount} multi-part project${projectCount === 1 ? "" : "s"} visible outside the standalone vault flow.`,
      tone: "bg-amber-500",
    },
  ];

  return (
    <section className="rounded-[14px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Activity
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            Latest workspace signals
          </h2>
        </div>
        <Link
          href="/dashboard/insights"
          className="text-xs font-semibold text-[#006f83] hover:text-[#003040]"
        >
          View insights
        </Link>
      </div>

      <div className="relative mt-6 space-y-5">
        <div className="absolute bottom-3 left-[15px] top-3 w-px bg-slate-200" />
        {events.map((event) => (
          <div key={event.title} className="relative flex gap-4">
            <span className="z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white ring-4 ring-white">
              <span className={`h-2.5 w-2.5 rounded-full ${event.tone}`} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block text-sm font-semibold text-slate-950">
                {event.title}
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                {event.detail}
              </span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");
  const normalizedRole = typeof orgRole === "string" ? orgRole : null;

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
        .select("id, name, plan")
        .eq("id", organizationId)
        .maybeSingle()
    : { data: null };

  const typedOrganization = organization as OrganizationRow | null;

  const { data: parts } = organizationId
    ? await supabase
        .from("parts")
        .select("id, part_family_id")
        .eq("organization_id", organizationId)
    : { data: [] as PartRow[] };

  const { count: memberCount } = organizationId
    ? await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : { count: 0 };

  const { count: serviceRequestCount } = organizationId
    ? await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : { count: 0 };

  const { count: projectCount } = organizationId
    ? await supabase
        .from("projects")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("project_type", "multi_part_project")
        .neq("status", "archived")
    : { count: 0 };

  const { count: resourceCount } = organizationId
    ? await supabase
        .from("internal_resources")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : { count: 0 };

  const partRows = (parts as PartRow[] | null) ?? [];
  const familyCount = new Set(
    partRows.map((part) => part.part_family_id).filter(Boolean),
  ).size;
  const revisionCount = partRows.length;
  const requests = serviceRequestCount ?? 0;
  const projects = projectCount ?? 0;
  const resources = resourceCount ?? 0;
  const members = memberCount ?? 0;
  const organizationName = typedOrganization?.name || "Kordyne";
  const planLabel = typedOrganization?.plan ? `Plan ${typedOrganization.plan}` : "Workspace";

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[18px] bg-[#003040] text-white shadow-sm">
        <div className="relative grid gap-7 p-6 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:p-8">
          <div className="absolute inset-0 kordyne-grid-bg opacity-35" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-[#00bdde]" />

          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#00bdde]">
              {organizationName} command center
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
              Good morning. Your vault, projects, and manufacturing route are in one place.
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-200 lg:text-base">
              Move from controlled CAD revisions to project discussion, external review,
              manufacturing requests, scheduling, and connector-driven handoff without
              losing the part context.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${getRoleBadgeClass(
                  normalizedRole,
                )}`}
              >
                {normalizedRole || "access pending"}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200">
                {planLabel}
              </span>
              <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200">
                {members} member{members === 1 ? "" : "s"}
              </span>
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              {getRoleDescription(normalizedRole)}
            </p>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <CommandAction
                href="/dashboard/projects"
                icon="projects"
                title="New project"
                description="Create a space for parts, milestones, and partner discussion."
                primary
              />
              <CommandAction
                href="/dashboard/requests"
                icon="requests"
                title="New request"
                description="Prepare manufacturing or engineering work from controlled files."
              />
              <CommandAction
                href="/dashboard/parts"
                icon="vault"
                title="Find part"
                description="Search families, revisions, files, and review history."
              />
            </div>
          </div>

          <div className="relative">
            <ActionInbox
              serviceRequestCount={requests}
              projectCount={projects}
              resourceCount={resources}
              revisionCount={revisionCount}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CountTile
          label="Part families"
          value={familyCount.toString()}
          helper="Logical parts grouped across controlled revision history."
          tone="aqua"
        />
        <CountTile
          label="Revisions"
          value={revisionCount.toString()}
          helper="CAD, preview, and file evidence tied to the correct record."
          tone="teal"
        />
        <CountTile
          label="Requests"
          value={requests.toString()}
          helper="Engineering and manufacturing work packages in motion."
          tone="amber"
        />
        <CountTile
          label="Members"
          value={members.toString()}
          helper="Internal users with governed workspace access."
          tone="green"
        />
      </section>

      <section className="rounded-[16px] border border-slate-200 bg-white p-5 shadow-sm lg:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Vault to production
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Everything moving through the route, right now.
            </h2>
          </div>
          <Link
            href="/dashboard/internal-manufacturing/schedule"
            className="text-sm font-semibold text-[#006f83] hover:text-[#003040]"
          >
            Open schedule
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <PipelineStage
            href="/dashboard/projects"
            icon="projects"
            label="Projects"
            count={projects}
            helper="Intentional workspaces for real programs."
            active
          />
          <PipelineStage
            href="/dashboard/parts"
            icon="vault"
            label="CAD <-> Vault"
            count={familyCount}
            helper="Part families, revisions, and controlled files."
          />
          <PipelineStage
            href="/dashboard/collaboration"
            icon="network"
            label="Collaboration"
            count={members}
            helper="Internal comments and controlled partner threads."
          />
          <PipelineStage
            href="/dashboard/requests"
            icon="requests"
            label="External review"
            count={requests}
            helper="Requests, provider context, and returned files."
          />
          <PipelineStage
            href="/dashboard/internal-manufacturing/schedule"
            icon="manufacturing"
            label="Manufacturing"
            count={resources}
            helper="Machines, utilisation, and production planning."
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ModuleCard
          title="Part Vault"
          description="Browse controlled part families, revisions, thumbnails, and files."
          href="/dashboard/parts"
          icon="vault"
          count={familyCount.toString()}
        />
        <ModuleCard
          title="Projects"
          description="Open project spaces for linked parts, milestones, and discussion."
          href="/dashboard/projects"
          icon="projects"
          count={projects.toString()}
        />
        <ModuleCard
          title="Requests"
          description="Route CAD and part packages into supplier or internal workflows."
          href="/dashboard/requests"
          icon="requests"
          count={requests.toString()}
        />
        <ModuleCard
          title="Schedule"
          description="Plan internal resources, queue capacity, and manufacturing work."
          href="/dashboard/internal-manufacturing/schedule"
          icon="calendar"
          count={resources.toString()}
        />
        <ModuleCard
          title="Collaboration"
          description="Continue project, part, provider, and reviewer conversations."
          href="/dashboard/collaboration"
          icon="network"
        />
        <ModuleCard
          title="Insights"
          description="See queue health, request movement, and operational signals."
          href="/dashboard/insights"
          icon="insights"
        />
        <ModuleCard
          title="Design Connectors"
          description="Install and monitor CAD connector rollout and sync readiness."
          href="/dashboard/design-connectors"
          icon="plug"
        />
        <ModuleCard
          title="Organization"
          description="Manage members, roles, invitations, and workspace settings."
          href="/dashboard/organization"
          icon="account"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <ActivityFeed
          familyCount={familyCount}
          revisionCount={revisionCount}
          serviceRequestCount={requests}
          projectCount={projects}
        />

        <section className="rounded-[14px] border border-slate-200 bg-[#f8fbfc] p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Control snapshot
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">
            What Kordyne is protecting
          </h2>
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Part truth</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Files, previews, revisions, and decisions stay attached to the correct part.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Project context</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Create a project only when the part belongs in a real work package.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">External control</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Share selected files and discussions without exposing the full vault.
              </p>
            </div>
          </div>
        </section>
      </section>
    </div>
  );
}

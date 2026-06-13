import Link from "next/link";
import { redirect } from "next/navigation";
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

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-[#14395d] text-white";
    case "engineer":
      return "bg-sky-100 text-sky-800";
    case "viewer":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRoleDescription(role: string | null) {
  switch (role) {
    case "admin":
      return "You can manage organization settings, invites, parts, revisions, files, and service workflows.";
    case "engineer":
      return "You can create and update parts, revisions, files, and service requests.";
    case "viewer":
      return "You have read-only access to the vault and service request visibility.";
    default:
      return "Your workspace access is being determined.";
  }
}

function SnapshotCard({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent: string;
}) {
  return (
    <div className="kordyne-panel rounded-[16px] p-5">
      <div className={`h-1.5 w-12 rounded-full ${accent}`} />
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </div>
  );
}

const vaultFlowSteps = [
  { label: "Project", href: "/dashboard/projects" },
  { label: "CAD <-> Vault", href: "/dashboard/parts" },
  { label: "Part collaboration", href: "/dashboard/collaboration" },
  { label: "External review", href: "/dashboard/requests" },
  { label: "Manufacturing route", href: "/dashboard/internal-manufacturing/schedule" },
];

function VaultWorkflowBand() {
  return (
    <section className="overflow-hidden rounded-[12px] border border-slate-200 bg-[#101823] text-white shadow-sm">
      <div className="relative p-4 lg:p-5">
        <div className="absolute inset-0 kordyne-grid-bg opacity-45" />
        <div className="relative grid gap-4 xl:grid-cols-[1fr_0.72fr] xl:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#e08a49]">
              Vault to production
            </p>
            <div className="mt-3 grid gap-2 md:grid-cols-5">
              {vaultFlowSteps.map((step) => (
                <Link
                  key={step.href}
                  href={step.href}
                  className="rounded-[8px] border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-black text-white transition hover:bg-white/[0.12]"
                >
                  {step.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Link
              href="/dashboard/internal-manufacturing/schedule"
              className="rounded-[8px] border border-emerald-300/20 bg-emerald-400/10 p-3 transition hover:bg-emerald-400/15"
            >
              <p className="text-xs font-black uppercase text-emerald-200">
                Internal
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                Machines, utilisation, scheduling
              </p>
            </Link>
            <Link
              href="/dashboard/requests"
              className="rounded-[8px] border border-[#e08a49]/30 bg-[#e08a49]/10 p-3 transition hover:bg-[#e08a49]/15"
            >
              <p className="text-xs font-black uppercase text-[#ffd9bd]">
                External
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                Quotes, invoices, returned files
              </p>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function ActionCard({
  title,
  description,
  href,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[16px] border p-5 shadow-sm transition ${
        primary
          ? "border-[#123a66] bg-[#0b1626] text-white hover:bg-[#10233a]"
          : "border-slate-200 bg-white text-slate-900 hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p
            className={`mt-2 text-sm leading-6 ${
              primary ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {description}
          </p>
        </div>

        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] border text-sm ${
            primary
              ? "border-white/20 text-white"
              : "border-slate-200 text-slate-700"
          }`}
        >
          -&gt;
        </span>
      </div>
    </Link>
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

  return (
    <div className="space-y-6">
      <section className="kordyne-dark-panel overflow-hidden rounded-[16px]">
        <div className="grid gap-8 p-6 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:p-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-300">
              Customer workspace
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white lg:text-4xl">
              Command center
            </h1>

            <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">
              Move from controlled parts to project rooms, partner collaboration,
              manufacturing requests, scheduling, and commercial follow-through.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-xs font-semibold ${getRoleBadgeClass(
                  orgRole,
                )}`}
              >
                {orgRole || "unknown"}
              </span>

              {typedOrganization?.name ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200">
                  {typedOrganization.name}
                </span>
              ) : null}

              {typedOrganization?.plan ? (
                <span className="inline-flex rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-medium text-slate-200">
                  Plan {typedOrganization.plan}
                </span>
              ) : null}
            </div>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
              {getRoleDescription(orgRole)}
            </p>
          </div>

          <div className="rounded-[16px] border border-white/10 bg-white/[0.05] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Workspace state
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-[12px] border border-white/10 bg-[#07111d] p-4">
                <p className="text-xs text-slate-500">Families</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {familyCount}
                </p>
              </div>
              <div className="rounded-[12px] border border-white/10 bg-[#07111d] p-4">
                <p className="text-xs text-slate-500">Requests</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {serviceRequestCount ?? 0}
                </p>
              </div>
              <div className="rounded-[12px] border border-white/10 bg-[#07111d] p-4">
                <p className="text-xs text-slate-500">Projects</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {projectCount ?? 0}
                </p>
              </div>
              <div className="rounded-[12px] border border-white/10 bg-[#07111d] p-4">
                <p className="text-xs text-slate-500">Resources</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {resourceCount ?? 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <VaultWorkflowBand />

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <ActionCard
          title="Projects"
          description="Open project spaces for linked parts, milestones, and partner discussion."
          href="/dashboard/projects"
          primary
        />
        <ActionCard
          title="Part Vault"
          description="Browse part families, revision history, and controlled files."
          href="/dashboard/parts"
        />
        <ActionCard
          title="Service Requests"
          description="Manage manufacturing, CAD, and optimization workflows."
          href="/dashboard/requests"
        />
        <ActionCard
          title="Collaboration"
          description="Continue project, part, provider, and reviewer conversations."
          href="/dashboard/collaboration"
        />
        <ActionCard
          title="Schedule"
          description="Plan internal resources, machine capacity, and manufacturing work."
          href="/dashboard/internal-manufacturing/schedule"
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <ActionCard
          title="Insights"
          description="Review queue health, turnaround, and quoted value."
          href="/dashboard/insights"
        />
        <ActionCard
          title="Design Connectors"
          description="Monitor automated CAD connector rollout and sync health."
          href="/dashboard/design-connectors"
        />
        <ActionCard
          title="Organization"
          description="Manage members, roles, invitations, and settings."
          href="/dashboard/organization"
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950">
            Workspace snapshot
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Current operational scale for this organization.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label="Part families"
            value={familyCount.toString()}
            helper="Logical parts grouped across revision history."
            accent="bg-[#1c5d8f]"
          />
          <SnapshotCard
            label="Revisions"
            value={revisionCount.toString()}
            helper="Revision-controlled records stored in the vault."
            accent="bg-[#24936e]"
          />
          <SnapshotCard
            label="Requests"
            value={(serviceRequestCount ?? 0).toString()}
            helper="Engineering and manufacturing work packages."
            accent="bg-[#d18b24]"
          />
          <SnapshotCard
            label="Members"
            value={(memberCount ?? 0).toString()}
            helper="Organization users with workspace access."
            accent="bg-[#6f58c9]"
          />
        </div>
      </section>
    </div>
  );
}

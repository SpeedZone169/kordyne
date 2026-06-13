import type { ComponentProps, CSSProperties } from "react";
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

type ShellIconName = ComponentProps<typeof ShellIcon>["name"];
type Accent = "aqua" | "orange" | "emerald" | "violet" | "amber";

const accentClasses: Record<
  Accent,
  {
    bar: string;
    border: string;
    chip: string;
    glow: string;
    icon: string;
    text: string;
  }
> = {
  aqua: {
    bar: "bg-[#00bdde]",
    border: "border-[#00bdde]/28",
    chip: "border-[#00bdde]/25 bg-[#00bdde]/10 text-[#bff4ff]",
    glow: "shadow-[0_18px_36px_rgba(0,189,222,0.18)]",
    icon: "bg-[#00bdde]/12 text-[#00bdde]",
    text: "text-[#00bdde]",
  },
  orange: {
    bar: "bg-[#e08a49]",
    border: "border-[#e08a49]/28",
    chip: "border-[#e08a49]/25 bg-[#e08a49]/10 text-[#ffd8bc]",
    glow: "shadow-[0_18px_36px_rgba(224,138,73,0.16)]",
    icon: "bg-[#e08a49]/12 text-[#e08a49]",
    text: "text-[#e08a49]",
  },
  emerald: {
    bar: "bg-[#29b376]",
    border: "border-[#29b376]/28",
    chip: "border-[#29b376]/25 bg-[#29b376]/10 text-[#bff7dc]",
    glow: "shadow-[0_18px_36px_rgba(41,179,118,0.14)]",
    icon: "bg-[#29b376]/12 text-[#29b376]",
    text: "text-[#29b376]",
  },
  violet: {
    bar: "bg-[#7d6df2]",
    border: "border-[#7d6df2]/28",
    chip: "border-[#7d6df2]/25 bg-[#7d6df2]/10 text-[#d9d4ff]",
    glow: "shadow-[0_18px_36px_rgba(125,109,242,0.14)]",
    icon: "bg-[#7d6df2]/12 text-[#7d6df2]",
    text: "text-[#7d6df2]",
  },
  amber: {
    bar: "bg-[#f2bc4b]",
    border: "border-[#f2bc4b]/28",
    chip: "border-[#f2bc4b]/25 bg-[#f2bc4b]/10 text-[#ffe9b5]",
    glow: "shadow-[0_18px_36px_rgba(242,188,75,0.16)]",
    icon: "bg-[#f2bc4b]/12 text-[#f2bc4b]",
    text: "text-[#f2bc4b]",
  },
};

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "border-[#00bdde]/35 bg-[#00bdde]/12 text-[#bff4ff]";
    case "engineer":
      return "border-[#29b376]/35 bg-[#29b376]/12 text-[#c6ffe4]";
    case "viewer":
      return "border-white/16 bg-white/[0.07] text-slate-200";
    default:
      return "border-white/16 bg-white/[0.07] text-slate-200";
  }
}

function getRoleDescription(role: string | null) {
  switch (role) {
    case "admin":
      return "You can tune the operating surface: organization settings, invites, parts, revisions, files, and manufacturing workflows.";
    case "engineer":
      return "You can move parts through release, revision updates, file control, requests, and manufacturing handoff.";
    case "viewer":
      return "You can inspect the vault, manufacturing context, and service activity without changing controlled records.";
    default:
      return "Your workspace access is being determined.";
  }
}

function formatCount(value: number | null | undefined) {
  return (value ?? 0).toLocaleString("en-US");
}

const workflowSteps = [
  {
    number: "01",
    label: "Release",
    body: "Approved CAD context leaves design with the right revision and files.",
  },
  {
    number: "02",
    label: "Package",
    body: "Drawings, STEP files, thumbnails, and properties become a controlled work pack.",
  },
  {
    number: "03",
    label: "Route",
    body: "Internal capacity, project collaboration, or external review gets selected deliberately.",
  },
  {
    number: "04",
    label: "Execute",
    body: "Quotes, questions, schedules, and returned files stay attached to the part record.",
  },
  {
    number: "05",
    label: "Trace",
    body: "Every downstream decision points back to the exact part, revision, and package.",
  },
];

const quickModules: Array<{
  title: string;
  description: string;
  href: string;
  icon: ShellIconName;
  accent: Accent;
  meta: string;
  primary?: boolean;
}> = [
  {
    title: "Projects",
    description: "Program spaces for linked parts, milestones, and partner discussion.",
    href: "/dashboard/projects",
    icon: "projects",
    accent: "orange",
    meta: "Program control",
    primary: true,
  },
  {
    title: "Part Vault",
    description: "Families, revisions, previews, files, and release evidence.",
    href: "/dashboard/parts",
    icon: "vault",
    accent: "aqua",
    meta: "Source truth",
  },
  {
    title: "Service Requests",
    description: "Manufacturing, CAD, quoting, and optimization work packages.",
    href: "/dashboard/requests",
    icon: "requests",
    accent: "amber",
    meta: "Work queue",
  },
  {
    title: "Collaboration",
    description: "Part, project, provider, and reviewer conversations in context.",
    href: "/dashboard/collaboration",
    icon: "network",
    accent: "violet",
    meta: "Live context",
  },
  {
    title: "Schedule",
    description: "Internal resources, machine capacity, and manufacturing timing.",
    href: "/dashboard/internal-manufacturing/schedule",
    icon: "calendar",
    accent: "emerald",
    meta: "Factory lane",
  },
];

const secondaryModules: Array<{
  title: string;
  description: string;
  href: string;
  icon: ShellIconName;
  accent: Accent;
}> = [
  {
    title: "Insights",
    description: "Queue health, turnaround, quoted value, and handoff patterns.",
    href: "/dashboard/insights",
    icon: "insights",
    accent: "aqua",
  },
  {
    title: "Design Connectors",
    description: "CAD connector rollout, sync state, and designer-side publishing.",
    href: "/dashboard/design-connectors",
    icon: "plug",
    accent: "orange",
  },
  {
    title: "Internal Manufacturing",
    description: "Machines, capabilities, connectors, routing, and resource status.",
    href: "/dashboard/internal-manufacturing",
    icon: "manufacturing",
    accent: "emerald",
  },
  {
    title: "Organization",
    description: "Members, roles, invitations, workspace settings, and account control.",
    href: "/dashboard/organization",
    icon: "settings",
    accent: "violet",
  },
];

function DashboardEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-normal text-[#00bdde]">
      {children}
    </p>
  );
}

function StatTile({
  label,
  value,
  helper,
  accent,
}: {
  label: string;
  value: string;
  helper: string;
  accent: Accent;
}) {
  const tone = accentClasses[accent];

  return (
    <article className="rounded-[8px] border border-white/10 bg-white/[0.055] p-4">
      <div className={`h-1 w-10 rounded-full ${tone.bar}`} />
      <p className="mt-4 text-xs font-bold uppercase tracking-normal text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black tracking-tight text-white">
        {value}
      </p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p>
    </article>
  );
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
  accent: Accent;
}) {
  const tone = accentClasses[accent];

  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className={`h-1.5 w-12 rounded-full ${tone.bar}`} />
        <span className={`rounded-full px-2 py-1 text-[11px] font-black uppercase ${tone.text}`}>
          telemetry
        </span>
      </div>
      <p className="mt-5 text-xs font-black uppercase tracking-normal text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{helper}</p>
    </article>
  );
}

function ModuleCard({
  title,
  description,
  href,
  icon,
  accent,
  meta,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  icon: ShellIconName;
  accent: Accent;
  meta?: string;
  primary?: boolean;
}) {
  const tone = accentClasses[accent];

  return (
    <Link
      href={href}
      className={`group block rounded-[8px] border p-5 transition ${
        primary
          ? `border-[#00bdde]/22 bg-[#071923] text-white ${tone.glow} hover:border-[#00bdde]/44`
          : "border-slate-200 bg-white text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex min-h-[164px] flex-col justify-between gap-5">
        <div>
          <div className="flex items-center justify-between gap-4">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[8px] ${
                primary ? tone.icon : `${tone.icon} border ${tone.border}`
              }`}
            >
              <ShellIcon name={icon} className="h-5 w-5" />
            </span>

            <span
              className={`text-xs font-black uppercase tracking-normal ${
                primary ? tone.text : "text-slate-400"
              }`}
            >
              {meta ?? "open"}
            </span>
          </div>

          <h2
            className={`mt-5 text-lg font-black tracking-tight ${
              primary ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </h2>
          <p
            className={`mt-2 text-sm leading-6 ${
              primary ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {description}
          </p>
        </div>

        <div
          className={`flex items-center justify-between border-t pt-4 text-xs font-black uppercase tracking-normal ${
            primary
              ? "border-white/10 text-slate-300"
              : "border-slate-100 text-slate-500"
          }`}
        >
          <span>Enter module</span>
          <span
            aria-hidden
            className={`flex h-8 w-8 items-center justify-center rounded-full border transition group-hover:translate-x-0.5 ${
              primary
                ? "border-white/15 text-white"
                : "border-slate-200 text-slate-600"
            }`}
          >
            -&gt;
          </span>
        </div>
      </div>
    </Link>
  );
}

function SecondaryModuleCard({
  title,
  description,
  href,
  icon,
  accent,
}: {
  title: string;
  description: string;
  href: string;
  icon: ShellIconName;
  accent: Accent;
}) {
  const tone = accentClasses[accent];

  return (
    <Link
      href={href}
      className="group rounded-[8px] border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex gap-4">
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border ${tone.border} ${tone.icon}`}
        >
          <ShellIcon name={icon} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-950">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
          <p className={`mt-3 text-xs font-black uppercase tracking-normal ${tone.text}`}>
            Open surface -&gt;
          </p>
        </div>
      </div>
    </Link>
  );
}

function EnduranceTelemetry({
  familyCount,
  requestCount,
  projectCount,
  resourceCount,
}: {
  familyCount: number;
  requestCount: number;
  projectCount: number;
  resourceCount: number;
}) {
  const telemetryBars = [
    { label: "CAD sync", value: 78, accent: "bg-[#00bdde]" },
    { label: "Quote loop", value: 52, accent: "bg-[#e08a49]" },
    { label: "Capacity", value: 66, accent: "bg-[#29b376]" },
    { label: "Trace", value: 88, accent: "bg-[#7d6df2]" },
  ];

  return (
    <div className="relative min-h-[388px] overflow-hidden rounded-[8px] border border-white/10 bg-[#06151d] p-5">
      <div className="absolute inset-0 kordyne-grid-bg opacity-55" />
      <div className="absolute inset-x-0 top-0 h-px bg-[#00bdde]/45" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-normal text-[#00bdde]">
            Endurance telemetry
          </p>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
            Part-to-production race line
          </h2>
        </div>
        <span className="rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-300">
          live ops
        </span>
      </div>

      <div className="relative mt-6 h-40 overflow-hidden rounded-[8px] border border-white/10 bg-black/20">
        <div className="absolute left-[13%] top-[21%] h-[76px] w-[74%] rounded-full border-[11px] border-[#00bdde]/25 [transform:skewX(-18deg)]" />
        <div className="absolute left-[21%] top-[34%] h-[42px] w-[58%] rounded-full border-[5px] border-white/10 [transform:skewX(-18deg)]" />
        <div className="absolute left-[18%] top-[24%] h-3 w-3 rounded-full bg-[#00bdde] shadow-[0_0_24px_rgba(0,189,222,0.9)]" />
        <div className="absolute left-[52%] top-[17%] h-3 w-3 rounded-full bg-[#e08a49] shadow-[0_0_24px_rgba(224,138,73,0.9)]" />
        <div className="absolute bottom-4 right-5 flex gap-2">
          {["CAD", "Vault", "Route", "Build"].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-[11px] font-black text-slate-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <StatTile
          label="Families"
          value={formatCount(familyCount)}
          helper="Grouped part programs"
          accent="aqua"
        />
        <StatTile
          label="Requests"
          value={formatCount(requestCount)}
          helper="Active handoff loops"
          accent="orange"
        />
        <StatTile
          label="Projects"
          value={formatCount(projectCount)}
          helper="Multi-part programs"
          accent="violet"
        />
        <StatTile
          label="Resources"
          value={formatCount(resourceCount)}
          helper="Internal build assets"
          accent="emerald"
        />
      </div>

      <div className="relative mt-5 space-y-3">
        {telemetryBars.map((bar) => (
          <div key={bar.label} className="grid grid-cols-[86px_minmax(0,1fr)] items-center gap-3">
            <p className="text-xs font-bold text-slate-400">{bar.label}</p>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${bar.accent}`}
                style={{ width: `${bar.value}%` } as CSSProperties}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorkflowBand() {
  return (
    <section className="overflow-hidden rounded-[8px] border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 xl:grid-cols-[0.42fr_1fr]">
        <div className="border-b border-slate-200 bg-[#003040] p-5 text-white xl:border-b-0 xl:border-r">
          <DashboardEyebrow>Pit-wall flow</DashboardEyebrow>
          <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
            The fastest path is the cleanest handoff.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            The motorsport cue here is discipline: telemetry, assigned lanes,
            fast decisions, and no mystery about which revision is on track.
          </p>
        </div>

        <div className="grid gap-0 md:grid-cols-5">
          {workflowSteps.map((step, index) => (
            <article
              key={step.number}
              className="relative border-b border-slate-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
            >
              <p className="text-xs font-black text-[#00bdde]">{step.number}</p>
              <h3 className="mt-3 text-lg font-black text-slate-950">
                {step.label}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              {index < workflowSteps.length - 1 ? (
                <span
                  aria-hidden
                  className="absolute right-4 top-5 hidden text-xs font-black text-slate-300 md:block"
                >
                  -&gt;
                </span>
              ) : null}
            </article>
          ))}
        </div>
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
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[8px] bg-[#003040] text-white shadow-[0_24px_60px_rgba(0,48,64,0.18)]">
        <div className="absolute inset-0 kordyne-grid-bg opacity-70" />
        <div className="absolute inset-x-0 top-0 h-px bg-[#00bdde]/45" />

        <div className="relative grid gap-8 p-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:p-7">
          <div className="flex flex-col justify-between gap-8">
            <div>
              <DashboardEyebrow>Customer engineering cockpit</DashboardEyebrow>

              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight text-white lg:text-5xl">
                Run the part program like an endurance pit wall.
              </h1>

              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-200">
                A dashboard for engineers and designers who need clear signals:
                revision truth, CAD-to-vault release, supplier response,
                internal capacity, and project context in one controlled lane.
              </p>

              <div className="mt-7 flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-black uppercase ${getRoleBadgeClass(
                    orgRole,
                  )}`}
                >
                  {orgRole || "unknown"}
                </span>

                {typedOrganization?.name ? (
                  <span className="inline-flex rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-200">
                    {typedOrganization.name}
                  </span>
                ) : null}

                {typedOrganization?.plan ? (
                  <span className="inline-flex rounded-full border border-white/12 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-slate-200">
                    Plan {typedOrganization.plan}
                  </span>
                ) : null}
              </div>

              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-400">
                {getRoleDescription(orgRole)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Link
                href="/dashboard/parts"
                className="rounded-[8px] bg-[#00bdde] px-4 py-3 text-center text-sm font-black text-[#003040] shadow-[0_16px_34px_rgba(0,189,222,0.22)] transition hover:bg-[#8ceeff]"
              >
                Open Part Vault
              </Link>
              <Link
                href="/dashboard/design-connectors"
                className="rounded-[8px] border border-white/16 bg-white/[0.08] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/[0.13]"
              >
                CAD Connectors
              </Link>
              <Link
                href="/dashboard/internal-manufacturing/schedule"
                className="rounded-[8px] border border-white/16 bg-white/[0.08] px-4 py-3 text-center text-sm font-black text-white transition hover:bg-white/[0.13]"
              >
                Schedule
              </Link>
            </div>
          </div>

          <EnduranceTelemetry
            familyCount={familyCount}
            requestCount={serviceRequestCount ?? 0}
            projectCount={projectCount ?? 0}
            resourceCount={resourceCount ?? 0}
          />
        </div>
      </section>

      <WorkflowBand />

      <section>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <DashboardEyebrow>Primary surfaces</DashboardEyebrow>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Route the next decision.
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Dense enough for repeat use, visual enough to show where each part,
            request, and manufacturing response should go next.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {quickModules.map((module) => (
            <ModuleCard key={module.href} {...module} />
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
          <DashboardEyebrow>Workspace snapshot</DashboardEyebrow>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Current operating scale.
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            Think of this as the pit-wall readout for the organization: what is
            in the vault, what is in motion, and how much team surface is active.
          </p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <SnapshotCard
              label="Part families"
              value={formatCount(familyCount)}
              helper="Logical parts grouped across revision history."
              accent="aqua"
            />
            <SnapshotCard
              label="Revisions"
              value={formatCount(revisionCount)}
              helper="Revision-controlled records stored in the vault."
              accent="emerald"
            />
            <SnapshotCard
              label="Requests"
              value={formatCount(serviceRequestCount)}
              helper="Engineering and manufacturing work packages."
              accent="orange"
            />
            <SnapshotCard
              label="Members"
              value={formatCount(memberCount)}
              helper="Organization users with workspace access."
              accent="violet"
            />
          </div>
        </div>

        <div className="rounded-[8px] border border-slate-200 bg-[#f8fbfc] p-5 shadow-sm">
          <DashboardEyebrow>Support surfaces</DashboardEyebrow>
          <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
            Keep the system tuned.
          </h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {secondaryModules.map((module) => (
              <SecondaryModuleCard key={module.href} {...module} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

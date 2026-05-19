import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ProjectsPageProps = {
  searchParams: Promise<{
    filter?: string;
    project?: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type ProjectRow = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  project_type: string;
  status: string | null;
  updated_at: string | null;
  created_at: string;
  archived_at: string | null;
};

type ProjectPartLinkRow = {
  id: string;
  project_id: string;
  part_id: string;
  is_primary_part: boolean;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status: string | null;
};

type ProjectCard = {
  id: string;
  name: string;
  description: string | null;
  projectType: string;
  status: string | null;
  updatedAt: string;
  linkedPartCount: number;
  primaryPart: PartRow | null;
  parts: PartRow[];
};

const FILTERS = [
  { value: "multi", label: "Multi-part projects" },
  { value: "workspace", label: "Part workspaces" },
  { value: "all", label: "All projects" },
  { value: "archived", label: "Archived" },
] as const;

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "archived":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getProjectTypeLabel(projectType: string) {
  return projectType === "single_part_workspace"
    ? "Part Workspace"
    : "Project";
}

function buildProjectCards(
  projects: ProjectRow[],
  links: ProjectPartLinkRow[],
  parts: PartRow[],
) {
  const partsById = new Map(parts.map((part) => [part.id, part]));
  const linksByProjectId = new Map<string, ProjectPartLinkRow[]>();

  for (const link of links) {
    const current = linksByProjectId.get(link.project_id) ?? [];
    current.push(link);
    linksByProjectId.set(link.project_id, current);
  }

  return projects
    .map((project) => {
      const projectLinks = linksByProjectId.get(project.id) ?? [];
      const linkedParts = projectLinks
        .map((link) => partsById.get(link.part_id) ?? null)
        .filter((part): part is PartRow => Boolean(part));
      const primaryLink =
        projectLinks.find((link) => link.is_primary_part) ?? projectLinks[0];
      const primaryPart = primaryLink
        ? partsById.get(primaryLink.part_id) ?? null
        : null;

      return {
        id: project.id,
        name: project.name,
        description: project.description,
        projectType: project.project_type,
        status: project.status,
        updatedAt: project.updated_at || project.created_at,
        linkedPartCount: linkedParts.length,
        primaryPart,
        parts: linkedParts,
      } satisfies ProjectCard;
    })
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
}

export default async function ProjectsPage({
  searchParams,
}: ProjectsPageProps) {
  const { filter = "multi", project: highlightedProjectId = "" } =
    await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const membershipRows = (memberships as MembershipRow[] | null) ?? [];
  const organizationIds = membershipRows.map(
    (membership) => membership.organization_id,
  );

  if (organizationIds.length === 0) {
    return (
      <section className="mx-auto max-w-[1540px]">
        <h1 className="text-3xl font-black uppercase tracking-[-0.01em] text-slate-950">
          Projects
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          You are not a member of any organization.
        </p>
      </section>
    );
  }

  let projectsQuery = supabase
    .from("projects")
    .select("*")
    .in("organization_id", organizationIds)
    .order("updated_at", { ascending: false });

  if (filter === "workspace") {
    projectsQuery = projectsQuery
      .eq("project_type", "single_part_workspace")
      .neq("status", "archived");
  } else if (filter === "archived") {
    projectsQuery = projectsQuery.eq("status", "archived");
  } else if (filter !== "all") {
    projectsQuery = projectsQuery
      .eq("project_type", "multi_part_project")
      .neq("status", "archived");
  } else {
    projectsQuery = projectsQuery.neq("status", "archived");
  }

  const { data: projectsRaw, error: projectsError } = await projectsQuery;

  if (projectsError) {
    return (
      <section className="mx-auto max-w-[1540px]">
        <h1 className="text-3xl font-black uppercase tracking-[-0.01em] text-slate-950">
          Projects
        </h1>
        <p className="mt-2 rounded-[12px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The explicit Projects workspace is waiting for its database migration.
        </p>
      </section>
    );
  }

  const projectRows = (projectsRaw as ProjectRow[] | null) ?? [];
  const projectIds = projectRows.map((project) => project.id);

  const { data: linksRaw } =
    projectIds.length > 0
      ? await supabase
          .from("project_part_links")
          .select("id, project_id, part_id, is_primary_part")
          .in("project_id", projectIds)
      : { data: [] as ProjectPartLinkRow[] };

  const links = (linksRaw as ProjectPartLinkRow[] | null) ?? [];
  const partIds = Array.from(new Set(links.map((link) => link.part_id)));

  const { data: partsRaw } =
    partIds.length > 0
      ? await supabase
          .from("parts")
          .select("id, name, part_number, revision, status")
          .in("id", partIds)
      : { data: [] as PartRow[] };

  const projectCards = buildProjectCards(
    projectRows,
    links,
    (partsRaw as PartRow[] | null) ?? [],
  );

  const multiCount = projectRows.filter(
    (project) => project.project_type === "multi_part_project",
  ).length;
  const workspaceCount = projectRows.filter(
    (project) => project.project_type === "single_part_workspace",
  ).length;
  const linkedPartCount = projectCards.reduce(
    (sum, project) => sum + project.linkedPartCount,
    0,
  );

  return (
    <section className="mx-auto max-w-[1540px]">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-[-0.01em] text-slate-950">
            Projects
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Explicit project and part-workspace records only. Parts remain in
            the Vault unless an owner shares them or links them here.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/parts"
            className="rounded-[10px] bg-[#1f6fb2] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#185d98]"
          >
            Parts Vault
          </Link>
          <Link
            href="/dashboard/parts/new"
            className="rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Import part
          </Link>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Link
            key={item.value}
            href={`/dashboard/projects?filter=${item.value}`}
            className={`rounded-[10px] border px-4 py-2 text-sm font-bold transition ${
              filter === item.value || (!filter && item.value === "multi")
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Projects
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {multiCount}
          </p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Part workspaces
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {workspaceCount}
          </p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Linked parts
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {linkedPartCount}
          </p>
        </div>
      </div>

      {projectCards.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {projectCards.map((project) => (
            <article
              key={project.id}
              className={`rounded-[12px] border bg-white p-5 shadow-sm transition hover:border-[#d98042] ${
                highlightedProjectId === project.id
                  ? "border-[#d98042]"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-black text-slate-950">
                      {project.name}
                    </h2>
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-bold text-blue-800">
                      {getProjectTypeLabel(project.projectType)}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                        project.status,
                      )}`}
                    >
                      {project.status || "-"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {project.description || "No project description yet."}
                  </p>
                </div>

                <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  Updated {formatDate(project.updatedAt)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Linked parts
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.linkedPartCount}
                  </p>
                </div>
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Primary part
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-950">
                    {project.primaryPart?.name || "-"}
                  </p>
                </div>
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Revision
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.primaryPart?.revision || "-"}
                  </p>
                </div>
              </div>

              {project.parts.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {project.parts.slice(0, 5).map((part) => (
                    <Link
                      key={part.id}
                      href={`/dashboard/parts/${part.id}`}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
                    >
                      {part.part_number ? `${part.part_number} - ` : ""}
                      {part.name}
                    </Link>
                  ))}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                {project.primaryPart ? (
                  <Link
                    href={`/dashboard/parts/${project.primaryPart.id}`}
                    className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                  >
                    Open primary part
                  </Link>
                ) : null}
                <Link
                  href="/dashboard/parts"
                  className="rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                >
                  Add part from Vault
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[12px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No explicit projects in this view. Standalone parts stay in the Parts
          Vault until an owner creates a project, part workspace, or controlled
          share.
        </div>
      )}
    </section>
  );
}

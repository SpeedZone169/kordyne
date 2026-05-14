import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type PartProjectRow = {
  id: string;
  part_family_id: string;
  name: string;
  part_number: string | null;
  process_type: string | null;
  material: string | null;
  revision: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type ServiceRequestRow = {
  id: string;
  part_id: string | null;
  title: string | null;
  request_type: string;
  status: string;
  updated_at: string | null;
  created_at: string;
};

type ProjectCard = {
  id: string;
  title: string;
  partNumber: string | null;
  processType: string | null;
  material: string | null;
  latestRevisionId: string;
  latestRevision: string | null;
  latestUpdatedAt: string;
  revisionCount: number;
  requestCount: number;
  openRequestCount: number;
  status: string | null;
};

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
    case "draft":
      return "bg-amber-100 text-amber-800";
    case "archived":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function isRequestOpen(status: string) {
  return !["completed", "cancelled", "rejected"].includes(status);
}

function compareParts(a: PartProjectRow, b: PartProjectRow) {
  const aTime = new Date(a.updated_at || a.created_at).getTime();
  const bTime = new Date(b.updated_at || b.created_at).getTime();

  return bTime - aTime;
}

function buildProjectCards(
  parts: PartProjectRow[],
  requests: ServiceRequestRow[],
) {
  const requestCountsByPartId = new Map<
    string,
    { total: number; open: number }
  >();

  for (const request of requests) {
    if (!request.part_id) continue;

    const current = requestCountsByPartId.get(request.part_id) ?? {
      total: 0,
      open: 0,
    };

    current.total += 1;
    current.open += isRequestOpen(request.status) ? 1 : 0;
    requestCountsByPartId.set(request.part_id, current);
  }

  const partsByFamily = new Map<string, PartProjectRow[]>();

  for (const part of parts) {
    const current = partsByFamily.get(part.part_family_id) ?? [];
    current.push(part);
    partsByFamily.set(part.part_family_id, current);
  }

  return Array.from(partsByFamily.entries())
    .map(([familyId, familyParts]) => {
      const sortedParts = [...familyParts].sort(compareParts);
      const latestPart = sortedParts[0];
      const requestTotals = familyParts.reduce(
        (summary, part) => {
          const counts = requestCountsByPartId.get(part.id);

          return {
            total: summary.total + (counts?.total ?? 0),
            open: summary.open + (counts?.open ?? 0),
          };
        },
        { total: 0, open: 0 },
      );

      return {
        id: familyId,
        title: latestPart.name,
        partNumber: latestPart.part_number,
        processType: latestPart.process_type,
        material: latestPart.material,
        latestRevisionId: latestPart.id,
        latestRevision: latestPart.revision,
        latestUpdatedAt: latestPart.updated_at || latestPart.created_at,
        revisionCount: familyParts.length,
        requestCount: requestTotals.total,
        openRequestCount: requestTotals.open,
        status: latestPart.status,
      } satisfies ProjectCard;
    })
    .sort((a, b) => {
      return (
        new Date(b.latestUpdatedAt).getTime() -
        new Date(a.latestUpdatedAt).getTime()
      );
    });
}

export default async function ProjectsPage() {
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
  const organizationIds = membershipRows.map((membership) => membership.organization_id);

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

  const { data: parts } = await supabase
    .from("parts")
    .select(
      "id, part_family_id, name, part_number, process_type, material, revision, status, updated_at, created_at",
    )
    .in("organization_id", organizationIds)
    .order("updated_at", { ascending: false });

  const { data: requests } = await supabase
    .from("service_requests")
    .select("id, part_id, title, request_type, status, updated_at, created_at")
    .in("organization_id", organizationIds)
    .order("updated_at", { ascending: false });

  const projectCards = buildProjectCards(
    (parts as PartProjectRow[] | null) ?? [],
    (requests as ServiceRequestRow[] | null) ?? [],
  );

  const totalRevisions = projectCards.reduce(
    (sum, project) => sum + project.revisionCount,
    0,
  );
  const totalRequests = projectCards.reduce(
    (sum, project) => sum + project.requestCount,
    0,
  );
  const openRequests = projectCards.reduce(
    (sum, project) => sum + project.openRequestCount,
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
            A project library for part families, revisions, and manufacturing
            work packages. Use this for both small single-part work and larger
            assemblies that collect many controlled releases.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/parts/new"
            className="rounded-[10px] bg-[#1f6fb2] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#185d98]"
          >
            Import release
          </Link>
          <Link
            href="/dashboard/requests"
            className="rounded-[10px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-slate-50"
          >
            Requests
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Project groups
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {projectCards.length}
          </p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Controlled revisions
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {totalRevisions}
          </p>
        </div>
        <div className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
            Open requests
          </p>
          <p className="mt-2 text-4xl font-black text-slate-950">
            {openRequests}
          </p>
        </div>
      </div>

      {projectCards.length > 0 ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-2">
          {projectCards.map((project) => (
            <article
              key={project.id}
              className="rounded-[12px] border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#d98042]"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/dashboard/parts/${project.latestRevisionId}`}
                      className="text-xl font-black text-slate-950 transition hover:text-[#1f6fb2]"
                    >
                      {project.title}
                    </Link>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                        project.status,
                      )}`}
                    >
                      {project.status || "-"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{project.partNumber || "No part number"}</span>
                    <span>{project.processType || "No process"}</span>
                    <span>{project.material || "No material"}</span>
                  </div>
                </div>

                <div className="rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  Updated {formatDate(project.latestUpdatedAt)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Latest revision
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.latestRevision || "-"}
                  </p>
                </div>
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Revisions
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.revisionCount}
                  </p>
                </div>
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Requests
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.requestCount}
                  </p>
                </div>
                <div className="rounded-[10px] border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">
                    Active
                  </p>
                  <p className="mt-1 text-lg font-black text-slate-950">
                    {project.openRequestCount}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Link
                  href={`/dashboard/parts/${project.latestRevisionId}`}
                  className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
                >
                  Open project
                </Link>
                <Link
                  href={`/dashboard/requests?part=${project.latestRevisionId}`}
                  className="rounded-[10px] border border-slate-200 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-slate-50"
                >
                  Linked requests
                </Link>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-[12px] border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-600">
          No project groups yet. Import a part release to start the project library.
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        {totalRequests} total manufacturing and engineering requests are linked
        to the projects shown here.
      </p>
    </section>
  );
}

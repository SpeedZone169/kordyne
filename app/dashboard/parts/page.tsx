import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";

type PartsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    process?: string;
    material?: string;
  }>;
};

type PartRow = {
  id: string;
  part_family_id: string;
  name: string;
  part_number: string | null;
  process_type: string | null;
  material: string | null;
  revision: string | null;
  revision_index: number | null;
  revision_note: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type PartFamilyGroup = {
  partFamilyId: string;
  familyName: string;
  familyPartNumber: string | null;
  latestRevision: PartRow;
  revisions: PartRow[];
  revisionCount: number;
  latestUpdatedAt: string;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "archived":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

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

function comparePartsByRevision(a: PartRow, b: PartRow) {
  const aRevisionIndex = a.revision_index ?? 0;
  const bRevisionIndex = b.revision_index ?? 0;

  if (aRevisionIndex !== bRevisionIndex) {
    return bRevisionIndex - aRevisionIndex;
  }

  const aUpdatedAt = new Date(a.updated_at || a.created_at).getTime();
  const bUpdatedAt = new Date(b.updated_at || b.created_at).getTime();

  return bUpdatedAt - aUpdatedAt;
}

function buildFamilyGroups(parts: PartRow[]) {
  const familyMap = new Map<string, PartRow[]>();

  for (const part of parts) {
    const existing = familyMap.get(part.part_family_id) || [];
    existing.push(part);
    familyMap.set(part.part_family_id, existing);
  }

  return Array.from(familyMap.entries())
    .map(([partFamilyId, familyParts]) => {
      const revisions = [...familyParts].sort(comparePartsByRevision);
      const latestRevision = revisions[0];

      return {
        partFamilyId,
        familyName: latestRevision.name,
        familyPartNumber: latestRevision.part_number,
        latestRevision,
        revisions,
        revisionCount: revisions.length,
        latestUpdatedAt: latestRevision.updated_at || latestRevision.created_at,
      } satisfies PartFamilyGroup;
    })
    .sort((a, b) => {
      const aTime = new Date(a.latestUpdatedAt).getTime();
      const bTime = new Date(b.latestUpdatedAt).getTime();
      return bTime - aTime;
    });
}

export default async function PartsPage({ searchParams }: PartsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");
  const canCreatePart = orgRole === "admin" || orgRole === "engineer";

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryText = resolvedSearchParams.q?.trim() || "";
  const statusFilter = resolvedSearchParams.status?.trim() || "";
  const processFilter = resolvedSearchParams.process?.trim() || "";
  const materialFilter = resolvedSearchParams.material?.trim() || "";

  let filteredFamilySeedQuery = supabase
    .from("parts")
    .select(
      "id, part_family_id, name, part_number, process_type, material, revision, revision_index, revision_note, status, updated_at, created_at"
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (queryText) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.or(
      `name.ilike.%${queryText}%,part_number.ilike.%${queryText}%,material.ilike.%${queryText}%`
    );
  }

  if (statusFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq("status", statusFilter);
  }

  if (processFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq(
      "process_type",
      processFilter
    );
  }

  if (materialFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq("material", materialFilter);
  }

  const { data: filteredSeedParts, error } = await filteredFamilySeedQuery;

  const { data: allPartsForFilters } = await supabase
    .from("parts")
    .select("status, process_type, material");

  const statusOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.status)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const processOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.process_type)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const materialOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.material)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();

  const matchingFamilyIds = Array.from(
    new Set(
      ((filteredSeedParts as PartRow[] | null) ?? []).map(
        (part) => part.part_family_id
      )
    )
  );

  const { data: familyParts } =
    matchingFamilyIds.length > 0
      ? await supabase
          .from("parts")
          .select(
            "id, part_family_id, name, part_number, process_type, material, revision, revision_index, revision_note, status, updated_at, created_at"
          )
          .in("part_family_id", matchingFamilyIds)
      : { data: [] as PartRow[] };

  const familyGroups = buildFamilyGroups((familyParts as PartRow[] | null) ?? []);

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Parts Vault</h1>
            <p className="mt-4 text-gray-600">
              Manage your parts, revisions, and manufacturing metadata through a
              family-based vault view.
            </p>

            <div className="mt-4 flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                  orgRole
                )}`}
              >
                {orgRole || "unknown"}
              </span>

              {!canCreatePart ? (
                <p className="text-sm text-gray-500">
                  Read-only access. Viewers can browse parts but cannot create
                  or edit them.
                </p>
              ) : null}
            </div>
          </div>

          {canCreatePart ? (
            <Link
              href="/dashboard/parts/new"
              className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              New Part
            </Link>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <form className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-4">
              <label className="mb-2 block text-sm font-medium">Search</label>
              <input
                type="text"
                name="q"
                defaultValue={queryText}
                placeholder="Search by part name, part number, or material"
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={statusFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Process</label>
              <select
                name="process"
                defaultValue={processFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {processOptions.map((process) => (
                  <option key={process} value={process}>
                    {process}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Material</label>
              <select
                name="material"
                defaultValue={materialFilter}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3"
              >
                <option value="">All</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Apply Filters
              </button>

              <Link
                href="/dashboard/parts"
                className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Clear
              </Link>
            </div>
          </form>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200">
          <div className="hidden grid-cols-[72px_minmax(0,1.6fr)_140px_140px_140px_110px_100px_120px_140px] gap-4 bg-gray-50 px-6 py-4 text-left text-sm font-medium lg:grid">
            <div>Expand</div>
            <div>Name</div>
            <div>Part Number</div>
            <div>Process</div>
            <div>Material</div>
            <div>Latest Rev</div>
            <div>Count</div>
            <div>Status</div>
            <div>Updated</div>
          </div>

          {familyGroups.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {familyGroups.map((family) => (
                <details key={family.partFamilyId} className="group">
                  <summary className="list-none cursor-pointer px-6 py-5 transition hover:bg-gray-50">
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[72px_minmax(0,1.6fr)_140px_140px_140px_110px_100px_120px_140px] lg:items-center lg:gap-4">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-lg font-medium text-gray-700">
                          <span className="group-open:hidden">+</span>
                          <span className="hidden group-open:inline">−</span>
                        </span>
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Expand
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-gray-900">
                          {family.familyName}
                        </div>
                        <div className="mt-1 text-sm text-gray-500 lg:hidden">
                          Open family to see revision history
                        </div>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Part Number
                        </span>
                        <span className="text-sm text-gray-900">
                          {family.familyPartNumber || "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Process
                        </span>
                        <span className="text-sm text-gray-900">
                          {family.latestRevision.process_type || "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Material
                        </span>
                        <span className="text-sm text-gray-900">
                          {family.latestRevision.material || "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Latest Revision
                        </span>
                        <span className="font-medium text-gray-900">
                          {family.latestRevision.revision || "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Revision Count
                        </span>
                        <span className="font-medium text-gray-900">
                          {family.revisionCount}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Status
                        </span>
                        {family.latestRevision.status ? (
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                              family.latestRevision.status
                            )}`}
                          >
                            {family.latestRevision.status}
                          </span>
                        ) : (
                          "-"
                        )}
                      </div>

                      <div className="flex items-center gap-2 lg:block">
                        <span className="text-xs font-medium uppercase tracking-[0.12em] text-gray-400 lg:hidden">
                          Updated
                        </span>
                        <span className="text-sm text-gray-900">
                          {formatDate(family.latestUpdatedAt)}
                        </span>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-gray-200 bg-gray-50/70 px-6 py-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
                          Revision History
                        </h2>
                        <p className="mt-1 text-sm text-gray-600">
                          Exact revision records for this part family.
                        </p>
                      </div>

                      <Link
                        href={`/dashboard/parts/${family.latestRevision.id}`}
                        className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-white"
                      >
                        Open Latest Revision
                      </Link>
                    </div>

                    <div className="space-y-3">
                      {family.revisions.map((revision, index) => {
                        const isLatest = revision.id === family.latestRevision.id;

                        return (
                          <div
                            key={revision.id}
                            className="rounded-2xl border border-gray-200 bg-white px-4 py-4"
                          >
                            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Link
                                    href={`/dashboard/parts/${revision.id}`}
                                    className="text-sm font-semibold text-green-700 hover:text-green-800 hover:underline"
                                  >
                                    Rev {revision.revision || "-"}
                                  </Link>

                                  {isLatest ? (
                                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                      Latest
                                    </span>
                                  ) : null}

                                  {index === 0 ? (
                                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                                      Current family head
                                    </span>
                                  ) : null}
                                </div>

                                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                  <span>
                                    Part Number {revision.part_number || "-"}
                                  </span>
                                  <span>
                                    Process {revision.process_type || "-"}
                                  </span>
                                  <span>
                                    Material {revision.material || "-"}
                                  </span>
                                  <span>
                                    Updated{" "}
                                    {formatDateTime(
                                      revision.updated_at || revision.created_at
                                    )}
                                  </span>
                                </div>

                                {revision.revision_note ? (
                                  <p className="mt-2 text-sm text-gray-600">
                                    {revision.revision_note}
                                  </p>
                                ) : (
                                  <p className="mt-2 text-sm text-gray-400">
                                    No revision note added.
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {revision.status ? (
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                                      revision.status
                                    )}`}
                                  >
                                    {revision.status}
                                  </span>
                                ) : null}

                                <Link
                                  href={`/dashboard/parts/${revision.id}`}
                                  className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                                >
                                  Open Revision
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="px-6 py-8 text-gray-500">
              No parts found for the current filters.
            </div>
          )}
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600">Failed to load parts.</p>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
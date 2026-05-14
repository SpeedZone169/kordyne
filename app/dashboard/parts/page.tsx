import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";

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

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  asset_category: string | null;
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

type PartFamilyView = PartFamilyGroup & {
  fileCount: number;
  thumbnailUrl: string | null;
  thumbnailKind: "image" | "cad" | "pdf" | "doc" | "empty";
  thumbnailLabel: string;
};

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateString));
}

function formatRelative(dateString: string | null) {
  if (!dateString) return "No update";

  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.max(1, Math.round(diffMs / 60000));

  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  if (days < 14) return `${days} days ago`;

  return formatDateTime(dateString);
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

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-slate-950 text-white";
    case "engineer":
      return "bg-sky-100 text-sky-800";
    case "viewer":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
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

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

function isImageFile(file: PartFileRow) {
  const extension = getFileExtension(file.file_name);
  const mime = (file.file_type || "").toLowerCase();

  return (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(extension)
  );
}

function getThumbnailKind(file: PartFileRow | null): PartFamilyView["thumbnailKind"] {
  if (!file) return "empty";
  if (isImageFile(file)) return "image";

  const extension = getFileExtension(file.file_name);
  if (["stl", "step", "stp"].includes(extension)) return "cad";
  if (extension === "pdf" || file.file_type === "application/pdf") return "pdf";
  return "doc";
}

function getThumbnailLabel(file: PartFileRow | null) {
  if (!file) return "No files";
  const extension = getFileExtension(file.file_name);
  return extension ? extension.toUpperCase() : "FILE";
}

function chooseThumbnailFile(group: PartFamilyGroup, files: PartFileRow[]) {
  const latestFiles = files.filter(
    (file) => file.part_id === group.latestRevision.id,
  );

  return (
    latestFiles.find(isImageFile) ||
    files.find(isImageFile) ||
    latestFiles.find((file) =>
      ["stl", "step", "stp", "pdf"].includes(getFileExtension(file.file_name)),
    ) ||
    files[0] ||
    null
  );
}

function PartThumbnail({ family }: { family: PartFamilyView }) {
  if (family.thumbnailUrl) {
    return (
      <div className="h-16 w-24 overflow-hidden rounded-[8px] border border-slate-200 bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={family.thumbnailUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-16 w-24 items-center justify-center overflow-hidden rounded-[8px] border border-slate-200 bg-[linear-gradient(135deg,#eef2f6,#ffffff)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,116,144,0.16),transparent_35%)]" />
      <div
        className={`relative flex h-10 w-14 rotate-[-12deg] items-center justify-center rounded-[8px] shadow-[0_12px_20px_rgba(15,23,42,0.18)] ${
          family.thumbnailKind === "cad"
            ? "bg-slate-700 text-white"
            : family.thumbnailKind === "pdf"
              ? "bg-[#d98042] text-white"
              : family.thumbnailKind === "doc"
                ? "bg-sky-700 text-white"
                : "bg-slate-300 text-slate-700"
        }`}
      >
        <span className="rotate-[12deg] text-[10px] font-black tracking-[0.12em]">
          {family.thumbnailLabel}
        </span>
      </div>
    </div>
  );
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
      "id, part_family_id, name, part_number, process_type, material, revision, revision_index, revision_note, status, updated_at, created_at",
    )
    .order("updated_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (queryText) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.or(
      `name.ilike.%${queryText}%,part_number.ilike.%${queryText}%,material.ilike.%${queryText}%`,
    );
  }

  if (statusFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq("status", statusFilter);
  }

  if (processFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq(
      "process_type",
      processFilter,
    );
  }

  if (materialFilter) {
    filteredFamilySeedQuery = filteredFamilySeedQuery.eq(
      "material",
      materialFilter,
    );
  }

  const { data: filteredSeedParts, error } = await filteredFamilySeedQuery;

  const { data: allPartsForFilters } = await supabase
    .from("parts")
    .select("status, process_type, material");

  const statusOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.status)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();

  const processOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.process_type)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();

  const materialOptions = Array.from(
    new Set(
      (allPartsForFilters || [])
        .map((part) => part.material)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();

  const matchingFamilyIds = Array.from(
    new Set(
      ((filteredSeedParts as PartRow[] | null) ?? []).map(
        (part) => part.part_family_id,
      ),
    ),
  );

  const { data: familyParts } =
    matchingFamilyIds.length > 0
      ? await supabase
          .from("parts")
          .select(
            "id, part_family_id, name, part_number, process_type, material, revision, revision_index, revision_note, status, updated_at, created_at",
          )
          .in("part_family_id", matchingFamilyIds)
      : { data: [] as PartRow[] };

  const familyGroups = buildFamilyGroups((familyParts as PartRow[] | null) ?? []);
  const partIds = familyGroups.flatMap((family) =>
    family.revisions.map((revision) => revision.id),
  );

  const { data: familyFilesRaw } =
    partIds.length > 0
      ? await supabase
          .from("part_files")
          .select(
            "id, part_id, file_name, file_type, storage_path, asset_category, created_at",
          )
          .in("part_id", partIds)
          .order("created_at", { ascending: false })
      : { data: [] as PartFileRow[] };

  const familyFiles = (familyFilesRaw as PartFileRow[] | null) ?? [];
  const filesByFamilyId = new Map<string, PartFileRow[]>();
  const familyIdByPartId = new Map<string, string>();

  for (const family of familyGroups) {
    for (const revision of family.revisions) {
      familyIdByPartId.set(revision.id, family.partFamilyId);
    }
  }

  for (const file of familyFiles) {
    const familyId = familyIdByPartId.get(file.part_id);
    if (!familyId) continue;
    const existing = filesByFamilyId.get(familyId) ?? [];
    existing.push(file);
    filesByFamilyId.set(familyId, existing);
  }

  const selectedThumbnailFiles = familyGroups
    .map((family) => chooseThumbnailFile(family, filesByFamilyId.get(family.partFamilyId) ?? []))
    .filter((file): file is PartFileRow => Boolean(file) && isImageFile(file));

  const signedImageUrls = new Map<string, string>();

  await Promise.all(
    selectedThumbnailFiles.map(async (file) => {
      const { data } = await supabase.storage
        .from("part-files")
        .createSignedUrl(file.storage_path, 60 * 10);

      if (data?.signedUrl) {
        signedImageUrls.set(file.id, data.signedUrl);
      }
    }),
  );

  const familyViews: PartFamilyView[] = familyGroups.map((family) => {
    const familyFileRows = filesByFamilyId.get(family.partFamilyId) ?? [];
    const thumbnailFile = chooseThumbnailFile(family, familyFileRows);
    const thumbnailKind = getThumbnailKind(thumbnailFile);

    return {
      ...family,
      fileCount: familyFileRows.length,
      thumbnailUrl:
        thumbnailFile && thumbnailKind === "image"
          ? signedImageUrls.get(thumbnailFile.id) ?? null
          : null,
      thumbnailKind,
      thumbnailLabel: getThumbnailLabel(thumbnailFile),
    };
  });

  const activeCount = familyViews.filter(
    (family) => family.latestRevision.status === "active",
  ).length;
  const previewReadyCount = familyViews.filter(
    (family) => family.thumbnailKind !== "empty",
  ).length;

  return (
    <section className="mx-auto max-w-[1540px]">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-[-0.01em] text-slate-950">
            Part Vault
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Revision-controlled part families with previews, request context, and collaboration signals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${getRoleBadgeClass(
              orgRole,
            )}`}
          >
            {orgRole || "unknown"}
          </span>

          {canCreatePart ? (
            <Link
              href="/dashboard/parts/new"
              className="rounded-[10px] bg-[#1f6fb2] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#185d98]"
            >
              Import release
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 rounded-[12px] border border-slate-200 bg-white shadow-sm">
          <form className="grid gap-3 border-b border-slate-200 p-4 lg:grid-cols-[minmax(260px,1fr)_150px_170px_170px_auto]">
            <input
              type="text"
              name="q"
              defaultValue={queryText}
              placeholder="Search"
              className="min-h-10 rounded-[8px] border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
            />

            <select
              name="status"
              defaultValue={statusFilter}
              className="min-h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>

            <select
              name="process"
              defaultValue={processFilter}
              className="min-h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All process</option>
              {processOptions.map((process) => (
                <option key={process} value={process}>
                  {process}
                </option>
              ))}
            </select>

            <select
              name="material"
              defaultValue={materialFilter}
              className="min-h-10 rounded-[8px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            >
              <option value="">All materials</option>
              {materialOptions.map((material) => (
                <option key={material} value={material}>
                  {material}
                </option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                type="submit"
                className="min-h-10 rounded-[8px] bg-slate-950 px-4 text-sm font-bold text-white"
              >
                Apply
              </button>
              <Link
                href="/dashboard/parts"
                className="inline-flex min-h-10 items-center rounded-[8px] border border-slate-200 px-3 text-sm font-semibold text-slate-700"
              >
                Clear
              </Link>
            </div>
          </form>

          <div className="grid grid-cols-[112px_minmax(250px,1fr)_120px_130px_190px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500 max-lg:hidden">
            <div>Preview</div>
            <div>Name</div>
            <div>Status</div>
            <div>Revision</div>
            <div>Last modified</div>
          </div>

          {familyViews.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {familyViews.map((family) => (
                <details key={family.partFamilyId} className="group">
                  <summary className="list-none cursor-pointer px-4 py-3 transition hover:bg-slate-50">
                    <div className="grid gap-4 lg:grid-cols-[112px_minmax(250px,1fr)_120px_130px_190px] lg:items-center">
                      <PartThumbnail family={family} />

                      <div className="min-w-0">
                        <Link
                          href={`/dashboard/parts/${family.latestRevision.id}`}
                          className="text-base font-black text-slate-950 hover:text-[#1f6fb2]"
                        >
                          {family.familyName}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>{family.familyPartNumber || "No part number"}</span>
                          <span>{family.latestRevision.process_type || "No process"}</span>
                          <span>{family.latestRevision.material || "No material"}</span>
                          <span>{family.fileCount} files</span>
                        </div>
                      </div>

                      <div>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(
                            family.latestRevision.status,
                          )}`}
                        >
                          {family.latestRevision.status || "-"}
                        </span>
                      </div>

                      <div className="text-sm">
                        <div className="font-bold text-slate-900">
                          Revision {family.latestRevision.revision || "-"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {family.revisionCount} total
                        </div>
                      </div>

                      <div className="text-sm text-slate-600">
                        <div className="font-semibold text-slate-900">
                          {formatRelative(family.latestUpdatedAt)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatDateTime(family.latestUpdatedAt)}
                        </div>
                      </div>
                    </div>
                  </summary>

                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="grid gap-3">
                      {family.revisions.map((revision) => (
                        <Link
                          key={revision.id}
                          href={`/dashboard/parts/${revision.id}`}
                          className="grid gap-3 rounded-[10px] border border-slate-200 bg-white p-3 transition hover:border-[#d98042] md:grid-cols-[1fr_120px_160px_auto] md:items-center"
                        >
                          <div>
                            <div className="font-bold text-slate-900">
                              {revision.name}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {revision.revision_note || "No revision note"}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-slate-700">
                            Rev {revision.revision || "-"}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDateTime(revision.updated_at || revision.created_at)}
                          </div>
                          <span className="text-xs font-bold text-[#1f6fb2]">
                            Open
                          </span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          ) : (
            <div className="p-10 text-center text-sm text-slate-500">
              No parts found for the current filters.
            </div>
          )}

          {error ? (
            <p className="border-t border-slate-200 p-4 text-sm text-red-600">
              Failed to load parts.
            </p>
          ) : null}
        </div>

        <aside className="space-y-5">
          <section className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
                Status
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4">
              <div>
                <div className="text-4xl font-black text-slate-950">
                  {familyViews.length}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Part families
                </div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-950">
                  {activeCount}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Active
                </div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-950">
                  {previewReadyCount}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  With previews
                </div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-950">
                  {familyViews.reduce((sum, family) => sum + family.revisionCount, 0)}
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-500">
                  Revisions
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
                Workspaces
              </h2>
            </div>

            <div className="grid gap-3 p-4">
              <Link
                href="/dashboard/projects"
                className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition hover:border-[#d98042] hover:bg-white"
              >
                Project library
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  Group parts into customer programs and larger assemblies.
                </span>
              </Link>
              <Link
                href="/dashboard/requests"
                className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition hover:border-[#d98042] hover:bg-white"
              >
                Manufacturing requests
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  Route selected revisions to internal or external providers.
                </span>
              </Link>
              <Link
                href="/dashboard/internal-manufacturing/connectors"
                className="rounded-[10px] border border-slate-200 bg-slate-50 p-3 text-sm font-bold text-slate-900 transition hover:border-[#d98042] hover:bg-white"
              >
                Printer connectors
                <span className="mt-1 block text-xs font-medium text-slate-500">
                  Connect internal machines and scheduling data.
                </span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

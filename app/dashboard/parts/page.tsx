import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import { getPartCategoryLabel, getProcessTypeLabel } from "@/lib/parts";

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
  user_id: string | null;
  name: string;
  part_number: string | null;
  process_type: string | null;
  material: string | null;
  category: string | null;
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

type PartSourceLinkRow = {
  part_family_id: string | null;
  part_id: string | null;
  provider_key: string;
  updated_at: string;
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type ThumbnailKind = "image" | "cad" | "pdf" | "doc" | "empty";

type RevisionView = PartRow & {
  fileCount: number;
  thumbnailUrl: string | null;
  thumbnailKind: ThumbnailKind;
  thumbnailLabel: string;
  sourceKey: string | null;
  sourceLabel: string;
  publisherName: string;
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

type PartFamilyView = Omit<PartFamilyGroup, "latestRevision" | "revisions"> & {
  latestRevision: RevisionView;
  revisions: RevisionView[];
  fileCount: number;
  thumbnailUrl: string | null;
  thumbnailKind: ThumbnailKind;
  thumbnailLabel: string;
  latestSourceLabel: string;
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

function getThumbnailKind(file: PartFileRow | null): ThumbnailKind {
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

function chooseRevisionThumbnailFile(partId: string, files: PartFileRow[]) {
  const revisionFiles = files.filter((file) => file.part_id === partId);
  return (
    revisionFiles.find(isImageFile) ||
    revisionFiles.find((file) =>
      ["stl", "step", "stp", "pdf"].includes(getFileExtension(file.file_name)),
    ) ||
    revisionFiles[0] ||
    null
  );
}

function getSourceLabel(providerKey: string | null) {
  switch ((providerKey || "").toLowerCase()) {
    case "solidworks":
      return "SOLIDWORKS";
    case "inventor":
    case "autodesk_inventor":
      return "Autodesk Inventor";
    case "onshape":
      return "Onshape";
    case "fusion":
    case "fusion360":
    case "autodesk_fusion":
      return "Autodesk Fusion";
    default:
      return "Manual upload";
  }
}

function getDisplayName(profile: ProfileRow | null | undefined) {
  return profile?.full_name || profile?.email || "Unknown user";
}

function PartThumbnail({
  thumbnailUrl,
  thumbnailKind,
  thumbnailLabel,
  compact = false,
}: {
  thumbnailUrl: string | null;
  thumbnailKind: ThumbnailKind;
  thumbnailLabel: string;
  compact?: boolean;
}) {
  const dimensions = compact ? "h-14 w-20" : "h-16 w-24";

  if (thumbnailUrl) {
    return (
      <div className={`${dimensions} shrink-0 overflow-hidden rounded-[6px] border border-slate-200 bg-slate-100`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`relative flex ${dimensions} shrink-0 items-center justify-center overflow-hidden rounded-[6px] border border-slate-200 bg-[linear-gradient(135deg,#eef2f6,#ffffff)]`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,116,144,0.16),transparent_35%)]" />
      <div
        className={`relative flex h-9 w-12 rotate-[-12deg] items-center justify-center rounded-[6px] shadow-[0_10px_18px_rgba(15,23,42,0.16)] ${
          thumbnailKind === "cad"
            ? "bg-slate-700 text-white"
            : thumbnailKind === "pdf"
              ? "bg-[#d98042] text-white"
              : thumbnailKind === "doc"
                ? "bg-sky-700 text-white"
                : "bg-slate-300 text-slate-700"
        }`}
      >
        <span className="rotate-[12deg] text-[10px] font-black tracking-[0.12em]">
          {thumbnailLabel}
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
      "id, part_family_id, user_id, name, part_number, process_type, material, category, revision, revision_index, revision_note, status, updated_at, created_at",
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
            "id, part_family_id, user_id, name, part_number, process_type, material, category, revision, revision_index, revision_note, status, updated_at, created_at",
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
  const filesByPartId = new Map<string, PartFileRow[]>();

  for (const file of familyFiles) {
    const existing = filesByPartId.get(file.part_id) ?? [];
    existing.push(file);
    filesByPartId.set(file.part_id, existing);
  }

  const publisherIds = Array.from(
    new Set(
      familyGroups
        .flatMap((family) => family.revisions.map((revision) => revision.user_id))
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const [{ data: sourceLinksRaw }, { data: publisherProfilesRaw }] =
    await Promise.all([
      matchingFamilyIds.length > 0
        ? supabase
            .from("part_source_links")
            .select("part_family_id, part_id, provider_key, updated_at")
            .in("part_family_id", matchingFamilyIds)
            .order("updated_at", { ascending: false })
        : Promise.resolve({ data: [] as PartSourceLinkRow[] }),
      publisherIds.length > 0
        ? supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", publisherIds)
        : Promise.resolve({ data: [] as ProfileRow[] }),
    ]);

  const sourceLinks =
    (sourceLinksRaw as PartSourceLinkRow[] | null) ?? [];
  const sourceLinkByPartId = new Map<string, PartSourceLinkRow>();

  for (const sourceLink of sourceLinks) {
    if (sourceLink.part_id && !sourceLinkByPartId.has(sourceLink.part_id)) {
      sourceLinkByPartId.set(sourceLink.part_id, sourceLink);
    }
  }

  const publisherProfileById = new Map(
    ((publisherProfilesRaw as ProfileRow[] | null) ?? []).map((profile) => [
      profile.user_id,
      profile,
    ]),
  );

  function buildRevisionView(revision: PartRow): RevisionView {
    const revisionFiles = filesByPartId.get(revision.id) ?? [];
    const thumbnailFile = chooseRevisionThumbnailFile(
      revision.id,
      revisionFiles,
    );
    const thumbnailKind = getThumbnailKind(thumbnailFile);
    const sourceLink = sourceLinkByPartId.get(revision.id);

    return {
      ...revision,
      fileCount: revisionFiles.length,
      thumbnailUrl:
        thumbnailFile && thumbnailKind === "image"
          ? `/api/part-files/${thumbnailFile.id}/content?mode=inline`
          : null,
      thumbnailKind,
      thumbnailLabel: getThumbnailLabel(thumbnailFile),
      sourceKey: sourceLink?.provider_key ?? null,
      sourceLabel: getSourceLabel(sourceLink?.provider_key ?? null),
      publisherName: revision.user_id
        ? getDisplayName(publisherProfileById.get(revision.user_id))
        : "Unknown user",
    };
  }

  const familyViews: PartFamilyView[] = familyGroups.map((family) => {
    const revisionViews = family.revisions.map(buildRevisionView);
    const latestRevision = revisionViews[0];

    return {
      ...family,
      latestRevision,
      revisions: revisionViews,
      fileCount: revisionViews.reduce(
        (total, revision) => total + revision.fileCount,
        0,
      ),
      thumbnailUrl: latestRevision.thumbnailUrl,
      thumbnailKind: latestRevision.thumbnailKind,
      thumbnailLabel: latestRevision.thumbnailLabel,
      latestSourceLabel: latestRevision.sourceLabel,
    };
  });

  const previewReadyCount = familyViews.filter(
    (family) => family.thumbnailKind !== "empty",
  ).length;
  const totalRevisionCount = familyViews.reduce(
    (total, family) => total + family.revisionCount,
    0,
  );
  const assemblyCount = familyViews.filter(
    (family) => family.latestRevision.category === "assembly",
  ).length;

  return (
    <section className="mx-auto max-w-[1540px] pb-8">
      <header className="border-b border-slate-200 pb-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
              Controlled library
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950">
              Parts Vault
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Every part family, revision, file, preview, and release source in one controlled record.
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
                className="rounded-[6px] bg-[#003040] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#00485c]"
              >
                Import release
              </Link>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 border-y border-slate-200 sm:grid-cols-4">
          {[
            [familyViews.length, "Part families"],
            [totalRevisionCount, "Revisions"],
            [previewReadyCount, "With previews"],
            [assemblyCount, "Assemblies"],
          ].map(([value, label], index) => (
            <div
              key={label}
              className={`px-4 py-3 ${index > 0 ? "border-l border-slate-200" : ""}`}
            >
              <div className="text-xl font-black text-slate-950">{value}</div>
              <div className="text-xs font-semibold text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </header>

      <form className="mt-5 grid gap-3 rounded-[8px] border border-slate-200 bg-white p-3 lg:grid-cols-[minmax(260px,1fr)_150px_180px_180px_auto]">
        <label className="sr-only" htmlFor="parts-search">
          Search parts
        </label>
        <input
          id="parts-search"
          type="text"
          name="q"
          defaultValue={queryText}
          placeholder="Search part name, number, or material"
          className="min-h-10 rounded-[6px] border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-cyan-600"
        />

        <select
          name="status"
          defaultValue={statusFilter}
          aria-label="Filter by status"
          className="min-h-10 rounded-[6px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
        >
          <option value="">All statuses</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <select
          name="process"
          defaultValue={processFilter}
          aria-label="Filter by process"
          className="min-h-10 rounded-[6px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
        >
          <option value="">All processes</option>
          {processOptions.map((process) => (
            <option key={process} value={process}>
              {getProcessTypeLabel(process)}
            </option>
          ))}
        </select>

        <select
          name="material"
          defaultValue={materialFilter}
          aria-label="Filter by material"
          className="min-h-10 rounded-[6px] border border-slate-200 bg-white px-3 text-sm outline-none focus:border-cyan-600"
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
            className="min-h-10 rounded-[6px] bg-[#003040] px-4 text-sm font-bold text-white"
          >
            Apply
          </button>
          <Link
            href="/dashboard/parts"
            className="inline-flex min-h-10 items-center rounded-[6px] border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="mt-4 min-w-0 overflow-hidden rounded-[8px] border border-slate-200 bg-white">
        <div className="hidden grid-cols-[96px_minmax(260px,1fr)_110px_155px_125px_180px_44px] items-center border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500 lg:grid">
          <div>Preview</div>
          <div>Part family</div>
          <div>Status</div>
          <div>Source</div>
          <div>Revisions</div>
          <div>Last modified</div>
          <div aria-hidden="true" />
        </div>

        {familyViews.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {familyViews.map((family) => (
              <details key={family.partFamilyId} className="group">
                <summary className="list-none cursor-pointer px-4 py-3 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                  <div className="grid gap-4 lg:grid-cols-[96px_minmax(260px,1fr)_110px_155px_125px_180px_44px] lg:items-center">
                    <PartThumbnail
                      thumbnailUrl={family.thumbnailUrl}
                      thumbnailKind={family.thumbnailKind}
                      thumbnailLabel={family.thumbnailLabel}
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/dashboard/parts/${family.latestRevision.id}`}
                          className="truncate text-base font-black text-slate-950 hover:text-cyan-700"
                        >
                          {family.familyName}
                        </Link>
                        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          {getPartCategoryLabel(family.latestRevision.category)}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span>{family.familyPartNumber || "No part number"}</span>
                        <span>{getProcessTypeLabel(family.latestRevision.process_type)}</span>
                        <span>{family.latestRevision.material || "No material"}</span>
                        <span>{family.fileCount} files</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 lg:hidden">
                        <span>{family.latestSourceLabel}</span>
                        <span>{family.revisionCount} revisions</span>
                        <span>{formatRelative(family.latestUpdatedAt)}</span>
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(
                          family.latestRevision.status,
                        )}`}
                      >
                        {family.latestRevision.status || "-"}
                      </span>
                    </div>

                    <div className="hidden text-sm font-semibold text-slate-700 lg:block">
                      {family.latestSourceLabel}
                    </div>

                    <div className="hidden lg:block">
                      <div className="text-sm font-bold text-slate-900">
                        {family.revisionCount}
                      </div>
                      <div className="text-xs text-slate-500">
                        Latest Rev {family.latestRevision.revision || "-"}
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className="text-sm font-semibold text-slate-900">
                        {formatRelative(family.latestUpdatedAt)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(family.latestUpdatedAt)}
                      </div>
                    </div>

                    <span
                      className="grid h-9 w-9 place-items-center justify-self-end rounded-[6px] border border-slate-300 bg-white text-lg font-medium text-slate-700 transition group-open:border-cyan-600 group-open:text-cyan-700"
                      title="Expand revision history"
                      aria-hidden="true"
                    >
                      <span className="group-open:hidden">+</span>
                      <span className="hidden group-open:inline">-</span>
                    </span>
                  </div>
                </summary>

                <div className="border-t border-slate-200 bg-slate-50 px-4 pb-4 pt-3">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-black text-slate-950">
                        Revision history
                      </h2>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Created, sourced, and modified records. Newest revision first.
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">
                      {family.revisionCount} total
                    </span>
                  </div>

                  <div className="hidden grid-cols-[80px_minmax(220px,1fr)_105px_180px_175px_175px_86px] items-center border-y border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-slate-500 lg:grid">
                    <div>Preview</div>
                    <div>Revision</div>
                    <div>Status</div>
                    <div>Source / publisher</div>
                    <div>Created</div>
                    <div>Last modified</div>
                    <div>Files</div>
                  </div>

                  <div className="divide-y divide-slate-200 border-b border-slate-200">
                    {family.revisions.map((revision) => (
                      <Link
                        key={revision.id}
                        href={`/dashboard/parts/${revision.id}`}
                        className="grid gap-3 bg-white px-3 py-3 transition hover:bg-cyan-50/50 lg:grid-cols-[80px_minmax(220px,1fr)_105px_180px_175px_175px_86px] lg:items-center"
                      >
                        <PartThumbnail
                          thumbnailUrl={revision.thumbnailUrl}
                          thumbnailKind={revision.thumbnailKind}
                          thumbnailLabel={revision.thumbnailLabel}
                          compact
                        />

                        <div className="min-w-0">
                          <div className="font-black text-slate-950">
                            Rev {revision.revision || "-"}
                            <span className="ml-2 font-semibold text-slate-600">
                              {revision.name}
                            </span>
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">
                            {revision.revision_note || "No revision note"}
                          </div>
                        </div>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${getStatusBadgeClass(
                              revision.status,
                            )}`}
                          >
                            {revision.status || "-"}
                          </span>
                        </div>

                        <div className="text-xs">
                          <div className="font-bold text-slate-800">
                            {revision.sourceLabel}
                          </div>
                          <div className="mt-1 truncate text-slate-500">
                            Published by {revision.publisherName}
                          </div>
                        </div>

                        <div className="text-xs text-slate-600">
                          <span className="mr-1 font-semibold text-slate-800 lg:hidden">
                            Created:
                          </span>
                          {formatDateTime(revision.created_at)}
                        </div>

                        <div className="text-xs text-slate-600">
                          <span className="mr-1 font-semibold text-slate-800 lg:hidden">
                            Modified:
                          </span>
                          {formatDateTime(revision.updated_at || revision.created_at)}
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 lg:block">
                          <span>{revision.fileCount}</span>
                          <span className="text-cyan-700 lg:mt-1 lg:block">Open</span>
                        </div>
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
    </section>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import UploadSection from "./UploadSection";
import FileActions from "./FileActions";
import PartStatusEditor from "./PartStatusEditor";
import ServiceRequestActions from "./ServiceRequestActions";
import ServiceRequestHistory from "./ServiceRequestHistory";
import CreateRevisionButton from "./CreateRevisionButton";
import PartFilesViewer from "./PartFilesViewer";
import {
  getPartCategoryLabel,
  getProcessTypeLabel,
} from "@/lib/parts";

type PageProps = {
  params: Promise<{ id: string }>;
};

const CATEGORY_ORDER = [
  "cad_3d",
  "drawing_2d",
  "image",
  "manufacturing_doc",
  "quality_doc",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  cad_3d: "CAD 3D",
  drawing_2d: "2D Drawings",
  image: "Images",
  manufacturing_doc: "Manufacturing Docs",
  quality_doc: "Quality Docs",
  other: "Other",
};

type PartFile = {
  id: string;
  part_id: string;
  user_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  asset_category: string | null;
  created_at: string;
};

type PartFileWithUrls = PartFile & {
  previewUrl: string | null;
  downloadUrl: string | null;
  uploaderName: string | null;
  previewKind: "image" | "pdf" | "cad" | "other";
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type RevisionRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  revision_note: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type FamilyFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  asset_category: string | null;
  created_at: string;
};

type FamilySourceFile = {
  id: string;
  partId: string;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  createdAt: string;
  sourceRevision: {
    partId: string;
    revision: string | null;
    name: string;
    partNumber: string | null;
    createdAt: string;
    updatedAt: string | null;
    status: string | null;
    isCurrent: boolean;
  };
};

function groupFilesByCategory(files: PartFileWithUrls[]) {
  const grouped: Record<string, PartFileWithUrls[]> = {
    cad_3d: [],
    drawing_2d: [],
    image: [],
    manufacturing_doc: [],
    quality_doc: [],
    other: [],
  };

  for (const file of files) {
    const category =
      file.asset_category && CATEGORY_LABELS[file.asset_category]
        ? file.asset_category
        : "other";

    grouped[category].push(file);
  }

  return grouped;
}

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

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDisplayName(profile: ProfileRow | null | undefined) {
  if (!profile) return "-";
  return profile.full_name || profile.email || "-";
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

function getPreviewKind(
  fileName: string,
  fileType: string | null,
): "image" | "pdf" | "cad" | "other" {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = (fileType || "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  if (mime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (["stl", "step", "stp"].includes(extension)) {
    return "cad";
  }

  return "other";
}

export default async function PartDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");
  const canEditPart = orgRole === "admin" || orgRole === "engineer";
  const canRequest = canEditPart;

  const { data: part, error } = await supabase
    .from("parts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !part) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Part not found</h1>
        <p className="mt-4 text-slate-600">
          We could not find this part in your vault.
        </p>
      </section>
    );
  }

  const { data: files } = await supabase
    .from("part_files")
    .select("*")
    .eq("part_id", id)
    .order("created_at", { ascending: false });

  const profileIds = Array.from(
    new Set(
      [part.user_id, ...(files || []).map((file) => file.user_id)].filter(Boolean),
    ),
  );

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", profileIds)
      : { data: [] as ProfileRow[] };

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile]),
  );

  const creatorProfile = part.user_id ? profileMap.get(part.user_id) : null;

  const filesWithUrls: PartFileWithUrls[] = files
    ? await Promise.all(
        (files as PartFile[]).map(async (file) => {
         const previewKind = getPreviewKind(file.file_name, file.file_type);

const [previewSigned, downloadSigned] = await Promise.all([
  previewKind === "pdf" || previewKind === "image"
    ? supabase.storage
        .from("part-files")
        .createSignedUrl(file.storage_path, 60 * 10)
    : Promise.resolve({ data: null, error: null }),
  supabase.storage
    .from("part-files")
    .createSignedUrl(file.storage_path, 60 * 10, {
      download: file.file_name,
    }),
]);

if (previewSigned?.error) {
  console.error(
    "Preview signed URL error for file:",
    file.file_name,
    previewSigned.error,
  );
}

if (downloadSigned.error) {
  console.error(
    "Download signed URL error for file:",
    file.file_name,
    downloadSigned.error,
  );
}

return {
  ...file,
  previewUrl:
    previewKind === "pdf" || previewKind === "image"
      ? previewSigned?.data?.signedUrl || null
      : downloadSigned.data?.signedUrl || null,
  downloadUrl: downloadSigned.data?.signedUrl || null,
  uploaderName: getDisplayName(profileMap.get(file.user_id)),
  previewKind,
};
        }),
      )
    : [];

  const groupedFiles = groupFilesByCategory(filesWithUrls);

  const { data: revisions } = await supabase
    .from("parts")
    .select(
      "id, name, part_number, revision, revision_note, status, updated_at, created_at",
    )
    .eq("organization_id", part.organization_id)
    .eq("part_family_id", part.part_family_id)
    .order("created_at", { ascending: true });

  const revisionRows = (revisions as RevisionRow[] | null) ?? [];

  const revisionIds = revisionRows.map((revisionPart) => revisionPart.id);

  const { data: familyFiles } =
    revisionIds.length > 0
      ? await supabase
          .from("part_files")
          .select(
            "id, part_id, file_name, file_type, file_size_bytes, asset_category, created_at",
          )
          .in("part_id", revisionIds)
          .order("created_at", { ascending: false })
      : { data: [] as FamilyFileRow[] };

  const revisionMap = new Map(
    revisionRows.map((revisionPart) => [revisionPart.id, revisionPart] as const),
  );

  const familyFilesForRevisionPicker: FamilySourceFile[] = (
    (familyFiles as FamilyFileRow[] | null) ?? []
  ).flatMap((file) => {
    const sourceRevision = revisionMap.get(file.part_id);

    if (!sourceRevision) {
      return [];
    }

    return [
      {
        id: file.id,
        partId: file.part_id,
        fileName: file.file_name,
        fileType: file.file_type,
        fileSizeBytes: file.file_size_bytes,
        assetCategory: file.asset_category,
        createdAt: file.created_at,
        sourceRevision: {
          partId: sourceRevision.id,
          revision: sourceRevision.revision,
          name: sourceRevision.name,
          partNumber: sourceRevision.part_number,
          createdAt: sourceRevision.created_at,
          updatedAt: sourceRevision.updated_at,
          status: sourceRevision.status,
          isCurrent: sourceRevision.id === part.id,
        },
      },
    ];
  });

  const previewableFilesCount = filesWithUrls.filter(
    (file) => file.previewKind !== "other",
  ).length;

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Part detail
            </p>

            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {part.name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
              {part.description || "No description added yet."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Part number {part.part_number || "-"}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Revision {part.revision || "-"}
              </span>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                  part.status,
                )}`}
              >
                {part.status || "-"}
              </span>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {getProcessTypeLabel(part.process_type)}
              </span>
            </div>

            {!canEditPart ? (
              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                You have read-only access. Viewers can browse files and metadata
                but cannot upload, recategorize, delete, or update part status.
              </div>
            ) : null}
          </div>

          {canEditPart ? (
            <div className="flex flex-wrap gap-3">
              <CreateRevisionButton
                sourcePartId={part.id}
                currentRevision={part.revision}
                sourceFiles={familyFilesForRevisionPicker.map((file) => ({
                  id: file.id,
                  fileName: file.fileName,
                  assetCategory: file.assetCategory,
                  fileType: file.fileType,
                  sourceRevision: file.sourceRevision.revision,
                }))}
              />

              <Link
                href={`/dashboard/parts/${part.id}/edit`}
                className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Edit part
              </Link>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              Revisions
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Related revisions for this part family.
            </p>
          </div>
        </div>

        {revisionRows.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {revisionRows.map((revisionPart) => {
              const isCurrent = revisionPart.id === part.id;

              return (
                <Link
                  key={revisionPart.id}
                  href={`/dashboard/parts/${revisionPart.id}`}
                  className={`min-w-[140px] rounded-2xl border px-4 py-3 transition ${
                    isCurrent
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Rev {revisionPart.revision || "-"}
                    </span>

                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
                        revisionPart.status,
                      )}`}
                    >
                      {revisionPart.status || "-"}
                    </span>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    {revisionPart.part_number || "-"}
                  </div>

                  <div className="mt-1 text-xs text-slate-400">
                    {formatDate(
                      revisionPart.updated_at || revisionPart.created_at,
                    )}
                  </div>

                  {revisionPart.revision_note ? (
                    <div className="mt-2 line-clamp-2 text-xs text-slate-600">
                      {revisionPart.revision_note}
                    </div>
                  ) : null}

                  {isCurrent ? (
                    <div className="mt-2 text-[11px] font-medium text-slate-900">
                      Current
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">No linked revisions found.</p>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-stretch">
        <div className="h-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
            Part information
          </h2>

          <div className="mt-6 grid gap-4 text-sm">
            <div>
              <p className="text-slate-500">Part Number</p>
              <p className="font-medium text-slate-900">
                {part.part_number || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Process Type</p>
              <p className="font-medium text-slate-900">
                {getProcessTypeLabel(part.process_type)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Material</p>
              <p className="font-medium text-slate-900">
                {part.material || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Revision</p>
              <p className="font-medium text-slate-900">
                {part.revision || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Revision Note</p>
              <p className="font-medium text-slate-900">
                {part.revision_note || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Category</p>
              <p className="font-medium text-slate-900">
                {getPartCategoryLabel(part.category)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Created By</p>
              <p className="font-medium text-slate-900">
                {getDisplayName(creatorProfile)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Created</p>
              <p className="font-medium text-slate-900">
                {formatDate(part.created_at)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Last Updated</p>
              <p className="font-medium text-slate-900">
                {formatDateTime(part.updated_at || part.created_at)}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Status</p>

              {canEditPart ? (
                <PartStatusEditor
                  partId={part.id}
                  currentStatus={part.status}
                />
              ) : (
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                    part.status,
                  )}`}
                >
                  {part.status || "-"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="h-full">
          {canEditPart ? (
            <div className="h-full">
              <UploadSection partId={part.id} />
            </div>
          ) : (
            <div className="h-full rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                Upload files
              </h2>
              <p className="mt-4 text-sm text-slate-600">
                File upload is available to engineers and admins only.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              In-page preview
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review part files directly inside the page. PDF, image and preview
              surfaces are handled in a tidy split view, while STL and STEP files
              are prepared for the next dedicated 3D/CAD viewer layer.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              {filesWithUrls.length} file{filesWithUrls.length === 1 ? "" : "s"}
            </div>
            <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
              {previewableFilesCount} preview-ready
            </div>
          </div>
        </div>

        <div className="mt-8">
          <PartFilesViewer
            files={filesWithUrls.map((file) => ({
              id: file.id,
              fileName: file.file_name,
              fileType: file.file_type,
              fileSizeBytes: file.file_size_bytes,
              assetCategory: file.asset_category,
              createdAt: file.created_at,
              uploaderName: file.uploaderName,
              previewUrl: file.previewUrl,
              downloadUrl: file.downloadUrl,
              previewKind: file.previewKind,
            }))}
          />
        </div>
      </div>

      <div className="mt-6 rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
              File management
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Keep the existing categorized file controls for download, recategorization,
              and management.
            </p>
          </div>
        </div>

        {filesWithUrls.length > 0 ? (
          <div className="mt-6 space-y-6">
            {CATEGORY_ORDER.map((category) => {
              const categoryFiles = groupedFiles[category];

              if (!categoryFiles || categoryFiles.length === 0) {
                return null;
              }

              return (
                <div key={category}>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-500">
                      {CATEGORY_LABELS[category]}
                    </h3>
                    <span className="text-sm text-slate-400">
                      {categoryFiles.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {categoryFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {file.file_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {file.file_type || "unknown"} ·{" "}
                            {formatBytes(file.file_size_bytes)}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            Uploaded {formatDateTime(file.created_at)}
                            {file.uploaderName
                              ? ` by ${file.uploaderName}`
                              : ""}
                          </p>
                        </div>

                        {canEditPart ? (
                          <FileActions
                            fileId={file.id}
                            fileName={file.file_name}
                            storagePath={file.storage_path}
                            signedUrl={file.downloadUrl}
                            assetCategory={file.asset_category}
                          />
                        ) : file.downloadUrl ? (
                          <Link
                            href={file.downloadUrl}
                            className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-50"
                          >
                            Download
                          </Link>
                        ) : (
                          <span className="text-sm text-slate-400">
                            Download unavailable
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-600">No files attached yet.</p>
        )}
      </div>

      <div className="mt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Manufacturing Requests
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Create and track manufacturing or engineering service workflows
            for this part.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
          <ServiceRequestActions
            partId={part.id}
            canRequest={canRequest}
            availableFiles={filesWithUrls.map((file) => ({
              id: file.id,
              fileName: file.file_name,
              assetCategory: file.asset_category,
              fileType: file.file_type,
            }))}
          />

          <ServiceRequestHistory partId={part.id} />
        </div>
      </div>
    </section>
  );
}
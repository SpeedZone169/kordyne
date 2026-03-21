import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import UploadSection from "./UploadSection";
import FileActions from "./FileActions";
import PartStatusEditor from "./PartStatusEditor";
import ServiceRequestActions from "./ServiceRequestActions";
import ServiceRequestHistory from "./ServiceRequestHistory";
import CreateRevisionButton from "./CreateRevisionButton";
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

type PartFileWithUrl = PartFile & {
  signedUrl: string | null;
  uploaderName: string | null;
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
  asset_category: string | null;
};

function groupFilesByCategory(files: PartFileWithUrl[]) {
  const grouped: Record<string, PartFileWithUrl[]> = {
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
      return "bg-green-100 text-green-800";
    case "draft":
      return "bg-yellow-100 text-yellow-800";
    case "archived":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
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

  const { data: files } = await supabase
    .from("part_files")
    .select("*")
    .eq("part_id", id)
    .order("created_at", { ascending: false });

  const profileIds = Array.from(
    new Set(
      [part?.user_id, ...(files || []).map((file) => file.user_id)].filter(
        Boolean
      )
    )
  );

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", profileIds)
      : { data: [] as ProfileRow[] };

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile])
  );

  const creatorProfile = part?.user_id ? profileMap.get(part.user_id) : null;

  const filesWithUrls: PartFileWithUrl[] = files
    ? await Promise.all(
        (files as PartFile[]).map(async (file) => {
          const { data, error } = await supabase.storage
            .from("part-files")
            .createSignedUrl(file.storage_path, 60 * 10, {
              download: file.file_name,
            });

          if (error) {
            console.error("Signed URL error for file:", file.file_name, error);
          }

          return {
            ...file,
            signedUrl: data?.signedUrl || null,
            uploaderName: getDisplayName(profileMap.get(file.user_id)),
          };
        })
      )
    : [];

  const groupedFiles = groupFilesByCategory(filesWithUrls);

  if (error || !part) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <Navbar />
        <section className="mx-auto max-w-7xl px-6 py-20">
          <h1 className="text-3xl font-bold">Part not found</h1>
          <p className="mt-4 text-gray-600">
            We could not find this part in your vault.
          </p>
        </section>
        <Footer />
      </main>
    );
  }

  const { data: revisions } = await supabase
    .from("parts")
    .select(
      "id, name, part_number, revision, revision_note, status, updated_at, created_at"
    )
    .eq("part_family_id", part.part_family_id)
    .order("created_at", { ascending: true });

  const revisionIds = ((revisions as RevisionRow[] | null) ?? []).map(
    (revisionPart) => revisionPart.id
  );

  const { data: familyFiles } =
    revisionIds.length > 0
      ? await supabase
          .from("part_files")
          .select("id, part_id, file_name, file_type, asset_category")
          .in("part_id", revisionIds)
          .order("created_at", { ascending: false })
      : { data: [] as FamilyFileRow[] };

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Part Detail
            </p>

            <h1 className="mt-2 text-4xl font-bold">{part.name}</h1>

            <p className="mt-4 text-gray-600">
              {part.description || "No description added yet."}
            </p>

            {!canEditPart ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
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
                sourceFiles={((familyFiles as FamilyFileRow[] | null) ?? []).map(
                  (file) => {
                    const sourceRevision =
                      ((revisions as RevisionRow[] | null) ?? []).find(
                        (revisionPart) => revisionPart.id === file.part_id
                      )?.revision || null;

                    return {
                      id: file.id,
                      fileName: file.file_name,
                      assetCategory: file.asset_category,
                      fileType: file.file_type,
                      sourceRevision,
                    };
                  }
                )}
              />

              <Link
                href={`/dashboard/parts/${part.id}/edit`}
                className="inline-flex rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Edit Part
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-8 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Revisions</h2>
              <p className="mt-2 text-sm text-gray-600">
                Related revisions for this part family.
              </p>
            </div>
          </div>

          {revisions && revisions.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-3">
              {(revisions as RevisionRow[]).map((revisionPart) => {
                const isCurrent = revisionPart.id === part.id;

                return (
                  <Link
                    key={revisionPart.id}
                    href={`/dashboard/parts/${revisionPart.id}`}
                    className={`min-w-[120px] rounded-2xl border px-4 py-3 transition ${
                      isCurrent
                        ? "border-gray-900 bg-gray-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-gray-900">
                        Rev {revisionPart.revision || "-"}
                      </span>

                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
                          revisionPart.status
                        )}`}
                      >
                        {revisionPart.status || "-"}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      {revisionPart.part_number || "-"}
                    </div>

                    <div className="mt-1 text-xs text-gray-400">
                      {formatDate(revisionPart.updated_at || revisionPart.created_at)}
                    </div>

                    {revisionPart.revision_note ? (
                      <div className="mt-2 line-clamp-2 text-xs text-gray-600">
                        {revisionPart.revision_note}
                      </div>
                    ) : null}

                    {isCurrent ? (
                      <div className="mt-2 text-[11px] font-medium text-gray-900">
                        Current
                      </div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-sm text-gray-600">
              No linked revisions found.
            </p>
          )}
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-stretch">
          <div className="h-full rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Part Information</h2>

            <div className="mt-6 grid gap-4 text-sm">
              <div>
                <p className="text-gray-500">Part Number</p>
                <p className="font-medium text-gray-900">
                  {part.part_number || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Process Type</p>
                <p className="font-medium text-gray-900">
                  {getProcessTypeLabel(part.process_type)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Material</p>
                <p className="font-medium text-gray-900">
                  {part.material || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Revision</p>
                <p className="font-medium text-gray-900">
                  {part.revision || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Revision Note</p>
                <p className="font-medium text-gray-900">
                  {part.revision_note || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">
                  {getPartCategoryLabel(part.category)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Created By</p>
                <p className="font-medium text-gray-900">
                  {getDisplayName(creatorProfile)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">
                  {formatDate(part.created_at)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Last Updated</p>
                <p className="font-medium text-gray-900">
                  {formatDateTime(part.updated_at || part.created_at)}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Status</p>

                {canEditPart ? (
                  <PartStatusEditor
                    partId={part.id}
                    currentStatus={part.status}
                  />
                ) : (
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getStatusBadgeClass(
                      part.status
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
              <div className="h-full rounded-3xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Upload Files</h2>
                <p className="mt-4 text-sm text-gray-600">
                  File upload is available to engineers and admins only.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Part Files</h2>

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
                      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-gray-500">
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <span className="text-sm text-gray-400">
                        {categoryFiles.length}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {categoryFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex flex-col gap-4 rounded-2xl border border-gray-200 px-4 py-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="font-medium text-gray-900">
                              {file.file_name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {file.file_type || "unknown"} ·{" "}
                              {formatBytes(file.file_size_bytes)}
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
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
                              signedUrl={file.signedUrl}
                              assetCategory={file.asset_category}
                            />
                          ) : file.signedUrl ? (
                            <Link
                              href={file.signedUrl}
                              className="inline-flex rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                            >
                              Download
                            </Link>
                          ) : (
                            <span className="text-sm text-gray-400">
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
            <p className="mt-4 text-sm text-gray-600">No files attached yet.</p>
          )}
        </div>

        <div className="mt-10">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Manufacturing Requests
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Create and track manufacturing or engineering service workflows for this part.
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

      <Footer />
    </main>
  );
}
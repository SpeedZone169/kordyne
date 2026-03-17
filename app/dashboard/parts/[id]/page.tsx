import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import UploadSection from "./UploadSection";
import FileActions from "./FileActions";
import PartStatusEditor from "./PartStatusEditor";

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

export default async function PartDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

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
      [
        part?.user_id,
        ...(files || []).map((file) => file.user_id),
      ].filter(Boolean)
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

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Part Detail
          </p>

          <h1 className="text-4xl font-bold">{part.name}</h1>

          <p className="text-gray-600">
            {part.description || "No description added yet."}
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
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
                  {part.process_type || "-"}
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
                <p className="text-gray-500">Category</p>
                <p className="font-medium text-gray-900">
                  {part.category || "-"}
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
                <PartStatusEditor
                  partId={part.id}
                  currentStatus={part.status}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <UploadSection partId={part.id} />

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Attached Files</h2>

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
                              className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
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

                              <FileActions
                                fileId={file.id}
                                fileName={file.file_name}
                                storagePath={file.storage_path}
                                signedUrl={file.signedUrl}
                                assetCategory={file.asset_category}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 text-sm text-gray-600">
                  No files attached yet.
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-xl font-semibold">Manufacturing Notes</h2>
          <p className="mt-4 text-sm text-gray-600">
            This area can later include print settings, PDF documentation,
            images, work instructions, and linked manufacturing assets.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
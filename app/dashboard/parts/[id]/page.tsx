import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import UploadSection from "./UploadSection";

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
  file_name: string;
  file_type: string | null;
  storage_path: string;
  asset_category: string | null;
  created_at: string;
};

type PartFileWithUrl = PartFile & {
  signedUrl: string | null;
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

  const filesWithUrls: PartFileWithUrl[] = files
    ? await Promise.all(
        (files as PartFile[]).map(async (file) => {
          const { data } = await supabase.storage
            .from("part-files")
            .createSignedUrl(file.storage_path, 60 * 10);

          return {
            ...file,
            signedUrl: data?.signedUrl || null,
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
                <p className="text-gray-500">Status</p>
                <p className="font-medium text-gray-900">
                  {part.status || "-"}
                </p>
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
                                  {file.file_type || "unknown"}
                                </p>
                              </div>

                              {file.signedUrl ? (
                                <a
                                  href={file.signedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                                >
                                  Download
                                </a>
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Unavailable
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
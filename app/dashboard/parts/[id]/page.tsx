import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import Navbar from "../../../../components/Navbar";
import Footer from "../../../../components/Footer";
import UploadSection from "./UploadSection";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

              {files && files.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-2xl border border-gray-200 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {file.file_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {file.asset_category} · {file.file_type || "unknown"}
                        </p>
                      </div>
                    </div>
                  ))}
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
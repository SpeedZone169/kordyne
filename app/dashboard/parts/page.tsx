import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";

export default async function PartsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: parts, error } = await supabase
    .from("parts")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Parts Vault</h1>
            <p className="mt-4 text-gray-600">
              Manage your parts, metadata, and manufacturing assets.
            </p>
          </div>

          <Link
            href="/dashboard/parts/new"
            className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            New Part
          </Link>
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-gray-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Part Number</th>
                <th className="px-6 py-4 font-medium">Process</th>
                <th className="px-6 py-4 font-medium">Material</th>
                <th className="px-6 py-4 font-medium">Revision</th>
                <th className="px-6 py-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {parts && parts.length > 0 ? (
                parts.map((part) => (
                  <tr key={part.id} className="border-t border-gray-200">
                    <td className="px-6 py-4">
  <Link
    href={`/dashboard/parts/${part.id}`}
    className="font-medium text-green-700 hover:text-green-800 hover:underline"
  >
    {part.name}
  </Link>
</td>
                    <td className="px-6 py-4">{part.part_number || "-"}</td>
                    <td className="px-6 py-4">{part.process_type || "-"}</td>
                    <td className="px-6 py-4">{part.material || "-"}</td>
                    <td className="px-6 py-4">{part.revision || "-"}</td>
                    <td className="px-6 py-4">{part.status || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-gray-500">
                    No parts yet. Create your first part.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-600">
            Failed to load parts.
          </p>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>

            <p className="mt-4 text-gray-600">
              Welcome to your Kordyne workspace.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Signed in as {user.email}
            </p>

            <Link
              href="/dashboard/parts"
              className="mt-8 inline-flex rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open Parts Vault
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
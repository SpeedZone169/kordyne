import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

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

function getRoleDescription(role: string | null) {
  switch (role) {
    case "admin":
      return "You can manage organization settings, invites, and parts.";
    case "engineer":
      return "You can create and update parts and files.";
    case "viewer":
      return "You have read-only access to the parts vault.";
    default:
      return "Your workspace access is being determined.";
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");

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

            <div className="mt-6">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                  orgRole
                )}`}
              >
                {orgRole || "unknown"}
              </span>
              <p className="mt-3 text-sm text-gray-600">
                {getRoleDescription(orgRole)}
              </p>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard/parts"
                className="inline-flex rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Open Parts Vault
              </Link>

              <Link
                href="/dashboard/organization"
                className="inline-flex rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                View Organization
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import AccountProfileForm from "./AccountProfileForm";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-4xl px-6 py-20">
        <div>
          <h1 className="text-4xl font-bold">Account</h1>
          <p className="mt-4 text-gray-600">
            Manage your profile and account details.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Profile Details</h2>

            {error ? (
              <p className="mt-4 text-sm text-red-600">
                Failed to load profile.
              </p>
            ) : (
              <AccountProfileForm
                userId={user.id}
                email={profile?.email || user.email || ""}
                fullName={profile?.full_name || ""}
                company={profile?.company || ""}
              />
            )}
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Account Overview</h2>

            <div className="mt-6 grid gap-4 text-sm">
              <div>
                <p className="text-gray-500">Email</p>
                <p className="font-medium text-gray-900">
                  {profile?.email || user.email || "-"}
                </p>
              </div>

              <div>
                <p className="text-gray-500">Company</p>
                <p className="font-medium text-gray-900">
                  {profile?.company || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
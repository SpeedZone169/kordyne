import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
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
    .select(
      "email, full_name, company, position, phone, address_line, avatar_url, preferred_theme",
    )
    .eq("user_id", user.id)
    .single();

  const initials =
    (profile?.full_name || user.email || "A")
      .split(/[ @.]/)
      .map((part: string) => part.trim()[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "A";

  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-xl font-bold text-slate-700">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                initials
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-950">
                {profile?.full_name || "Account"}
              </h1>
              <p className="mt-1 truncate text-sm text-slate-500">
                {profile?.position || "Add your position"}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-slate-500">Email</p>
              <p className="mt-1 break-words font-medium text-slate-900">
                {profile?.email || user.email || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Company</p>
              <p className="mt-1 font-medium text-slate-900">
                {profile?.company || "-"}
              </p>
            </div>

            <div>
              <p className="text-slate-500">Telephone</p>
              <p className="mt-1 font-medium text-slate-900">
                {profile?.phone || "-"}
              </p>
            </div>
          </div>
        </aside>

        <div className="rounded-[18px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-7">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Profile and preferences
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Account settings
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Add the details collaborators expect to see when projects, vendor
              packages, and external reviews move through the workspace.
            </p>
          </div>

          {error ? (
            <p className="text-sm text-red-600">Failed to load profile.</p>
          ) : (
            <AccountProfileForm
              userId={user.id}
              email={profile?.email || user.email || ""}
              fullName={profile?.full_name || ""}
              company={profile?.company || ""}
              position={profile?.position || ""}
              phone={profile?.phone || ""}
              addressLine={profile?.address_line || ""}
              avatarUrl={profile?.avatar_url || ""}
              preferredTheme={profile?.preferred_theme || "light"}
            />
          )}
        </div>
      </div>
    </section>
  );
}

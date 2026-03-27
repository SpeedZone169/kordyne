import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type OrganizationRow = {
  id: string;
  name: string;
  created_at: string;
};

type MembershipRow = {
  organization_id: string;
};

async function updateOrganizationName(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!organizationId) {
    throw new Error("Missing organization id");
  }

  if (!name) {
    throw new Error("Organization name is required");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default async function AdminOrganizationsPage() {
  await requirePlatformOwner();
  const supabase = createAdminClient();

  const [
    { data: organizations, error: organizationsError },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("organization_members").select("organization_id"),
  ]);

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const memberCountMap = new Map<string, number>();
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    memberCountMap.set(
      membership.organization_id,
      (memberCountMap.get(membership.organization_id) ?? 0) + 1
    );
  }

  const rows = ((organizations ?? []) as OrganizationRow[]).map((organization) => ({
    ...organization,
    memberCount: memberCountMap.get(organization.id) ?? 0,
  }));

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Organizations
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Company management
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Review companies on the platform, update company names, and move
            into deeper organization controls.
          </p>
        </div>

        <div className="divide-y divide-zinc-200">
          {rows.map((organization) => (
            <div
              key={organization.id}
              className="grid gap-6 px-8 py-6 lg:grid-cols-[1.3fr_220px_180px]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Company
                </p>
                <form action={updateOrganizationName} className="mt-3 space-y-3">
                  <input
                    type="hidden"
                    name="organizationId"
                    value={organization.id}
                  />
                  <input
                    type="text"
                    name="name"
                    defaultValue={organization.name}
                    className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-slate-950 outline-none"
                  />

                  <div className="flex items-center gap-3">
                    <button
                      type="submit"
                      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Save name
                    </button>

                    <Link
                      href="/admin/users"
                      className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                    >
                      View users
                    </Link>
                  </div>
                </form>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Members
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-950">
                  {organization.memberCount}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Created
                </p>
                <p className="mt-3 text-sm text-slate-600">
                  {formatDate(organization.created_at)}
                </p>
                <p className="mt-3 break-all text-xs text-slate-400">
                  {organization.id}
                </p>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="px-8 py-10 text-sm text-slate-500">
              No organizations found.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
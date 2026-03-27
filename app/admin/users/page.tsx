import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

const FIXED_OWNER_EMAIL = "lukasz.gorlowski@gmail.com" as const;

type ProfileRow = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  platform_role: string | null;
  created_at: string;
};

type MembershipRow = {
  id: string;
  user_id: string;
  organization_id: string;
  role: "admin" | "engineer" | "viewer";
};

const allowedOrganizationRoles = ["admin", "engineer", "viewer"] as const;

async function updateOrganizationRole(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const membershipId = String(formData.get("membershipId") ?? "");
  const organizationRole = String(formData.get("organizationRole") ?? "");

  if (!membershipId) {
    throw new Error("Missing membership id");
  }

  if (
    !allowedOrganizationRoles.includes(
      organizationRole as (typeof allowedOrganizationRoles)[number]
    )
  ) {
    throw new Error("Invalid organization role");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_members")
    .update({
      role: organizationRole,
    })
    .eq("id", membershipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
}

async function removeFromCompany(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const membershipId = String(formData.get("membershipId") ?? "");
  const email = String(formData.get("email") ?? "");

  if (!membershipId) {
    throw new Error("Missing membership id");
  }

  if (email === FIXED_OWNER_EMAIL) {
    throw new Error("The fixed platform owner cannot be removed here.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", membershipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/organizations");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function AdminUsersPage() {
  const { userId: currentUserId } = await requirePlatformOwner();
  const supabase = createAdminClient();

  const [
    { data: profiles, error: profilesError },
    { data: memberships, error: membershipsError },
    { data: organizations, error: organizationsError },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, email, full_name, company, platform_role, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("organization_members")
      .select("id, user_id, organization_id, role"),
    supabase
      .from("organizations")
      .select("id, name"),
  ]);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  const membershipMap = new Map<string, MembershipRow>();
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    membershipMap.set(membership.user_id, membership);
  }

  const organizationNameMap = new Map<string, string>();
  for (const organization of (organizations ?? []) as Array<{ id: string; name: string }>) {
    organizationNameMap.set(organization.id, organization.name);
  }

  const rows = ((profiles ?? []) as ProfileRow[]).map((profile) => {
    const membership = membershipMap.get(profile.user_id);

    return {
      ...profile,
      membership_id: membership?.id ?? null,
      organization_id: membership?.organization_id ?? null,
      organization_name: membership?.organization_id
        ? organizationNameMap.get(membership.organization_id) ?? membership.organization_id
        : null,
      organization_role: membership?.role ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Users
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            User management
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Manage company users and their organization roles. Platform owner
            access is fixed and is not editable here.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-[#fafaf9]">
              <tr className="text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                <th className="px-8 py-4">User</th>
                <th className="px-8 py-4">Company</th>
                <th className="px-8 py-4">Organization</th>
                <th className="px-8 py-4">Company role</th>
                <th className="px-8 py-4">Access</th>
                <th className="px-8 py-4">Created</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-200">
              {rows.map((row) => {
                const isCurrentUser = row.user_id === currentUserId;
                const isFixedOwner = row.email === FIXED_OWNER_EMAIL;

                return (
                  <tr key={row.user_id} className="align-top">
                    <td className="px-8 py-6">
                      <div>
                        <p className="text-base font-semibold text-slate-950">
                          {row.full_name || "Unnamed user"}
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          {row.email || "No email"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {isCurrentUser ? (
                            <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                              You
                            </span>
                          ) : null}

                          {isFixedOwner ? (
                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                              Platform owner
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-8 py-6 text-sm text-slate-700">
                      {row.company || "—"}
                    </td>

                    <td className="px-8 py-6 text-sm text-slate-700">
                      {row.organization_name || "—"}
                    </td>

                    <td className="px-8 py-6">
                      {row.membership_id ? (
                        <form action={updateOrganizationRole} className="space-y-3">
                          <input
                            type="hidden"
                            name="membershipId"
                            value={row.membership_id}
                          />

                          <select
                            name="organizationRole"
                            defaultValue={row.organization_role ?? "viewer"}
                            className="min-w-[190px] rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none"
                          >
                            <option value="admin">Admin</option>
                            <option value="engineer">Engineer</option>
                            <option value="viewer">Viewer</option>
                          </select>

                          <div className="flex items-center gap-3">
                            <button
                              type="submit"
                              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                            >
                              Save role
                            </button>
                            <span className="text-xs text-slate-500">
                              Current: {row.organization_role ?? "none"}
                            </span>
                          </div>
                        </form>
                      ) : (
                        <span className="text-sm text-slate-400">
                          No company membership
                        </span>
                      )}
                    </td>

                    <td className="px-8 py-6">
                      {row.membership_id && !isFixedOwner ? (
                        <form action={removeFromCompany} className="space-y-3">
                          <input
                            type="hidden"
                            name="membershipId"
                            value={row.membership_id}
                          />
                          <input type="hidden" name="email" value={row.email ?? ""} />

                          <button
                            type="submit"
                            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                          >
                            Remove from company
                          </button>
                        </form>
                      ) : (
                        <span className="text-sm text-slate-400">
                          {isFixedOwner ? "Owner is managed separately" : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-8 py-6 text-sm text-slate-500">
                      {formatDate(row.created_at)}
                    </td>
                  </tr>
                );
              })}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-8 py-10 text-center text-sm text-slate-500"
                  >
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
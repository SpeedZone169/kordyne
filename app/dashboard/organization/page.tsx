import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import OrganizationSettingsForm from "./OrganizationSettingsForm";
import OrganizationInviteForm from "./OrganizationInviteForm";
import PendingInvitesList from "./PendingInvitesList";

type OrgMemberRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  organization_plan: string | null;
  organization_seat_limit: number | null;
  member_user_id: string;
  member_role: string;
  full_name: string | null;
  email: string | null;
  joined_at: string | null;
};

type PendingInviteRow = {
  id: string;
  token: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

export default async function OrganizationPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");

  const {
    data: membersData,
    error: membersError,
  } = await supabase.rpc("get_current_org_members");

  const members = (membersData || []) as OrgMemberRow[];
  const organization = members[0] || null;
  const isAdmin = orgRole === "admin";

  const {
    data: pendingInvitesData,
    error: pendingInvitesError,
  } = organization && isAdmin
    ? await supabase
        .from("organization_invites")
        .select("id, token, email, role, status, created_at")
        .eq("organization_id", organization.organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
    : { data: [] as PendingInviteRow[], error: null };

  const pendingInvites = (pendingInvitesData || []) as PendingInviteRow[];

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div>
          <h1 className="text-4xl font-bold">Organization</h1>
          <p className="mt-4 text-gray-600">
            {isAdmin
              ? "Manage your organization details and team members."
              : "View your organization details and team members."}
          </p>
        </div>

        {membersError ? (
          <p className="mt-8 text-sm text-red-600">
            Failed to load organization details.
          </p>
        ) : null}

        {!organization && !membersError ? (
          <p className="mt-8 text-sm text-gray-600">
            No organization found for your account.
          </p>
        ) : null}

        {organization ? (
          <>
            <div className={`mt-10 grid gap-6 ${isAdmin ? "md:grid-cols-2" : ""}`}>
              <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Organization Details</h2>

                <div className="mt-6 grid gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Organization Name</p>
                    <p className="font-medium text-gray-900">
                      {organization.organization_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Slug</p>
                    <p className="font-medium text-gray-900">
                      {organization.organization_slug || "-"}
                    </p>
                  </div>

                  <div>
                    <p className="text-gray-500">Your Role</p>
                    <p className="font-medium text-gray-900">
                      {orgRole || "-"}
                    </p>
                  </div>

                  {isAdmin ? (
                    <>
                      <div>
                        <p className="text-gray-500">Plan</p>
                        <p className="font-medium text-gray-900">
                          {organization.organization_plan || "starter"}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Seat Limit</p>
                        <p className="font-medium text-gray-900">
                          {organization.organization_seat_limit ?? 5}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Member Count</p>
                        <p className="font-medium text-gray-900">
                          {members.length}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Pending Invites</p>
                        <p className="font-medium text-gray-900">
                          {pendingInvites.length}
                        </p>
                      </div>

                      <div>
                        <p className="text-gray-500">Seats Used</p>
                        <p className="font-medium text-gray-900">
                          {members.length + pendingInvites.length}
                        </p>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {isAdmin ? (
                <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Settings</h2>

                  <div className="mt-6">
                    <OrganizationSettingsForm
                      organizationId={organization.organization_id}
                      initialName={organization.organization_name}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {isAdmin ? (
              <div className="mt-8 grid gap-6 xl:grid-cols-2">
                <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Invite Member</h2>

                  <div className="mt-6">
                    <OrganizationInviteForm
                      organizationId={organization.organization_id}
                      seatLimit={organization.organization_seat_limit ?? 5}
                      activeMemberCount={members.length}
                      pendingInviteCount={pendingInvites.length}
                      isAdmin={isAdmin}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Pending Invites</h2>

                  {pendingInvitesError ? (
                    <p className="mt-4 text-sm text-red-600">
                      Failed to load pending invites.
                    </p>
                  ) : (
                    <PendingInvitesList
                      invites={pendingInvites}
                      isAdmin={isAdmin}
                    />
                  )}
                </div>
              </div>
            ) : null}

            <div className="mt-8 rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Team Members</h2>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 font-medium">Name</th>
                      <th className="px-6 py-4 font-medium">Email</th>
                      <th className="px-6 py-4 font-medium">Role</th>
                      <th className="px-6 py-4 font-medium">Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((member) => (
                      <tr
                        key={member.member_user_id}
                        className="border-t border-gray-200"
                      >
                        <td className="px-6 py-4">
                          {member.full_name || "-"}
                        </td>
                        <td className="px-6 py-4">{member.email || "-"}</td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                              member.member_role
                            )}`}
                          >
                            {member.member_role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {formatDate(member.joined_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <Footer />
    </main>
  );
}
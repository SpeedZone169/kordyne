import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PartRow = {
  id: string;
  part_family_id: string | null;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
  plan: string | null;
};

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
      return "You can manage organization settings, invites, parts, revisions, files, and service workflows.";
    case "engineer":
      return "You can create and update parts, revisions, files, and service requests.";
    case "viewer":
      return "You have read-only access to the vault and service request visibility.";
    default:
      return "Your workspace access is being determined.";
  }
}

function SnapshotCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-gray-900">{value}</p>
      <p className="mt-2 text-sm text-gray-600">{helper}</p>
    </div>
  );
}

function ActionCard({
  title,
  description,
  href,
  primary = false,
}: {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-3xl border p-6 shadow-sm transition ${
        primary
          ? "border-gray-900 bg-gray-900 text-white hover:opacity-95"
          : "border-gray-200 bg-white text-gray-900 hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p
            className={`mt-2 text-sm ${
              primary ? "text-gray-200" : "text-gray-600"
            }`}
          >
            {description}
          </p>
        </div>

        <span
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg ${
            primary
              ? "border-white/20 text-white"
              : "border-gray-300 text-gray-700"
          }`}
        >
          →
        </span>
      </div>
    </Link>
  );
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

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  const typedMembership = membership as MembershipRow | null;
  const organizationId = typedMembership?.organization_id || null;

  const { data: organization } = organizationId
    ? await supabase
        .from("organizations")
        .select("id, name, plan")
        .eq("id", organizationId)
        .maybeSingle()
    : { data: null };

  const typedOrganization = organization as OrganizationRow | null;

  const { data: parts } = organizationId
    ? await supabase
        .from("parts")
        .select("id, part_family_id")
        .eq("organization_id", organizationId)
    : { data: [] as PartRow[] };

  const { count: memberCount } = organizationId
    ? await supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : { count: 0 };

  const { count: serviceRequestCount } = organizationId
    ? await supabase
        .from("service_requests")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
    : { count: 0 };

  const partRows = (parts as PartRow[] | null) ?? [];
  const familyCount = new Set(
    partRows.map((part) => part.part_family_id).filter(Boolean)
  ).size;
  const revisionCount = partRows.length;

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm lg:p-8">
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Workspace
            </p>

            <h1 className="mt-2 text-4xl font-bold text-gray-900">Dashboard</h1>

            <p className="mt-4 max-w-4xl text-gray-600">
              Welcome to your Kordyne workspace. This is your high-level view
              across part families, revision-controlled records, and service
              requests for engineering and manufacturing workflows.
            </p>

            <p className="mt-2 text-sm text-gray-500">
              Signed in as {user.email}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                  orgRole
                )}`}
              >
                {orgRole || "unknown"}
              </span>

              {typedOrganization?.name ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  {typedOrganization.name}
                </span>
              ) : null}

              {typedOrganization?.plan ? (
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                  Plan {typedOrganization.plan}
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-sm text-gray-600">
              {getRoleDescription(orgRole)}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <ActionCard
          title="Open Parts Vault"
          description="Browse your family-based parts library, revisions, and attached vault files."
          href="/dashboard/parts"
          primary
        />
        <ActionCard
          title="Service Requests"
          description="Manage manufacturing, CAD, and optimization requests as their own operational workspace."
          href="/dashboard/requests"
        />
        <ActionCard
          title="View Organization"
          description="Manage members, roles, invitations, and organization settings."
          href="/dashboard/organization"
        />
        <ActionCard
          title="Operational Insights"
          description="Review request activity, queue health, turnaround, and quoted value on a dedicated page."
          href="/dashboard/insights"
        />
      </section>

      <section>
        <div className="mb-5">
          <h2 className="text-2xl font-semibold text-gray-900">
            Workspace snapshot
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            A quick view of your current organization workspace.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SnapshotCard
            label="Part families"
            value={familyCount.toString()}
            helper="Logical parts grouped across revision history."
          />
          <SnapshotCard
            label="Revisions"
            value={revisionCount.toString()}
            helper="Total revision-controlled records stored in the vault."
          />
          <SnapshotCard
            label="Service requests"
            value={(serviceRequestCount ?? 0).toString()}
            helper="Operational requests across engineering and manufacturing workflows."
          />
          <SnapshotCard
            label="Members"
            value={(memberCount ?? 0).toString()}
            helper="Organization users with workspace access."
          />
        </div>
      </section>
    </div>
  );
}
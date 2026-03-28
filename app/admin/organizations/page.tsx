import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  plan: string;
  seat_limit: number;
};

type MembershipRow = {
  organization_id: string;
};

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function createCustomerOrganization(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "starter").trim();
  const seatLimitRaw = String(formData.get("seatLimit") ?? "5").trim();
  const seatLimit = Number(seatLimitRaw);

  if (!name) {
    throw new Error("Company name is required.");
  }

  if (!Number.isFinite(seatLimit) || seatLimit < 1) {
    throw new Error("Seat limit must be at least 1.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("organizations").insert({
    name,
    slug: slugify(name) || null,
    plan: plan || "starter",
    seat_limit: seatLimit,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/stats");
}

async function updateOrganizationSettings(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const organizationId = String(formData.get("organizationId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "starter").trim();
  const seatLimitRaw = String(formData.get("seatLimit") ?? "5").trim();
  const seatLimit = Number(seatLimitRaw);

  if (!organizationId) {
    throw new Error("Missing organization id.");
  }

  if (!name) {
    throw new Error("Organization name is required.");
  }

  if (!Number.isFinite(seatLimit) || seatLimit < 1) {
    throw new Error("Seat limit must be at least 1.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      plan,
      seat_limit: seatLimit,
    })
    .eq("id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/users");
  revalidatePath("/admin/stats");
}

async function sendCompanyAdminInvite(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const organizationId = String(formData.get("organizationId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!organizationId || !email) {
    throw new Error("Organization and email are required.");
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""}/api/admin/organizations/${organizationId}/invite`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, fullName }),
      cache: "no-store",
    }
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error || "Failed to send company admin invite.");
  }

  revalidatePath("/admin/organizations");
}

async function deleteOrganization(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const organizationId = String(formData.get("organizationId") ?? "");

  if (!organizationId) {
    throw new Error("Missing organization id.");
  }

  const supabase = createAdminClient();

  const [
    { count: memberCount, error: memberError },
    { count: requestCount, error: requestError },
    { count: customerRelationshipCount, error: customerRelationshipError },
    { count: providerRelationshipCount, error: providerRelationshipError },
    { count: quoteRoundCount, error: quoteRoundError },
  ] = await Promise.all([
    supabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("service_requests")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("provider_relationships")
      .select("*", { count: "exact", head: true })
      .eq("customer_org_id", organizationId),
    supabase
      .from("provider_relationships")
      .select("*", { count: "exact", head: true })
      .eq("provider_org_id", organizationId),
    supabase
      .from("provider_quote_rounds")
      .select("*", { count: "exact", head: true })
      .eq("customer_org_id", organizationId),
  ]);

  const firstError =
    memberError ||
    requestError ||
    customerRelationshipError ||
    providerRelationshipError ||
    quoteRoundError;

  if (firstError) {
    throw new Error(firstError.message);
  }

  if (
    (memberCount ?? 0) > 0 ||
    (requestCount ?? 0) > 0 ||
    (customerRelationshipCount ?? 0) > 0 ||
    (providerRelationshipCount ?? 0) > 0 ||
    (quoteRoundCount ?? 0) > 0
  ) {
    throw new Error(
      "Organization still has related users, requests, provider links, or quote rounds. Remove those first before deleting the organization."
    );
  }

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/organizations");
  revalidatePath("/admin/providers");
  revalidatePath("/admin/stats");
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
    { data: invites, error: invitesError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, created_at, plan, seat_limit")
      .order("created_at", { ascending: false }),
    supabase.from("organization_members").select("organization_id"),
    supabase
      .from("organization_invites")
      .select("id, organization_id, email, role, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  if (invitesError) {
    throw new Error(invitesError.message);
  }

  const memberCountMap = new Map<string, number>();
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    memberCountMap.set(
      membership.organization_id,
      (memberCountMap.get(membership.organization_id) ?? 0) + 1
    );
  }

  const pendingInviteMap = new Map<string, InviteRow[]>();
  for (const invite of (invites ?? []) as InviteRow[]) {
    const current = pendingInviteMap.get(invite.organization_id) ?? [];
    current.push(invite);
    pendingInviteMap.set(invite.organization_id, current);
  }

  const rows = ((organizations ?? []) as OrganizationRow[]).map((organization) => {
    const orgInvites = pendingInviteMap.get(organization.id) ?? [];
    const memberCount = memberCountMap.get(organization.id) ?? 0;

    return {
      ...organization,
      memberCount,
      pendingInvites: orgInvites,
      onboardingState: memberCount > 0
        ? "Active"
        : orgInvites.length > 0
        ? "Invite sent"
        : "Prepared / invite pending",
    };
  });

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Customer onboarding
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Create customer company
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create the company record first, assign a placeholder plan, then send the first admin invite.
          </p>

          <form action={createCustomerOrganization} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Company name
              </label>
              <input
                type="text"
                name="name"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                placeholder="Acme Engineering"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Placeholder plan
              </label>
              <select
                name="plan"
                defaultValue="starter"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="starter">starter</option>
                <option value="growth">growth</option>
                <option value="enterprise">enterprise</option>
                <option value="custom">custom</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Seat limit
              </label>
              <input
                type="number"
                name="seatLimit"
                min={1}
                defaultValue={5}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                required
              />
            </div>

            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create company
            </button>
          </form>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Invite flow
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Customer admin onboarding
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Customers do not self-sign up yet.</p>
            <p>You create the company here, select the placeholder plan, then invite the first company admin.</p>
            <p>The invited person accepts through the invite link and becomes the org admin.</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Customer signup placeholder
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Public contact page
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Organizations
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Customer companies
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Update company details, placeholder plan, and send the first company admin invite.
          </p>
        </div>

        <div className="divide-y divide-zinc-200">
          {rows.map((organization) => (
            <div
              key={organization.id}
              className="grid gap-6 px-8 py-6 lg:grid-cols-[1.35fr_280px_280px]"
            >
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Company
                  </p>
                  <form action={updateOrganizationSettings} className="mt-3 space-y-3">
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

                    <div className="grid gap-3 lg:grid-cols-2">
                      <select
                        name="plan"
                        defaultValue={organization.plan}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      >
                        <option value="starter">starter</option>
                        <option value="growth">growth</option>
                        <option value="enterprise">enterprise</option>
                        <option value="custom">custom</option>
                      </select>

                      <input
                        type="number"
                        name="seatLimit"
                        min={1}
                        defaultValue={organization.seat_limit}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="submit"
                        className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Save company
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
                    Send first admin invite
                  </p>
                  <form action={sendCompanyAdminInvite} className="mt-3 space-y-3">
                    <input
                      type="hidden"
                      name="organizationId"
                      value={organization.id}
                    />

                    <input
                      type="text"
                      name="fullName"
                      placeholder="Company admin name"
                      className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-slate-950 outline-none"
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="admin@company.com"
                      className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-slate-950 outline-none"
                      required
                    />

                    <button
                      type="submit"
                      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Send admin invite
                    </button>
                  </form>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Onboarding
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>State: {organization.onboardingState}</p>
                  <p>Members: {organization.memberCount}</p>
                  <p>Plan: {organization.plan}</p>
                  <p>Seat limit: {organization.seat_limit}</p>
                  <p>Created: {formatDate(organization.created_at)}</p>
                  <p>Slug: {organization.slug || "—"}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pending invites
                  </p>
                  <div className="mt-3 space-y-2">
                    {organization.pendingInvites.length > 0 ? (
                      organization.pendingInvites.map((invite) => (
                        <div
                          key={invite.id}
                          className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] px-4 py-3"
                        >
                          <p className="text-sm font-medium text-slate-950">
                            {invite.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {invite.role} · {invite.status}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">
                        No pending invites.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Delete
                </p>
                <form action={deleteOrganization} className="mt-3 space-y-3">
                  <input
                    type="hidden"
                    name="organizationId"
                    value={organization.id}
                  />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Delete organization
                  </button>
                </form>

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
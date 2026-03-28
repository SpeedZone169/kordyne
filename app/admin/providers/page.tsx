import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  plan: string;
  seat_limit: number;
  created_at: string;
};

type ProviderRelationshipRow = {
  id: string;
  customer_org_id: string;
  provider_org_id: string;
  relationship_status: string;
  trust_status: string;
  is_preferred: boolean;
  nda_required: boolean;
  quality_review_required: boolean;
  commercial_terms_summary: string | null;
  internal_notes: string | null;
  provider_code: string | null;
  created_at: string;
  updated_at: string;
};

type InviteRow = {
  id: string;
  organization_id: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

type MembershipRow = {
  organization_id: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function createProviderOrganizationAndLink(formData: FormData) {
  "use server";

  const { userId } = await requirePlatformOwner();

  const customerOrgId = String(formData.get("customerOrgId") ?? "");
  const providerName = String(formData.get("providerName") ?? "").trim();
  const providerSlugRaw = String(formData.get("providerSlug") ?? "").trim();
  const providerCode = String(formData.get("providerCode") ?? "").trim();

  if (!customerOrgId) {
    throw new Error("Customer organization is required.");
  }

  if (!providerName) {
    throw new Error("Provider name is required.");
  }

  const providerSlug = providerSlugRaw
    ? slugify(providerSlugRaw)
    : slugify(providerName);

  const supabase = createAdminClient();

  const { data: providerOrg, error: providerOrgError } = await supabase
    .from("organizations")
    .insert({
      name: providerName,
      slug: providerSlug || null,
    })
    .select("id")
    .single();

  if (providerOrgError || !providerOrg) {
    throw new Error(
      providerOrgError?.message || "Failed to create provider organization."
    );
  }

  const { error: relationshipError } = await supabase
    .from("provider_relationships")
    .insert({
      customer_org_id: customerOrgId,
      provider_org_id: providerOrg.id,
      relationship_status: "invited",
      trust_status: "pending_review",
      provider_code: providerCode || null,
      created_by_user_id: userId,
    });

  if (relationshipError) {
    throw new Error(relationshipError.message);
  }

  revalidatePath("/admin/providers");
  revalidatePath("/admin/organizations");
}

async function linkExistingProvider(formData: FormData) {
  "use server";

  const { userId } = await requirePlatformOwner();

  const customerOrgId = String(formData.get("customerOrgId") ?? "");
  const providerOrgId = String(formData.get("providerOrgId") ?? "");
  const providerCode = String(formData.get("providerCode") ?? "").trim();

  if (!customerOrgId || !providerOrgId) {
    throw new Error(
      "Customer organization and provider organization are required."
    );
  }

  if (customerOrgId === providerOrgId) {
    throw new Error("Customer and provider organization cannot be the same.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("provider_relationships")
    .insert({
      customer_org_id: customerOrgId,
      provider_org_id: providerOrgId,
      relationship_status: "invited",
      trust_status: "pending_review",
      provider_code: providerCode || null,
      created_by_user_id: userId,
    });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/providers");
}

async function sendProviderAdminInvite(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const providerOrgId = String(formData.get("providerOrgId") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!providerOrgId || !email) {
    throw new Error("Provider organization and email are required.");
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!siteUrl) {
    throw new Error(
      "Set NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_APP_URL to send provider invites from admin."
    );
  }

  const response = await fetch(
    `${siteUrl}/api/admin/providers/${providerOrgId}/invite`,
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
    throw new Error(payload?.error || "Failed to send provider invite.");
  }

  revalidatePath("/admin/providers");
}

async function updateRelationshipStatus(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const relationshipId = String(formData.get("relationshipId") ?? "");
  const relationshipStatus = String(formData.get("relationshipStatus") ?? "");

  if (!relationshipId || !relationshipStatus) {
    throw new Error("Missing relationship status update payload.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("provider_relationships")
    .update({
      relationship_status: relationshipStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/providers");
}

async function deleteRelationship(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const relationshipId = String(formData.get("relationshipId") ?? "");

  if (!relationshipId) {
    throw new Error("Missing relationship id.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("provider_relationships")
    .delete()
    .eq("id", relationshipId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/providers");
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default async function AdminProvidersPage() {
  await requirePlatformOwner();
  const supabase = createAdminClient();

  const [
    { data: relationships, error: relationshipsError },
    { data: organizations, error: organizationsError },
    { data: invites, error: invitesError },
    { data: memberships, error: membershipsError },
  ] = await Promise.all([
    supabase
      .from("provider_relationships")
      .select(
        `
          id,
          customer_org_id,
          provider_org_id,
          relationship_status,
          trust_status,
          is_preferred,
          nda_required,
          quality_review_required,
          commercial_terms_summary,
          internal_notes,
          provider_code,
          created_at,
          updated_at
        `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("organizations")
      .select("id, name, slug, plan, seat_limit, created_at")
      .order("name", { ascending: true }),
    supabase
      .from("organization_invites")
      .select("id, organization_id, email, role, status, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.from("organization_members").select("organization_id"),
  ]);

  if (relationshipsError) {
    throw new Error(relationshipsError.message);
  }

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (invitesError) {
    throw new Error(invitesError.message);
  }

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const orgs = (organizations ?? []) as OrganizationRow[];

  const orgMap = new Map<string, OrganizationRow>();
  for (const org of orgs) {
    orgMap.set(org.id, org);
  }

  const inviteMap = new Map<string, InviteRow[]>();
  for (const invite of (invites ?? []) as InviteRow[]) {
    const current = inviteMap.get(invite.organization_id) ?? [];
    current.push(invite);
    inviteMap.set(invite.organization_id, current);
  }

  const memberCountMap = new Map<string, number>();
  for (const membership of (memberships ?? []) as MembershipRow[]) {
    memberCountMap.set(
      membership.organization_id,
      (memberCountMap.get(membership.organization_id) ?? 0) + 1
    );
  }

  const rows = ((relationships ?? []) as ProviderRelationshipRow[]).map(
    (relationship) => {
      const providerOrg = orgMap.get(relationship.provider_org_id);
      const pendingInvites = inviteMap.get(relationship.provider_org_id) ?? [];
      const providerMemberCount =
        memberCountMap.get(relationship.provider_org_id) ?? 0;

      return {
        ...relationship,
        customer_org_name:
          orgMap.get(relationship.customer_org_id)?.name ??
          relationship.customer_org_id,
        provider_org_name:
          providerOrg?.name ?? relationship.provider_org_id,
        provider_org_slug: providerOrg?.slug ?? null,
        providerMemberCount,
        pendingInvites,
        onboardingState:
          providerMemberCount > 0
            ? "Active"
            : pendingInvites.length > 0
            ? "Invite sent"
            : "Prepared / invite pending",
      };
    }
  );

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Provider onboarding
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Create provider record
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create the provider organization, link it to a customer, then send
            the provider admin invite.
          </p>

          <form
            action={createProviderOrganizationAndLink}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Customer organization
              </label>
              <select
                name="customerOrgId"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  Select customer organization
                </option>
                {orgs.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Provider name
              </label>
              <input
                type="text"
                name="providerName"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                placeholder="Acme Precision"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Provider slug
              </label>
              <input
                type="text"
                name="providerSlug"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                placeholder="acme-precision"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Provider code
              </label>
              <input
                type="text"
                name="providerCode"
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                placeholder="TP-002"
              />
            </div>

            <button
              type="submit"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Create provider record
            </button>
          </form>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Invite-only access
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Provider onboarding rules
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Providers should not self-sign up.</p>
            <p>
              They should only join when you send an invite link, or after they
              contact you and you decide to invite them.
            </p>
            <p>
              Use the forms below each provider relationship to send the first
              provider admin invite.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/providers/signup"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Provider signup placeholder
            </Link>
            <Link
              href="/providers"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Provider info page
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Providers
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            Provider onboarding and relationships
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Manage provider relationships, send provider admin invites, and
            track onboarding state.
          </p>
        </div>

        <div className="divide-y divide-zinc-200">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-6 px-8 py-6 lg:grid-cols-[1.15fr_1fr_1fr]"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Provider
                  </p>
                  <p className="mt-2 text-xl font-semibold text-slate-950">
                    {row.provider_org_name}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Customer: {row.customer_org_name}
                  </p>
                  {row.provider_org_slug ? (
                    <p className="mt-1 text-sm text-slate-500">
                      Slug: {row.provider_org_slug}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                    Relationship: {row.relationship_status}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                    Trust: {row.trust_status}
                  </span>
                  {row.is_preferred ? (
                    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                      Preferred
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <p>NDA required: {row.nda_required ? "Yes" : "No"}</p>
                  <p>
                    Quality review required:{" "}
                    {row.quality_review_required ? "Yes" : "No"}
                  </p>
                  <p>Provider code: {row.provider_code || "—"}</p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Onboarding
                  </p>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>State: {row.onboardingState}</p>
                    <p>Members: {row.providerMemberCount}</p>
                    <p>Pending invites: {row.pendingInvites.length}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pending invites
                  </p>
                  <div className="mt-3 space-y-2">
                    {row.pendingInvites.length > 0 ? (
                      row.pendingInvites.map((invite) => (
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

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {row.internal_notes || row.commercial_terms_summary || "No notes added."}
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Send provider admin invite
                  </p>
                  <form action={sendProviderAdminInvite} className="mt-3 space-y-3">
                    <input
                      type="hidden"
                      name="providerOrgId"
                      value={row.provider_org_id}
                    />

                    <input
                      type="text"
                      name="fullName"
                      placeholder="Provider admin name"
                      className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-slate-950 outline-none"
                    />

                    <input
                      type="email"
                      name="email"
                      placeholder="admin@provider.com"
                      className="w-full rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm text-slate-950 outline-none"
                      required
                    />

                    <button
                      type="submit"
                      className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Send provider invite
                    </button>
                  </form>
                </div>

                <form action={updateRelationshipStatus} className="space-y-3">
                  <input type="hidden" name="relationshipId" value={row.id} />
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Relationship status
                  </label>
                  <select
                    name="relationshipStatus"
                    defaultValue={row.relationship_status}
                    className="w-full rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none"
                  >
                    <option value={row.relationship_status}>
                      {row.relationship_status}
                    </option>
                    {row.relationship_status !== "invited" ? (
                      <option value="invited">invited</option>
                    ) : null}
                    {row.relationship_status !== "active" ? (
                      <option value="active">active</option>
                    ) : null}
                  </select>

                  <button
                    type="submit"
                    className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                  >
                    Save status
                  </button>
                </form>

                <form action={deleteRelationship}>
                  <input type="hidden" name="relationshipId" value={row.id} />
                  <button
                    type="submit"
                    className="rounded-full border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100"
                  >
                    Delete provider link
                  </button>
                </form>

                <div className="text-xs text-slate-400">
                  <p>Created: {formatDate(row.created_at)}</p>
                  <p className="mt-1 break-all">{row.id}</p>
                </div>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="px-8 py-10 text-sm text-slate-500">
              No provider relationships found.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
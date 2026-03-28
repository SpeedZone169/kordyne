import Link from "next/link";
import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";
import CopyInviteLinkButton from "@/components/admin/CopyInviteLinkButton";

type OrganizationRow = {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
  plan: string;
  seat_limit: number;
  billing_status: string;
  onboarding_status: string;
  plan_started_at: string | null;
  plan_ends_at: string | null;
  internal_notes: string | null;
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
  token: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://kordyne.com"
  );
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString("en-IE", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

function toDateInputValue(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

async function createCustomerOrganization(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const name = String(formData.get("name") ?? "").trim();
  const plan = String(formData.get("plan") ?? "starter").trim();
  const seatLimitRaw = String(formData.get("seatLimit") ?? "5").trim();
  const billingStatus = String(formData.get("billingStatus") ?? "pending").trim();
  const onboardingStatus = String(
    formData.get("onboardingStatus") ?? "lead"
  ).trim();
  const planStartedAt = String(formData.get("planStartedAt") ?? "").trim() || null;
  const planEndsAt = String(formData.get("planEndsAt") ?? "").trim() || null;
  const internalNotes = String(formData.get("internalNotes") ?? "").trim() || null;

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
    billing_status: billingStatus || "pending",
    onboarding_status: onboardingStatus || "lead",
    plan_started_at: planStartedAt,
    plan_ends_at: planEndsAt,
    internal_notes: internalNotes,
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
  const billingStatus = String(formData.get("billingStatus") ?? "pending").trim();
  const onboardingStatus = String(
    formData.get("onboardingStatus") ?? "lead"
  ).trim();
  const planStartedAt = String(formData.get("planStartedAt") ?? "").trim() || null;
  const planEndsAt = String(formData.get("planEndsAt") ?? "").trim() || null;
  const internalNotes = String(formData.get("internalNotes") ?? "").trim() || null;

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
      billing_status: billingStatus,
      onboarding_status: onboardingStatus,
      plan_started_at: planStartedAt,
      plan_ends_at: planEndsAt,
      internal_notes: internalNotes,
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

  const siteUrl = getSiteUrl();

  const response = await fetch(
    `${siteUrl}/api/admin/organizations/${organizationId}/invite`,
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

async function resendCompanyAdminInvite(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const inviteId = String(formData.get("inviteId") ?? "");

  if (!inviteId) {
    throw new Error("Missing invite id.");
  }

  if (!process.env.RESEND_API_KEY) {
    throw new Error("Missing RESEND_API_KEY.");
  }

  const supabase = createAdminClient();

  const { data: invite, error: inviteError } = await supabase
    .from("organization_invites")
    .select("id, organization_id, email, role, status, token")
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError || !invite) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== "pending") {
    throw new Error("Only pending invites can be resent.");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", invite.organization_id)
    .maybeSingle();

  if (organizationError || !organization) {
    throw new Error("Organization not found.");
  }

  const siteUrl = getSiteUrl();
  const inviteUrl = `${siteUrl}/invite/${invite.token}`;

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Kordyne <noreply@kordyne.com>",
    to: invite.email,
    subject: `Reminder: you're invited to administer ${organization.name} on Kordyne`,
    text: [
      `You've been invited to join ${organization.name} on Kordyne as an admin.`,
      "",
      "Kordyne is the bridge between engineering, part control, and manufacturing coordination.",
      "",
      `Learn more here: ${siteUrl}`,
      `Accept your invite here: ${inviteUrl}`,
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="margin-bottom: 16px;">Reminder: you're invited to join Kordyne</h2>
        <p>
          You've been invited to join <strong>${organization.name}</strong>
          as an <strong>admin</strong>.
        </p>
        <p>
          Kordyne is the bridge between engineering, part control, and manufacturing coordination.
        </p>
        <p style="margin: 24px 0;">
          <a
            href="${inviteUrl}"
            style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 9999px;"
          >
            Accept invite
          </a>
        </p>
        <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      </div>
    `,
  });

  if (emailError) {
    throw new Error("Invite email could not be resent.");
  }

  revalidatePath("/admin/organizations");
}

async function revokeOrganizationInvite(formData: FormData) {
  "use server";

  await requirePlatformOwner();

  const inviteId = String(formData.get("inviteId") ?? "");

  if (!inviteId) {
    throw new Error("Missing invite id.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_invites")
    .delete()
    .eq("id", inviteId)
    .eq("status", "pending");

  if (error) {
    throw new Error(error.message);
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
    { count: inviteCount, error: inviteCountError },
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
    supabase
      .from("organization_invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId),
  ]);

  const firstError =
    memberError ||
    requestError ||
    customerRelationshipError ||
    providerRelationshipError ||
    quoteRoundError ||
    inviteCountError;

  if (firstError) {
    throw new Error(firstError.message);
  }

  if (
    (memberCount ?? 0) > 0 ||
    (requestCount ?? 0) > 0 ||
    (customerRelationshipCount ?? 0) > 0 ||
    (providerRelationshipCount ?? 0) > 0 ||
    (quoteRoundCount ?? 0) > 0 ||
    (inviteCount ?? 0) > 0
  ) {
    throw new Error(
      "Organization still has related users, requests, provider links, quote rounds, or invites. Remove those first before deleting the organization."
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
      .select(
        "id, name, slug, created_at, plan, seat_limit, billing_status, onboarding_status, plan_started_at, plan_ends_at, internal_notes"
      )
      .order("created_at", { ascending: false }),
    supabase.from("organization_members").select("organization_id"),
    supabase
      .from("organization_invites")
      .select("id, organization_id, email, role, status, created_at, token")
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

  const siteUrl = getSiteUrl();

  const rows = ((organizations ?? []) as OrganizationRow[]).map((organization) => {
    const orgInvites = pendingInviteMap.get(organization.id) ?? [];
    const memberCount = memberCountMap.get(organization.id) ?? 0;

    return {
      ...organization,
      memberCount,
      pendingInvites: orgInvites,
      accessState:
        memberCount > 0
          ? "Live"
          : orgInvites.length > 0
          ? "Invite sent"
          : "Prepared",
      inviteLinks: orgInvites.map((invite) => ({
        ...invite,
        inviteUrl: `${siteUrl}/invite/${invite.token}`,
      })),
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
            Create the company record, assign plan and commercial placeholder state,
            then send the first admin invite.
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

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Plan
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
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Billing status
                </label>
                <select
                  name="billingStatus"
                  defaultValue="pending"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid</option>
                  <option value="trial">trial</option>
                  <option value="overdue">overdue</option>
                  <option value="inactive">inactive</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Onboarding status
                </label>
                <select
                  name="onboardingStatus"
                  defaultValue="lead"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                >
                  <option value="lead">lead</option>
                  <option value="contacted">contacted</option>
                  <option value="approved">approved</option>
                  <option value="invited">invited</option>
                  <option value="active">active</option>
                  <option value="paused">paused</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Plan start date
                </label>
                <input
                  type="date"
                  name="planStartedAt"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Plan end date
                </label>
                <input
                  type="date"
                  name="planEndsAt"
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Internal notes
              </label>
              <textarea
                name="internalNotes"
                rows={4}
                className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                placeholder="Commercial notes, onboarding notes, plan context..."
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
            Commercial layer
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Manual customer management
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            <p>Customers do not self-sign up yet.</p>
            <p>
              You can now track billing state, onboarding state, plan dates,
              seat limits, and internal notes directly from the owner console.
            </p>
            <p>
              This gives you a manual commercial workflow until real pricing and
              payment integration are connected later.
            </p>
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
            Update company details, commercial state, onboarding state, plan dates,
            internal notes, and manage pending admin invites.
          </p>
        </div>

        <div className="divide-y divide-zinc-200">
          {rows.map((organization) => (
            <div
              key={organization.id}
              className="grid gap-6 px-8 py-6 lg:grid-cols-[1.5fr_340px_280px]"
            >
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Company and commercial settings
                  </p>

                  <form action={updateOrganizationSettings} className="mt-3 space-y-4">
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

                    <div className="grid gap-4 lg:grid-cols-2">
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

                    <div className="grid gap-4 lg:grid-cols-2">
                      <select
                        name="billingStatus"
                        defaultValue={organization.billing_status}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      >
                        <option value="pending">pending</option>
                        <option value="paid">paid</option>
                        <option value="trial">trial</option>
                        <option value="overdue">overdue</option>
                        <option value="inactive">inactive</option>
                      </select>

                      <select
                        name="onboardingStatus"
                        defaultValue={organization.onboarding_status}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      >
                        <option value="lead">lead</option>
                        <option value="contacted">contacted</option>
                        <option value="approved">approved</option>
                        <option value="invited">invited</option>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                      </select>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <input
                        type="date"
                        name="planStartedAt"
                        defaultValue={toDateInputValue(organization.plan_started_at)}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      />

                      <input
                        type="date"
                        name="planEndsAt"
                        defaultValue={toDateInputValue(organization.plan_ends_at)}
                        className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      />
                    </div>

                    <textarea
                      name="internalNotes"
                      rows={5}
                      defaultValue={organization.internal_notes || ""}
                      className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
                      placeholder="Commercial notes, onboarding state, exceptions, follow-ups..."
                    />

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
                  Status overview
                </p>

                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Access state: {organization.accessState}</p>
                  <p>Onboarding status: {organization.onboarding_status}</p>
                  <p>Billing status: {organization.billing_status}</p>
                  <p>Members: {organization.memberCount}</p>
                  <p>Plan: {organization.plan}</p>
                  <p>Seat limit: {organization.seat_limit}</p>
                  <p>Plan starts: {formatDate(organization.plan_started_at)}</p>
                  <p>Plan ends: {formatDate(organization.plan_ends_at)}</p>
                  <p>Created: {formatDate(organization.created_at)}</p>
                  <p>Slug: {organization.slug || "—"}</p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Internal notes
                  </p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                    {organization.internal_notes || "No internal notes added."}
                  </p>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Pending invites
                  </p>

                  <div className="mt-3 space-y-3">
                    {organization.inviteLinks.length > 0 ? (
                      organization.inviteLinks.map((invite) => (
                        <div
                          key={invite.id}
                          className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
                        >
                          <p className="text-sm font-medium text-slate-950">
                            {invite.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {invite.role} · {invite.status} · {formatDate(invite.created_at)}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={invite.inviteUrl}
                              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-zinc-50"
                            >
                              Open invite
                            </Link>

                            <CopyInviteLinkButton inviteUrl={invite.inviteUrl} />

                            <form action={resendCompanyAdminInvite}>
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <button
                                type="submit"
                                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-zinc-50"
                              >
                                Resend
                              </button>
                            </form>

                            <form action={revokeOrganizationInvite}>
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <button
                                type="submit"
                                className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100"
                              >
                                Revoke
                              </button>
                            </form>
                          </div>
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
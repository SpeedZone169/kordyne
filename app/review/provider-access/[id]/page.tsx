import Image from "next/image";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requirePlatformOwner } from "@/lib/auth/platform-owner";
import {
  isSkippedWorkflowEmailResult,
  sendWorkflowEmail,
} from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

type ProviderAccessRequest = {
  id: string;
  full_name: string;
  email: string;
  company: string;
  website: string | null;
  country: string;
  capabilities: string;
  certifications: string | null;
  message: string;
  status: "pending" | "approved" | "rejected";
  review_notes: string | null;
  reviewed_at: string | null;
  provider_organization_id: string | null;
  provider_invite_id: string | null;
  notification_sent_at: string | null;
  notification_error: string | null;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
};

type InvitationRow = {
  token: string;
  status: string;
};

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    state?: string;
    email?: string;
    error?: string;
  }>;
};

function readField(formData: FormData, name: string, maxLength = 1000) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}

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
    "https://www.kordyne.com"
  ).replace(/\/+$/, "");
}

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function reviewPath(requestId: string) {
  return `/review/provider-access/${requestId}`;
}

function redirectWithError(requestId: string, message: string): never {
  redirect(
    `${reviewPath(requestId)}?error=${encodeURIComponent(message)}`,
  );
}

async function approveProviderAccessRequest(formData: FormData) {
  "use server";

  const requestId = readField(formData, "requestId", 80);

  if (!requestId) {
    redirect("/admin/provider-access-requests");
  }

  const { userId } = await requirePlatformOwner(reviewPath(requestId));
  const customerOrgId = readField(formData, "customerOrgId", 80);
  const fullName = readField(formData, "fullName", 120);
  const email = readField(formData, "email", 180).toLowerCase();
  const company = readField(formData, "company", 160);
  const website = readField(formData, "website", 240);
  const country = readField(formData, "country", 120);
  const capabilities = readField(formData, "capabilities", 500);
  const certifications = readField(formData, "certifications", 500);
  const message = readField(formData, "message", 3000);
  const providerSlug = slugify(readField(formData, "providerSlug", 100));
  const providerCode = readField(formData, "providerCode", 100);
  const reviewNotes = readField(formData, "reviewNotes", 2000);

  if (
    !customerOrgId ||
    !fullName ||
    !email ||
    !company ||
    !country ||
    !capabilities ||
    !message
  ) {
    redirectWithError(
      requestId,
      "Complete the required provider and customer organization fields.",
    );
  }

  const admin = createAdminClient();
  const { error: updateError } = await admin
    .from("provider_access_requests")
    .update({
      full_name: fullName,
      email,
      company,
      website: website || null,
      country,
      capabilities,
      certifications: certifications || null,
      message,
      review_notes: reviewNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending");

  if (updateError) {
    redirectWithError(requestId, updateError.message);
  }

  const { data: approvalData, error: approvalError } = await admin.rpc(
    "approve_provider_access_request",
    {
      p_request_id: requestId,
      p_customer_org_id: customerOrgId,
      p_provider_slug: providerSlug || null,
      p_provider_code: providerCode || null,
      p_reviewed_by_user_id: userId,
    },
  );

  if (approvalError || !approvalData) {
    redirectWithError(
      requestId,
      approvalError?.message || "Unable to approve the provider request.",
    );
  }

  const approval = approvalData as {
    invite_token?: string;
    invite_email?: string;
    contact_name?: string;
    provider_name?: string;
  };

  if (!approval.invite_token || !approval.invite_email) {
    redirectWithError(
      requestId,
      "The provider was approved, but the invitation could not be prepared.",
    );
  }

  const inviteUrl = `${getSiteUrl()}/invite/${approval.invite_token}`;
  const providerName = approval.provider_name || company;
  const contactName = approval.contact_name || fullName;
  let emailState = "sent";

  try {
    const emailResult = await sendWorkflowEmail({
      to: [approval.invite_email],
      subject: `You're invited to join ${providerName} on Kordyne`,
      previewText: `Accept your Kordyne provider workspace invitation for ${providerName}.`,
      eyebrow: "Provider invitation",
      headline: "Your Kordyne provider workspace is ready",
      intro: `Hello ${contactName}. Your provider access request has been approved. Accept this invitation to create or connect your account and manage ${providerName}'s Kordyne workspace.`,
      detailRows: [
        { label: "Provider", value: providerName },
        { label: "Role", value: "Provider admin" },
        { label: "Access", value: "Invite-only provider workspace" },
      ],
      primaryActionLabel: "Accept invite",
      primaryActionUrl: inviteUrl,
      secondaryActionLabel: "About Kordyne providers",
      secondaryActionUrl: `${getSiteUrl()}/providers`,
      footerNote:
        "This invitation is intended only for the email address that requested provider access. It does not expose any customer vault or manufacturing package until access is granted separately.",
    });

    if (isSkippedWorkflowEmailResult(emailResult)) {
      emailState = "not-configured";
    }
  } catch (error) {
    console.error("Approved provider invitation email failed", error);
    emailState = "failed";
  }

  revalidatePath("/admin/provider-access-requests");
  revalidatePath(reviewPath(requestId));
  redirect(
    `${reviewPath(requestId)}?state=approved&email=${encodeURIComponent(emailState)}`,
  );
}

async function rejectProviderAccessRequest(formData: FormData) {
  "use server";

  const requestId = readField(formData, "requestId", 80);

  if (!requestId) {
    redirect("/admin/provider-access-requests");
  }

  const { userId } = await requirePlatformOwner(reviewPath(requestId));
  const reviewNotes = readField(formData, "reviewNotes", 2000);
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_access_requests")
    .update({
      status: "rejected",
      review_notes: reviewNotes || null,
      reviewed_by_user_id: userId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    redirectWithError(requestId, error.message);
  }

  if (!data) {
    redirectWithError(
      requestId,
      "Only a pending provider request can be rejected.",
    );
  }

  revalidatePath("/admin/provider-access-requests");
  revalidatePath(reviewPath(requestId));
  redirect(`${reviewPath(requestId)}?state=rejected`);
}

export default async function ProviderAccessReviewPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const path = reviewPath(id);
  const { profile } = await requirePlatformOwner(path);
  const query = searchParams ? await searchParams : {};
  const admin = createAdminClient();

  const [
    { data: request, error: requestError },
    { data: organizations, error: organizationsError },
  ] = await Promise.all([
    admin
      .from("provider_access_requests")
      .select(
        "id, full_name, email, company, website, country, capabilities, certifications, message, status, review_notes, reviewed_at, provider_organization_id, provider_invite_id, notification_sent_at, notification_error, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (!request) {
    return (
      <main className="min-h-screen bg-[#eef9fb] px-6 py-16 text-[#003040]">
        <section className="mx-auto max-w-2xl rounded-2xl border border-[#c8e2e8] bg-white p-8">
          <h1 className="text-2xl font-semibold">Provider request not found</h1>
          <p className="mt-3 text-sm leading-6 text-[#526b7d]">
            This review link is invalid or the request is no longer available.
          </p>
          <Link
            href="/admin/provider-access-requests"
            className="mt-6 inline-flex rounded-lg bg-[#003040] px-5 py-3 text-sm font-semibold text-white"
          >
            Open provider requests
          </Link>
        </section>
      </main>
    );
  }

  const providerRequest = request as ProviderAccessRequest;
  const orgs = (organizations ?? []) as OrganizationRow[];
  let invitation: InvitationRow | null = null;

  if (providerRequest.provider_invite_id) {
    const { data } = await admin
      .from("organization_invites")
      .select("token, status")
      .eq("id", providerRequest.provider_invite_id)
      .maybeSingle();

    invitation = (data as InvitationRow | null) ?? null;
  }

  const inviteUrl = invitation?.token
    ? `${getSiteUrl()}/invite/${invitation.token}`
    : null;
  const suggestedSlug = slugify(
    `${providerRequest.company}-${providerRequest.id.slice(0, 8)}`,
  );
  const isPending = providerRequest.status === "pending";

  return (
    <main className="min-h-screen bg-[#eef9fb] px-4 py-8 text-[#003040] sm:px-6 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 rounded-2xl border border-[#c8e2e8] bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" aria-label="Kordyne home">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={220}
              height={48}
              className="h-9 w-auto"
              priority
            />
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-[#526b7d]">
              Signed in as {profile.full_name || profile.email}
            </span>
            <Link
              href="/admin/provider-access-requests"
              className="rounded-lg border border-[#b8d7df] px-4 py-2 font-semibold"
            >
              All provider requests
            </Link>
          </div>
        </header>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#c8e2e8] bg-white">
          <div className="border-b-4 border-[#00bdde] px-6 py-7 sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0086a0]">
                  Provider access review
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  {providerRequest.company}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-[#526b7d]">
                  Review the submitted details before creating a provider
                  organization and sending an invite. Opening this page has not
                  granted any access.
                </p>
              </div>
              <span
                className={`w-fit rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                  providerRequest.status === "approved"
                    ? "bg-emerald-100 text-emerald-800"
                    : providerRequest.status === "rejected"
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                }`}
              >
                {providerRequest.status}
              </span>
            </div>
          </div>

          {query.error ? (
            <div
              className="mx-6 mt-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800 sm:mx-8"
              role="alert"
            >
              {query.error}
            </div>
          ) : null}

          {query.state === "approved" ? (
            <div className="mx-6 mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 sm:mx-8">
              Provider approved and invitation created.{" "}
              {query.email === "sent"
                ? "The branded invitation email was sent."
                : "The invitation email was not delivered; use the secure invite link below."}
            </div>
          ) : null}

          {query.state === "rejected" ? (
            <div className="mx-6 mt-6 rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-800 sm:mx-8">
              Provider request rejected. No organization or invitation was
              created.
            </div>
          ) : null}

          <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[0.78fr_1.22fr]">
            <aside className="space-y-5">
              <div className="rounded-xl border border-[#d5e9ee] bg-[#f5fbfc] p-5">
                <h2 className="text-base font-semibold">Submission record</h2>
                <dl className="mt-4 space-y-4 text-sm">
                  <div>
                    <dt className="text-[#6a8191]">Received</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDate(providerRequest.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[#6a8191]">Notification email</dt>
                    <dd className="mt-1 font-semibold">
                      {providerRequest.notification_sent_at
                        ? `Sent ${formatDate(providerRequest.notification_sent_at)}`
                        : "Not sent"}
                    </dd>
                    {providerRequest.notification_error ? (
                      <p className="mt-1 text-xs leading-5 text-red-700">
                        {providerRequest.notification_error}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <dt className="text-[#6a8191]">Reviewed</dt>
                    <dd className="mt-1 font-semibold">
                      {formatDate(providerRequest.reviewed_at)}
                    </dd>
                  </div>
                </dl>
              </div>

              {inviteUrl ? (
                <div className="rounded-xl border border-[#d5e9ee] bg-[#f5fbfc] p-5">
                  <h2 className="text-base font-semibold">
                    Provider invitation
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#526b7d]">
                    Status: {invitation?.status || "pending"}
                  </p>
                  <a
                    href={inviteUrl}
                    className="mt-4 inline-flex rounded-lg bg-[#003040] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Open invitation
                  </a>
                  <p className="mt-3 break-all text-xs leading-5 text-[#6a8191]">
                    {inviteUrl}
                  </p>
                </div>
              ) : null}
            </aside>

            <form action={approveProviderAccessRequest} className="space-y-6">
              <input type="hidden" name="requestId" value={providerRequest.id} />

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Contact name</span>
                  <input
                    name="fullName"
                    defaultValue={providerRequest.full_name}
                    disabled={!isPending}
                    required
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Work email</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={providerRequest.email}
                    disabled={!isPending}
                    required
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Company</span>
                  <input
                    name="company"
                    defaultValue={providerRequest.company}
                    disabled={!isPending}
                    required
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Website</span>
                  <input
                    name="website"
                    defaultValue={providerRequest.website ?? ""}
                    disabled={!isPending}
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">
                    Country / region
                  </span>
                  <input
                    name="country"
                    defaultValue={providerRequest.country}
                    disabled={!isPending}
                    required
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">
                    Customer organization
                  </span>
                  <select
                    name="customerOrgId"
                    defaultValue=""
                    disabled={!isPending}
                    required
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  >
                    <option value="" disabled>
                      Select the customer relationship
                    </option>
                    {orgs.map((organization) => (
                      <option key={organization.id} value={organization.id}>
                        {organization.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">Provider slug</span>
                  <input
                    name="providerSlug"
                    defaultValue={suggestedSlug}
                    disabled={!isPending}
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold">
                    Internal provider code
                  </span>
                  <input
                    name="providerCode"
                    placeholder="Optional"
                    disabled={!isPending}
                    className="w-full rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm outline-none disabled:bg-slate-50"
                  />
                </label>
              </div>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">Capabilities</span>
                <textarea
                  name="capabilities"
                  defaultValue={providerRequest.capabilities}
                  disabled={!isPending}
                  required
                  rows={3}
                  className="w-full resize-y rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm leading-6 outline-none disabled:bg-slate-50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">Certifications</span>
                <textarea
                  name="certifications"
                  defaultValue={providerRequest.certifications ?? ""}
                  disabled={!isPending}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm leading-6 outline-none disabled:bg-slate-50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Requested Kordyne work
                </span>
                <textarea
                  name="message"
                  defaultValue={providerRequest.message}
                  disabled={!isPending}
                  required
                  rows={5}
                  className="w-full resize-y rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm leading-6 outline-none disabled:bg-slate-50"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-semibold">
                  Internal review notes
                </span>
                <textarea
                  name="reviewNotes"
                  defaultValue={providerRequest.review_notes ?? ""}
                  disabled={!isPending}
                  rows={3}
                  placeholder="Optional due-diligence or onboarding notes"
                  className="w-full resize-y rounded-lg border border-[#b8d7df] bg-white px-4 py-3 text-sm leading-6 outline-none disabled:bg-slate-50"
                />
              </label>

              {isPending ? (
                <div className="flex flex-col gap-3 border-t border-[#d5e9ee] pt-6 sm:flex-row">
                  <button
                    type="submit"
                    className="rounded-lg bg-[#00bdde] px-5 py-3 text-sm font-extrabold text-[#003040] transition hover:bg-[#00aeca]"
                  >
                    Approve and send invitation
                  </button>
                  <button
                    type="submit"
                    formAction={rejectProviderAccessRequest}
                    className="rounded-lg border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-800 transition hover:bg-red-100"
                  >
                    Reject request
                  </button>
                </div>
              ) : (
                <p className="border-t border-[#d5e9ee] pt-6 text-sm text-[#526b7d]">
                  This request has been {providerRequest.status}. Its submission
                  and review record remain available for traceability.
                </p>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

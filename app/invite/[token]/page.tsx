import Link from "next/link";
import { createClient } from "../../../lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import AcceptInviteButton from "../../dashboard/organization/AcceptInviteButton";

type PageProps = {
  params: Promise<{ token: string }>;
};

type InviteDetails = {
  organization_name: string;
  email: string;
  role: string;
  status: string;
};

type InviteMetaRow = {
  organization_id: string;
  email: string;
  role: string;
  status: string;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: inviteData, error: inviteError } = await supabase.rpc(
    "get_public_invite_details",
    {
      invite_token: token,
    }
  );

  const invite = (Array.isArray(inviteData) ? inviteData[0] : inviteData) as
    | InviteDetails
    | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!invite || inviteError) {
    return (
      <main className="min-h-screen bg-white text-gray-900">
        <Navbar />
        <section className="mx-auto max-w-3xl px-6 py-20">
          <h1 className="text-4xl font-bold">Invite not found</h1>
          <p className="mt-4 text-gray-600">
            This invite is invalid or no longer available.
          </p>
        </section>
        <Footer />
      </main>
    );
  }

  const { data: inviteMeta } = await adminSupabase
    .from("organization_invites")
    .select("organization_id, email, role, status")
    .eq("token", token)
    .maybeSingle();

  const meta = inviteMeta as InviteMetaRow | null;

  let isProviderInvite = false;

  if (meta?.organization_id) {
    const { count } = await adminSupabase
      .from("provider_relationships")
      .select("*", { count: "exact", head: true })
      .eq("provider_org_id", meta.organization_id);

    isProviderInvite = (count ?? 0) > 0;
  }

  const inviteKind = isProviderInvite ? "provider" : "customer";

  const pageTitle =
    inviteKind === "provider" ? "Provider Invite" : "Organization Invite";

  const pageIntro =
    inviteKind === "provider"
      ? "You have been invited to join a provider organization in Kordyne."
      : "You have been invited to join an organization in Kordyne.";

  const acceptCtaLabel =
    inviteKind === "provider" ? "Accept Provider Invite" : "Accept Invite";

  const acceptedLinkHref =
    inviteKind === "provider" ? "/provider" : "/dashboard";

  const acceptedLinkLabel =
    inviteKind === "provider" ? "Go to Provider Portal" : "Go to Dashboard";

  const createAccountHref = `/signup?invite=${encodeURIComponent(token)}`;
  const loginHref = `/login?next=${encodeURIComponent(`/invite/${token}`)}`;

  const isAccepted = invite.status === "accepted";
  const isPending = invite.status === "pending";

  const signedInEmail = user?.email?.trim().toLowerCase() || null;
  const invitedEmail = invite.email.trim().toLowerCase();
  const isMatchingInviteEmail = !!signedInEmail && signedInEmail === invitedEmail;

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">{pageTitle}</h1>
        <p className="mt-4 text-gray-600">{pageIntro}</p>

        <div className="mt-10 rounded-3xl border border-gray-200 p-6 shadow-sm">
          <div className="grid gap-4 text-sm">
            <div>
              <p className="text-gray-500">Organization</p>
              <p className="font-medium text-gray-900">
                {invite.organization_name}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Invited Email</p>
              <p className="font-medium text-gray-900">{invite.email}</p>
            </div>

            <div>
              <p className="text-gray-500">Role</p>
              <p className="font-medium text-gray-900">{invite.role}</p>
            </div>

            <div>
              <p className="text-gray-500">Invite Type</p>
              <p className="font-medium capitalize text-gray-900">
                {inviteKind}
              </p>
            </div>

            <div>
              <p className="text-gray-500">Status</p>
              <p className="font-medium text-gray-900">{invite.status}</p>
            </div>
          </div>

          {!user ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-gray-600">
                Sign up or log in with <strong>{invite.email}</strong> to accept
                this invite.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={createAccountHref}
                  className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Create Invited Account
                </Link>

                <Link
                  href={loginHref}
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Log In
                </Link>
              </div>

              <p className="text-xs text-gray-500">
                Invite-based account creation should stay enabled even though
                public signup is now a placeholder page.
              </p>
            </div>
          ) : null}

          {user && isPending && !isMatchingInviteEmail ? (
            <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                You are signed in as <strong>{user.email}</strong>, but this
                invite is for <strong>{invite.email}</strong>.
              </p>
              <p className="mt-2 text-sm text-amber-700">
                Please log out and sign in with the invited email address to
                accept this invite.
              </p>
            </div>
          ) : null}

          {user && isPending && isMatchingInviteEmail ? (
            <div className="mt-8 space-y-4">
              <p className="text-sm text-gray-600">
                You are signed in with the invited email and can now accept this{" "}
                {inviteKind} invite.
              </p>

              <div>
                <AcceptInviteButton inviteToken={token} />
              </div>

              <p className="text-xs text-gray-500">{acceptCtaLabel}</p>
            </div>
          ) : null}

          {user && isAccepted ? (
            <div className="mt-8">
              <p className="text-sm text-green-700">
                This invite has already been accepted.
              </p>
              <div className="mt-4">
                <Link
                  href={acceptedLinkHref}
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  {acceptedLinkLabel}
                </Link>
              </div>
            </div>
          ) : null}

          {invite.status !== "pending" && invite.status !== "accepted" ? (
            <div className="mt-8">
              <p className="text-sm text-gray-600">
                This invite is no longer available.
              </p>
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}
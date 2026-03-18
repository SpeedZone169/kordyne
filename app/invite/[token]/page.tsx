import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Navbar from "../../../components/Navbar";
import Footer from "../../../components/Footer";
import AcceptInviteButton from "../../dashboard/organization/AcceptInviteButton";

type PageProps = {
  params: Promise<{ token: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: inviteData, error: inviteError } = await supabase.rpc(
    "get_public_invite_details",
    {
      invite_token: token,
    }
  );

  const invite = Array.isArray(inviteData) ? inviteData[0] : inviteData;

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

  const isAccepted = invite.status === "accepted";
  const isPending = invite.status === "pending";

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-3xl px-6 py-20">
        <h1 className="text-4xl font-bold">Organization Invite</h1>
        <p className="mt-4 text-gray-600">
          You have been invited to join an organization in Kordyne.
        </p>

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
                  href={`/signup?invite=${token}`}
                  className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Create Account
                </Link>

                <Link
                  href={`/login`}
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Log In
                </Link>
              </div>
            </div>
          ) : null}

          {user && isPending ? (
            <div className="mt-8">
              <AcceptInviteButton inviteToken={token} />
            </div>
          ) : null}

          {user && isAccepted ? (
            <div className="mt-8">
              <p className="text-sm text-green-700">
                This invite has already been accepted.
              </p>
              <div className="mt-4">
                <Link
                  href="/dashboard/organization"
                  className="rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  Go to Organization
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <Footer />
    </main>
  );
}
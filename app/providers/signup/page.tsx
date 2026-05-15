import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import InviteSignupForm from "./InviteSignupForm";

type SignupPageProps = {
  searchParams: Promise<{
    invite?: string;
  }>;
};

type InviteDetails = {
  organization_name: string;
  email: string;
  role: string;
  status: string;
};

type InviteMetaRow = {
  organization_id: string;
};

function ProviderSignupShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-950">
      <Navbar />
      {children}
      <Footer />
    </main>
  );
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { invite } = await searchParams;

  if (!invite) {
    return (
      <ProviderSignupShell>
        <section className="relative overflow-hidden bg-[#101823] text-white">
          <div className="absolute inset-0 kordyne-grid-bg opacity-65" />
          <div className="relative mx-auto max-w-6xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e08a49]">
                Provider access
              </p>

              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white lg:text-6xl">
                Provider accounts are opened through customer-approved invites.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
                Manufacturers, consultants, and external reviewers join Kordyne
                through scoped invitations. The same sign-in page routes provider
                users into the provider workspace.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="rounded-[8px] bg-[#e08a49] px-6 py-3 text-sm font-black text-white transition hover:bg-[#c97539]"
                >
                  Request provider access
                </Link>

                <Link
                  href="/login?portal=provider&next=%2Fprovider"
                  className="rounded-[8px] border border-white/18 bg-white/10 px-6 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  Provider sign in
                </Link>
              </div>
            </div>

            <div className="rounded-[8px] border border-white/12 bg-white p-6 text-slate-900 shadow-[0_24px_70px_rgba(2,8,23,0.28)]">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
                Provider onboarding
              </p>

              <div className="mt-6 space-y-5">
                <div className="rounded-[8px] border border-zinc-200 bg-[#f5f7fa] p-5">
                  <p className="text-sm font-black text-slate-950">
                    1. Approved relationship
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A customer or Kordyne admin approves the provider
                    relationship and shared work context.
                  </p>
                </div>

                <div className="rounded-[8px] border border-zinc-200 bg-[#f5f7fa] p-5">
                  <p className="text-sm font-black text-slate-950">
                    2. Scoped invitation
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Users receive an invite tied to the provider organization,
                    package access, and allowed role.
                  </p>
                </div>

                <div className="rounded-[8px] border border-zinc-200 bg-[#f5f7fa] p-5">
                  <p className="text-sm font-black text-slate-950">
                    3. Provider workspace
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Signed-in providers land in the focused portal for packages,
                    quotes, collaboration, and returned files.
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-[8px] border border-zinc-200 bg-white p-5">
                <p className="text-sm font-black text-slate-950">
                  Already invited?
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Use the invite link from your email to complete your account.
                </p>
                <Link
                  href="/login?portal=provider&next=%2Fprovider"
                  className="mt-4 inline-flex rounded-[8px] border border-zinc-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-zinc-50"
                >
                  Go to provider login
                </Link>
              </div>
            </div>
          </div>
          </div>
        </section>
      </ProviderSignupShell>
    );
  }

  const supabase = await createClient();
  const adminSupabase = createAdminClient();

  const { data: inviteData, error: inviteError } = await supabase.rpc(
    "get_public_invite_details",
    {
      invite_token: invite,
    }
  );

  const inviteDetails = (Array.isArray(inviteData) ? inviteData[0] : inviteData) as
    | InviteDetails
    | null;

  if (!inviteDetails || inviteError) {
    return (
      <ProviderSignupShell>
        <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="rounded-[8px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Invite signup
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Invite not found
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This invite is invalid or no longer available.
            </p>
            <div className="mt-8">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#e08a49] px-6 py-3 text-sm font-black text-white transition hover:bg-[#c97539]"
              >
                Contact Kordyne
              </Link>
            </div>
          </div>
        </section>
      </ProviderSignupShell>
    );
  }

  const { data: inviteMeta } = await adminSupabase
    .from("organization_invites")
    .select("organization_id")
    .eq("token", invite)
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

  const inviteType = isProviderInvite ? "provider" : "customer";

  if (inviteDetails.status !== "pending") {
    return (
      <ProviderSignupShell>
        <section className="mx-auto max-w-4xl px-6 py-16 lg:px-10 lg:py-24">
          <div className="rounded-[8px] border border-zinc-200 bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Invite signup
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Invite not available
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              This invite is no longer pending. You may already have accepted it,
              or it may no longer be available.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/invite/${invite}`}
                className="rounded-[8px] bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                Back to invite
              </Link>
              <Link
                href="/login"
                className="rounded-[8px] border border-zinc-300 bg-white px-6 py-3 text-sm font-black text-slate-900 transition hover:bg-zinc-50"
              >
                Go to login
              </Link>
            </div>
          </div>
        </section>
      </ProviderSignupShell>
    );
  }

  return (
    <ProviderSignupShell>
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Invite-based signup
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Create your invited {inviteType} account
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
              You are creating an account for <strong>{inviteDetails.organization_name}</strong>.
              Public signup is closed, but invited users can create accounts here
              before accepting their invite.
            </p>

            <div className="mt-8 rounded-[8px] border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                Invite details
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p>Organization: {inviteDetails.organization_name}</p>
                <p>Email: {inviteDetails.email}</p>
                <p>Role: {inviteDetails.role}</p>
                <p>Invite type: {inviteType}</p>
              </div>

              <div className="mt-6">
                <Link
                  href={`/invite/${invite}`}
                  className="rounded-[8px] border border-zinc-300 bg-white px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-zinc-50"
                >
                  Back to invite
                </Link>
              </div>
            </div>
          </div>

          <InviteSignupForm
            inviteToken={invite}
            inviteEmail={inviteDetails.email}
            organizationName={inviteDetails.organization_name}
            inviteType={inviteType}
          />
        </div>
      </section>
    </ProviderSignupShell>
  );
}

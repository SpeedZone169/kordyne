import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import MarketingNav from "@/components/MarketingNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import InviteSignupForm from "./InviteSignupForm";
import ProviderAccessRequestForm from "./ProviderAccessRequestForm";
import styles from "./provider-signup.module.css";

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

export const metadata: Metadata = {
  title: "Provider access | Kordyne",
  description:
    "Request reviewed provider access or create an invited Kordyne provider account securely.",
};

function ProviderSignupShell({ children }: { children: ReactNode }) {
  return (
    <main className={`${styles.page} marketing-site`}>
      <section className={styles.hero}>
        <MarketingNav active="providers" />
        {children}

        <footer className={styles.footer}>
          <p>&copy; 2026 Kordyne. All rights reserved.</p>
          <div>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </section>
    </main>
  );
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const { invite } = await searchParams;

  if (!invite) {
    return (
      <ProviderSignupShell>
        <div className={`${styles.content} ${styles.introGrid}`}>
          <div className={styles.introCopy}>
            <p className={styles.eyebrow}>Kordyne for providers</p>
            <h1>Apply to join the Kordyne provider network.</h1>
            <p className={styles.lede}>
              Tell us about your company, capabilities, and the work you want to
              receive. Kordyne reviews each request before issuing a secure
              provider invitation.
            </p>
          </div>

          <ProviderAccessRequestForm />
        </div>
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
        <div className={`${styles.content} ${styles.stateContent}`}>
          <div className={styles.stateCard}>
            <p className={styles.eyebrow}>Invite signup</p>
            <h1>Invite not found</h1>
            <p>
              This invitation is invalid or no longer available. Request a new
              secure invite from the organization that shared work with you.
            </p>
            <Link href="/contact" className={styles.primaryButton}>
              <span>Contact Kordyne</span>
              <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
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
        <div className={`${styles.content} ${styles.stateContent}`}>
          <div className={styles.stateCard}>
            <p className={styles.eyebrow}>Invite signup</p>
            <h1>Invite not available</h1>
            <p>
              This invitation is no longer pending. It may already have been
              accepted or withdrawn by the organization that issued it.
            </p>
            <div className={styles.actions}>
              <Link href={`/invite/${invite}`} className={styles.primaryButton}>
                Back to invite
              </Link>
              <Link href="/login" className={styles.secondaryButton}>
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </ProviderSignupShell>
    );
  }

  return (
    <ProviderSignupShell>
      <div className={`${styles.content} ${styles.inviteGrid}`}>
        <div className={styles.inviteIntro}>
          <p className={styles.eyebrow}>Secure invited access</p>
          <h1>Create your {inviteType} account</h1>
          <p className={styles.lede}>
            Your account will be created for <strong>{inviteDetails.organization_name}</strong>.
            Only the invited email and approved organization context can be used.
          </p>

          <dl className={styles.inviteSummary}>
            <div>
              <dt>Organization</dt>
              <dd>{inviteDetails.organization_name}</dd>
            </div>
            <div>
              <dt>Invited email</dt>
              <dd>{inviteDetails.email}</dd>
            </div>
            <div>
              <dt>Approved role</dt>
              <dd>{inviteDetails.role}</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>{inviteType}</dd>
            </div>
          </dl>

          <Link href={`/invite/${invite}`} className={styles.textLink}>
            &larr; Back to invite
          </Link>
        </div>

        <InviteSignupForm
          inviteToken={invite}
          inviteEmail={inviteDetails.email}
          organizationName={inviteDetails.organization_name}
          inviteType={inviteType}
        />
      </div>
    </ProviderSignupShell>
  );
}

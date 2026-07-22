import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import MarketingNav from "@/components/MarketingNav";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import InviteSignupForm from "./InviteSignupForm";
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
    "Create an invited Kordyne provider account and access approved manufacturing work securely.",
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
            <h1>Join approved manufacturing work with the right context.</h1>
            <p className={styles.lede}>
              Provider access is invitation-based. Customers approve the
              organization, work package, and role before any files or project
              context are shared.
            </p>

            <div className={styles.actions}>
              <Link href="/contact" className={styles.primaryButton}>
                <span>Request provider access</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
              <Link
                href="/login?portal=provider&next=%2Fprovider"
                className={styles.secondaryButton}
              >
                <span>Provider sign in</span>
                <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          <aside className={styles.onboardingPanel} aria-label="Provider onboarding">
            <div className={styles.panelHeader}>
              <div>
                <p>Provider onboarding</p>
                <h2>Access opens in three controlled steps</h2>
              </div>
              <span className={styles.invitePill}>Invite only</span>
            </div>

            <ol className={styles.stepList}>
              <li>
                <span className={styles.stepNumber}>1</span>
                <div>
                  <h3>Approved relationship</h3>
                  <p>A customer or Kordyne admin approves the provider organization.</p>
                </div>
              </li>
              <li>
                <span className={styles.stepNumber}>2</span>
                <div>
                  <h3>Scoped invitation</h3>
                  <p>The invitation carries the organization, package access, and role.</p>
                </div>
              </li>
              <li>
                <span className={styles.stepNumber}>3</span>
                <div>
                  <h3>Provider workspace</h3>
                  <p>Work opens in the focused portal for quotes, questions, and returns.</p>
                </div>
              </li>
            </ol>

            <div className={styles.panelFooter}>
              <div>
                <strong>Already invited?</strong>
                <span>Use the secure link from your email to create your account.</span>
              </div>
              <Link href="/login?portal=provider&next=%2Fprovider">Sign in</Link>
            </div>
          </aside>
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

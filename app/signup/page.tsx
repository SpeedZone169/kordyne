import type { Metadata } from "next";
import Link from "next/link";

import MarketingNav from "@/components/MarketingNav";

import loginStyles from "../login/login.module.css";
import styles from "./signup.module.css";

export const metadata: Metadata = {
  title: "Customer Access | Kordyne",
  description:
    "Request approved onboarding for a secure Kordyne customer workspace.",
};

const onboardingSteps = [
  {
    title: "Workspace review",
    body: "Kordyne aligns the vault, project, manufacturing, and collaboration requirements with the company.",
  },
  {
    title: "Plan activation",
    body: "The organization is configured with approved seats, roles, and starting capabilities.",
  },
  {
    title: "Secure invite",
    body: "Admins and users receive invitation links that create accounts inside the approved workspace.",
  },
];

const capabilities = [
  "Part vault and revision governance",
  "Provider and external viewer access",
  "Machine connectors and request routing",
];

export default function SignupPage() {
  return (
    <main className={`${loginStyles.page} marketing-site`}>
      <section className={loginStyles.hero}>
        <MarketingNav active="login" />

        <div className={styles.signupRail}>
          <div className={styles.signupGrid}>
            <div className={styles.signupCopy}>
              <p className={styles.eyebrow}>Customer access</p>
              <h1>Kordyne workspaces are opened through approved onboarding.</h1>
              <p className={styles.intro}>
                Customer accounts are created after the company workspace, plan,
                seats, and access model are confirmed. Invited users can complete
                setup from the secure invitation sent to their work email.
              </p>

              <div className={styles.actions}>
                <Link href="/contact" className={styles.primaryAction}>
                  Request access
                  <span aria-hidden="true">&rarr;</span>
                </Link>
                <Link href="/login" className={styles.secondaryAction}>
                  Sign in
                </Link>
              </div>
            </div>

            <article className={styles.onboardingCard}>
              <p className={styles.flowLabel}>Onboarding flow</p>
              <ol className={styles.steps}>
                {onboardingSteps.map((step, index) => (
                  <li key={step.title}>
                    <span className={styles.stepNumber}>0{index + 1}</span>
                    <div>
                      <h2>{step.title}</h2>
                      <p>{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </article>
          </div>

          <div className={styles.capabilities}>
            {capabilities.map((capability, index) => (
              <div key={capability}>
                <span aria-hidden="true">0{index + 1}</span>
                <p>{capability}</p>
              </div>
            ))}
          </div>
        </div>

        <footer className={loginStyles.footer}>
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

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import {
  buildProviderLoginHref,
  buildProviderSignupHref,
} from "@/lib/auth/provider-access";
import MarketingNav from "@/components/MarketingNav";

import styles from "./providers.module.css";

export const metadata: Metadata = {
  title: "Kordyne for Providers | Clearer RFQs and Controlled Collaboration",
  description:
    "Receive focused manufacturing packages, ask technical questions, submit quotes, and return production evidence in one controlled provider workspace.",
};

const providerBenefits = [
  {
    icon: "/marketing/icons/providers-card-1.svg",
    title: "Complete RFQ context",
    body: "Receive the part files, drawings, previews, notes, and revision context needed to quote with fewer missing details.",
  },
  {
    icon: "/marketing/icons/providers-card-2.svg",
    title: "Faster quote response",
    body: "Keep lead time, process notes, manufacturability questions, and commercial response in one structured workspace.",
  },
  {
    icon: "/marketing/icons/providers-card-3.svg",
    title: "Cleaner customer collaboration",
    body: "Ask technical questions and return production files without losing the thread across email and shared folders.",
  },
];

const providerWorkflow = [
  {
    icon: "/marketing/icons/providers-flow-1.svg",
    title: "Incoming RFQs",
  },
  {
    icon: "/marketing/icons/providers-flow-2.svg",
    title: "File and drawing review",
  },
  {
    icon: "/marketing/icons/providers-flow-5.svg",
    title: "Technical questions",
  },
  {
    icon: "/marketing/icons/providers-flow-4.svg",
    title: "Quote response",
  },
  {
    icon: "/marketing/icons/providers-flow-3.svg",
    title: "Returned files and evidence",
  },
];

function ArrowLink({
  href,
  children,
  secondary = false,
}: {
  href: string;
  children: React.ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`${styles.actionButton} ${secondary ? styles.actionButtonSecondary : ""}`}
    >
      <span>{children}</span>
      <span className={styles.actionArrow} aria-hidden="true">
        &rarr;
      </span>
    </Link>
  );
}

function ProviderWorkspace() {
  const incomingContext = [
    {
      icon: "/marketing/icons/providers-cad.svg",
      code: "CAD",
      title: "STEP, drawing, preview",
    },
    {
      icon: "/marketing/icons/providers-req.svg",
      code: "REQ",
      title: "Tolerance and quantity notes",
    },
    {
      icon: "/marketing/icons/providers-thread.svg",
      code: "THREAD",
      title: "Customer questions attached",
    },
  ];

  return (
    <article className={styles.workspaceCard}>
      <header className={styles.workspaceHeader}>
        <div>
          <p>Provider workspace</p>
          <h2>Incoming manufacturing package</h2>
        </div>
        <span className={styles.workspaceStatus}>New RFQ</span>
      </header>

      <div className={styles.workspaceContent}>
        <div className={styles.workspaceBody}>
        <div className={styles.contextStack}>
          {incomingContext.map((item) => (
            <div className={styles.contextCard} key={item.code}>
              <Image src={item.icon} alt="" width={44} height={44} />
              <div>
                <span>{item.code}</span>
                <p>{item.title}</p>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.responseCard}>
          <div className={styles.responseHeading}>
            <p>Provider response</p>
          </div>

          <div className={styles.responseMetric}>
            <span>Lead time</span>
            <strong>Quote Faster</strong>
          </div>
          <div className={styles.responseMetric}>
            <span>Files</span>
            <strong>No Chasing</strong>
          </div>

          <div className={styles.responseThread}>
            <span>Clarification thread</span>
            <p>
              Ask technical questions against the same package instead of a
              scattered email chain.
            </p>
          </div>
        </div>
        </div>

        <p className={styles.workspaceNote}>
          <span>A cleaner way for manufacturers to receive, quote, and return work.</span>
          <span className={styles.workspaceQuote} aria-hidden="true">
            &rdquo;
          </span>
        </p>
      </div>
    </article>
  );
}

export default function ProvidersLandingPage() {
  const providerSignupHref = buildProviderSignupHref("/provider");
  const providerLoginHref = buildProviderLoginHref("/provider");

  return (
    <main className={`marketing-site ${styles.page}`}>
      <section className={styles.hero}>
        <MarketingNav active="providers" />

        <div className={styles.heroRail}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Kordyne for providers</p>
            <h1>
              Quote manufacturing work with clearer files and less back-and-forth.
            </h1>
            <p className={styles.heroBody}>
              Kordyne gives approved manufacturing providers a focused workspace
              for incoming RFQs, revision context, technical questions, quote
              responses, and returned production evidence.
            </p>
            <div className={styles.heroActions}>
              <ArrowLink href={providerSignupHref}>
                Request Provider Access
              </ArrowLink>
              <ArrowLink href={providerLoginHref} secondary>
                Provider Sign In
              </ArrowLink>
            </div>
          </div>

          <ProviderWorkspace />
        </div>
      </section>

      <section className={styles.benefitsSection}>
        <div className={`${styles.sectionRail} ${styles.benefitGrid}`}>
          {providerBenefits.map((benefit) => (
            <article className={styles.benefitCard} key={benefit.title}>
              <span className={styles.iconDisc}>
                <Image src={benefit.icon} alt="" width={52} height={52} />
              </span>
              <h2>{benefit.title}</h2>
              <p>{benefit.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.workflowSection}>
        <div className={`${styles.sectionRail} ${styles.workflowGrid}`}>
          <div className={styles.workflowCopy}>
            <p className={styles.sectionEyebrow}>Provider workflow</p>
            <h2>
              A professional workspace for the manufacturing work you are invited
              to quote.
            </h2>
            <p>
              Instead of receiving disconnected files and unclear email threads,
              providers can review a focused package, ask questions, submit quote
              details, and return files against the same job record.
            </p>
          </div>

          <div className={styles.workflowPanel}>
            <p className={styles.workflowPanelTitle}>
              Inside the provider workspace
            </p>
            <div className={styles.workflowSteps}>
              {providerWorkflow.map((step, index) => (
                <article className={styles.workflowStep} key={step.title}>
                  <span className={styles.workflowNode} aria-hidden="true" />
                  <Image src={step.icon} alt="" width={48} height={48} />
                  <div>
                    <h3>{step.title}</h3>
                  </div>
                  <span className={styles.workflowNumber}>{index + 1}</span>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaContent}>
            <p className={styles.sectionEyebrow}>One platform. End-to-end control</p>
            <h2>
              A cleaner way to receive, quote, and return manufacturing work.
            </h2>
            <p>
              Join Kordyne to review focused RFQ packages, ask technical questions,
              submit quotes, and return evidence from one structured workspace.
            </p>
            <div className={styles.ctaActions}>
              <ArrowLink href={providerSignupHref}>
                Request Provider Access
              </ArrowLink>
              <ArrowLink href={providerLoginHref} secondary>
                Provider Sign In
              </ArrowLink>
            </div>
          </div>

          <footer className={styles.footer}>
            <p>&copy; 2026 Kordyne. All rights reserved.</p>
            <div>
              <Link href="/terms">Terms &amp; Conditions</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

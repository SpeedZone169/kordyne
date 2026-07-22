import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import MarketingNav from "@/components/MarketingNav";

import styles from "./platform.module.css";

export const metadata: Metadata = {
  title: "Kordyne Platform | Controlled Manufacturing Operating Layer",
  description:
    "Explore the Kordyne operating layer for controlled CAD release, part records, collaboration, manufacturing routing, quotes, and traceability.",
};

const iconRoot = "/marketing/platform-designer-icons";

const heroFeatures = [
  {
    icon: `${iconRoot}/hero-controlled.svg`,
    title: "Controlled by design",
    body: "Kordyne keeps engineering and manufacturing work organized around controlled part records, selected access, and traceable handoffs.",
  },
  {
    icon: `${iconRoot}/hero-connected.svg`,
    title: "Connected end to end",
    body: "One digital thread from release to evidence.",
  },
  {
    icon: `${iconRoot}/hero-manufacturing.svg`,
    title: "Built for manufacturing",
    body: "Controlled, auditable, and production-ready.",
  },
];

const digitalThread = [
  {
    icon: `${iconRoot}/thread-cad.svg`,
    title: "CAD Release",
    body: "Publish models and metadata from your CAD system.",
  },
  {
    icon: `${iconRoot}/thread-record.svg`,
    title: "Controlled Part Record",
    body: "Create a governed record with files, revisions, and properties.",
  },
  {
    icon: `${iconRoot}/thread-workspace.svg`,
    title: "Workspace",
    body: "Collaborate with internal and external teams in one place.",
  },
  {
    icon: `${iconRoot}/thread-request.svg`,
    title: "Manufacturing Request",
    body: "Package requirements, files, and context into a request.",
  },
  {
    icon: `${iconRoot}/thread-route.svg`,
    title: "Provider / Internal Route",
    body: "Route to the best internal machine or external provider.",
  },
  {
    icon: `${iconRoot}/thread-quote.svg`,
    title: "Quote / Award",
    body: "Compare quotes, award work, and track commercial decisions.",
  },
  {
    icon: `${iconRoot}/thread-evidence.svg`,
    title: "Returned Evidence",
    body: "Receive files, certificates, reports, and close the loop.",
  },
];

const architecture = [
  {
    icon: `${iconRoot}/arch-cad.svg`,
    title: "CAD Connectors",
    body: "Native integrations to import models, assemblies, drawings, metadata, and properties from leading CAD systems.",
  },
  {
    icon: `${iconRoot}/arch-vault.svg`,
    title: "Parts Vault / Revisions",
    body: "Controlled part records with revision history, files, properties, status, and supplier attachments.",
  },
  {
    icon: `${iconRoot}/arch-workspace.svg`,
    title: "Workspaces / Collaboration",
    body: "Project and part workspaces for internal teams and external partners to collaborate securely.",
  },
  {
    icon: `${iconRoot}/arch-request.svg`,
    title: "Requests / RFQs",
    body: "Create structured manufacturing requests with files, notes, requirements, and quantities.",
  },
  {
    icon: `${iconRoot}/arch-route.svg`,
    title: "Provider & Internal Routing",
    body: "Map capabilities and route intelligently to internal machines or external providers.",
  },
  {
    icon: `${iconRoot}/arch-quotes.svg`,
    title: "Quotes / Commercial Records",
    body: "Collect, compare, and award quotes with clear pricing and commercial records.",
  },
  {
    icon: `${iconRoot}/arch-evidence.svg`,
    title: "Evidence / Traceability",
    body: "Capture returned files, certificates, inspection reports, and proof linked to the original part record.",
  },
];

const capabilities = [
  {
    icon: `${iconRoot}/cap-connectors.svg`,
    title: "CAD Connectors",
    body: "Connect to leading CAD systems and bring your models and metadata into Kordyne.",
  },
  {
    icon: `${iconRoot}/cap-records.svg`,
    title: "Controlled Part Records & Revision History",
    body: "Keep part data with revisions, properties, status, and lifecycle context.",
  },
  {
    icon: `${iconRoot}/cap-workspaces.svg`,
    title: "Part and Project Workspaces",
    body: "Collaborate with your team and external partners in secure, purpose-built workspaces.",
  },
  {
    icon: `${iconRoot}/cap-requests.svg`,
    title: "Manufacturing Request Packages",
    body: "Bundle files, drawings, notes, and requirements into a clear request package.",
  },
  {
    icon: `${iconRoot}/cap-routing.svg`,
    title: "Provider Routing and Capability Mapping",
    body: "Find the right partner or machine based on capabilities, location, lead time, and more.",
  },
  {
    icon: `${iconRoot}/cap-manufacturing.svg`,
    title: "Internal Manufacturing and Machine Resources",
    body: "Use internal machines, containers, and schedules with real-time capacity visibility.",
  },
  {
    icon: `${iconRoot}/cap-access.svg`,
    title: "Controlled Access and Selected File Sharing",
    body: "Share only what is needed with the right people, never your entire vault.",
  },
  {
    icon: `${iconRoot}/cap-quotes.svg`,
    title: "Quotes, Awards, and Commercial Records",
    body: "Compare quotes, award work, and store commercial records in one place.",
  },
  {
    icon: `${iconRoot}/cap-traceability.svg`,
    title: "Traceability from Release to Returned Evidence",
    body: "Close the loop with files, certificates, inspection reports, and proof documentation.",
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

export default function PlatformPage() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <MarketingNav active="platform" />

        <div className={styles.heroRail}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>Platform overview</p>
            <h1>
              Inside the Kordyne
              <br />
              Operating Layer
            </h1>
            <p className={styles.heroBody}>
              Kordyne connects CAD connectors, controlled part records,
              workspaces, manufacturing requests, provider routing, internal
              manufacturing, quotes, and traceability in one structured platform.
            </p>
            <div className={styles.heroActions}>
              <ArrowLink href="/contact">Request Demo</ArrowLink>
              <ArrowLink href="/contact" secondary>
                Contact Now
              </ArrowLink>
            </div>
          </div>

          <div className={styles.heroSpacer} aria-hidden="true" />

          <div className={styles.heroFeatures}>
            {heroFeatures.map((feature) => (
              <article className={styles.heroFeature} key={feature.title}>
                <Image src={feature.icon} alt="" width={50} height={50} />
                <div>
                  <h2>{feature.title}</h2>
                  <p>{feature.body}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.threadSection}>
        <div className={`${styles.sectionRail} ${styles.threadRail}`}>
          <h2 className={styles.centerTitle}>
            A Connected Digital Thread from CAD
            <br />
            Release to Manufacturing Evidence
          </h2>
          <div className={styles.threadFlow}>
            <div className={styles.threadLine} aria-hidden="true" />
            {digitalThread.map((step, index) => (
              <article className={styles.threadCard} key={step.title}>
                <span className={styles.numberTag}>{index + 1}</span>
                <Image src={step.icon} alt="" width={50} height={50} />
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <span className={styles.threadNode} aria-hidden="true" />
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.architectureSection}>
        <div className={styles.sectionRail}>
          <div className={styles.splitHeading}>
            <div>
              <p className={styles.eyebrow}>Platform architecture</p>
              <h2>Built as a layered, secure operating platform</h2>
            </div>
            <p>
              Each layer in the Kordyne Operating Layer adds structure, control,
              and traceability so your team can move faster with confidence.
            </p>
          </div>

          <div className={styles.architectureList}>
            {architecture.map((layer, index) => (
              <article className={styles.architectureCard} key={layer.title}>
                <div className={styles.architectureTitle}>
                  <Image src={layer.icon} alt="" width={60} height={60} />
                  <h3>{layer.title}</h3>
                </div>
                <p>{layer.body}</p>
                <span className={styles.architectureNumber}>{index + 1}</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.capabilitiesSection}>
        <div className={styles.sectionRail}>
          <div className={styles.capabilitiesHeading}>
            <p className={styles.eyebrow}>Platform capabilities</p>
            <h2>
              Everything you need to run controlled
              <br />
              manufacturing workflows
            </h2>
          </div>

          <div className={styles.capabilitiesGrid}>
            {capabilities.map((capability, index) => (
              <article className={styles.capabilityCard} key={capability.title}>
                <span className={styles.numberTag}>{index + 1}</span>
                <Image src={capability.icon} alt="" width={66} height={66} />
                <h3>{capability.title}</h3>
                <p>{capability.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.ctaWrap}>
        <div className={styles.cta}>
          <div className={styles.ctaContent}>
            <p className={styles.eyebrow}>One platform. End-to-end control</p>
            <h2>
              Build a controlled digital thread from CAD release to manufacturing
              execution.
            </h2>
            <p>
              Kordyne gives your team the visibility, control, and traceability to
              deliver better parts, faster, with less risk.
            </p>
            <div className={styles.ctaActions}>
              <ArrowLink href="/contact">Request Demo</ArrowLink>
              <ArrowLink href="/contact" secondary>
                Contact Now
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

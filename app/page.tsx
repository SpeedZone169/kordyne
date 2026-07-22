import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import MarketingNav from "@/components/MarketingNav";

import styles from "./home.module.css";

export const metadata: Metadata = {
  title: "Kordyne | Controlled CAD to Manufacturing Handoff",
  description:
    "Kordyne keeps parts, revisions, files, and supplier handoffs connected in one controlled workspace.",
};

const iconRoot = "/marketing/designer-home-icons";

type IconCardProps = {
  icon: string;
  title: string;
  body: string;
  number?: number;
  dark?: boolean;
  className?: string;
};

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

function SectionHeading({
  eyebrow,
  title,
  body,
  centered = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body?: string;
  centered?: boolean;
}) {
  return (
    <div className={`${styles.sectionHeading} ${centered ? styles.centered : ""}`}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {body ? <p className={styles.sectionIntro}>{body}</p> : null}
    </div>
  );
}

function IconCard({
  icon,
  title,
  body,
  number,
  dark = false,
  className = "",
}: IconCardProps) {
  return (
    <article
      className={`${styles.featureCard} ${dark ? styles.featureCardDark : ""} ${className}`}
    >
      {typeof number === "number" ? (
        <span className={styles.numberTag}>{number}</span>
      ) : null}
      <Image src={icon} alt="" width={66} height={66} className={styles.cardIcon} />
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function OperatingLayer() {
  const flow = [
    {
      icon: `${iconRoot}/01 Hero Section Icons/SVG Icons/CADTools.svg`,
      title: "CAD Tools",
      body: "Publish package",
    },
    {
      icon: `${iconRoot}/01 Hero Section Icons/SVG Icons/ShieldCheck.svg`,
      title: "Parts Vault",
      body: "Control revisions",
    },
    {
      icon: `${iconRoot}/01 Hero Section Icons/SVG Icons/UsersThree.svg`,
      title: "Workspace",
      body: "Share selectively",
    },
    {
      icon: `${iconRoot}/01 Hero Section Icons/SVG Icons/Files.svg`,
      title: "Handoff",
      body: "Return evidence",
    },
  ];

  const truths = [
    {
      icon: "Feature Icon Container.svg",
      title: "Part truth",
      body: "Files, previews, revisions, and metadata together.",
    },
    {
      icon: "Feature Icon Container-1.svg",
      title: "Access Control",
      body: "Collaborators see only the selected context.",
    },
    {
      icon: "Feature Icon Container-2.svg",
      title: "Manufacturing memory",
      body: "Quotes, notes, and returned files remain linked.",
    },
  ];

  return (
    <section className={styles.operatingLayer} aria-label="Kordyne operating layer">
      <div className={styles.operatingHeader}>
        <div>
          <p>KORDYNE OPERATING LAYER</p>
          <h2>
            One controlled record
            <br />
            from release to production
          </h2>
        </div>
        <span className={styles.livePill}>
          <span /> LIVE CONTEXT
        </span>
      </div>

      <div className={styles.operatingFlow}>
        {flow.map((item, index) => (
          <div className={styles.flowStep} key={item.title}>
            <span className={styles.flowNumber}>{index + 1}</span>
            <Image
              src={item.icon}
              alt=""
              width={34}
              height={34}
            />
            <strong>{item.title}</strong>
            <span>{item.body}</span>
          </div>
        ))}
      </div>

      <div className={styles.operatingTruths}>
        {truths.map((item) => (
          <div className={styles.truthItem} key={item.title}>
            <Image
              src={`${iconRoot}/01 Hero Section Icons/SVG Icons/${item.icon}`}
              alt=""
              width={58}
              height={58}
            />
            <div>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.operatingQuote}>
        <p>
          Built to keep engineering decisions, manufacturing handoffs, and
          external collaboration connected to the part record.
        </p>
        <span aria-hidden="true">&ldquo;</span>
      </div>
    </section>
  );
}

function Hero() {
  return (
    <header className={styles.hero}>
      <MarketingNav active="home" />
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}>CAD-TO-MANUFACTURING WORKSPACE</p>
        <h1>Controlled CAD to Manufacturing Handoff.</h1>
        <p>
          Kordyne keeps parts, revisions, files, and supplier handoffs connected
          in one workspace.
        </p>
      </div>
      <OperatingLayer />
    </header>
  );
}

function ImpactSection() {
  const impact = [
    {
      icon: "Network Icon Container.svg",
      title: "Increase Operational Efficiency",
      body: "Reduce duplicated admin, scattered files, email chasing, unclear revisions, and manual handoff steps across internal and external manufacturing workflows.",
    },
    {
      icon: "ShieldCheck Icon Container.svg",
      title: "Strengthen Traceability",
      body: "Keep files, revisions, quotes, messages, decisions, returned evidence, and manufacturing history linked to the correct part and request.",
    },
    {
      icon: "Globe Icon Container.svg",
      title: "Create a Connected Digital Thread",
      body: "Connect CAD data, part records, revisions, collaboration, manufacturing requests, provider responses, and returned evidence into one structured digital workflow from design release to production handoff.",
    },
  ];

  return (
    <section className={`${styles.section} ${styles.impactSection}`}>
      <div className={styles.contentRail}>
        <SectionHeading
          eyebrow="WHY THIS EXISTS"
          title="Real Impact. Controlled Handoffs."
          centered
        />
        <div className={styles.impactGrid}>
          <article className={styles.impactLeadCard}>
            <span className={styles.numberTag}>1</span>
            <div className={styles.impactLeadCopy}>
              <Image
                src={`${iconRoot}/02 Real Impact Section Icons/SVG Icons/Rocket Icon Container.svg`}
                alt=""
                width={66}
                height={66}
              />
              <h3>Reduce Time to Market</h3>
              <p>
                Move from CAD release to manufacturing handoff faster by keeping
                part files, revisions, requests, suppliers, and production
                context connected in one controlled workflow.
              </p>
            </div>
            <Image
              src={`${iconRoot}/02 Real Impact Section Icons/SVG Icons/Icon with Factory.svg`}
              alt="Controlled part workflow from CAD file to returned evidence"
              width={348}
              height={320}
              className={styles.factoryGraphic}
            />
          </article>
          <IconCard
            icon={`${iconRoot}/02 Real Impact Section Icons/SVG Icons/Users Icon Container.svg`}
            title="Improve Cross-Team Collaboration"
            body="Unify engineering, manufacturing, purchasing, suppliers, and project teams around the same controlled part record, reducing misalignment and repeated clarification."
            number={2}
          />
          {impact.map((item, index) => (
            <IconCard
              key={item.title}
              icon={`${iconRoot}/02 Real Impact Section Icons/SVG Icons/${item.icon}`}
              title={item.title}
              body={item.body}
              number={index + 3}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ProblemSection() {
  const problems = [
    {
      icon: "Section 1 icon.svg",
      title: "Files live in too many places",
      body: "CAD files, drawings, STEP files, quotes, and messages are often spread across emails, drives, and local folders.",
    },
    {
      icon: "Section 2 icon.svg",
      title: "Supplier handoff is unstructured",
      body: "External providers receive files without full context, selected exposure rules, or a clear response workflow.",
    },
    {
      icon: "Section 3 icon.svg",
      title: "Revision control becomes unclear",
      body: "Teams struggle to know which version was approved, released, quoted, or manufactured.",
    },
    {
      icon: "Section 4 icon.svg",
      title: "Manufacturing decisions are hard to trace",
      body: "Internal versus external routing, quote decisions, and production history are not always connected to the part record.",
    },
  ];

  return (
    <section className={`${styles.section} ${styles.problemSection}`}>
      <div className={styles.contentRail}>
        <div className={styles.splitHeading}>
          <SectionHeading
            eyebrow="WHY THIS EXISTS"
            title={
              <>
                Hardware work breaks
                <br />
                when part context breaks.
              </>
            }
          />
          <p>
            Engineering teams using drives, emails, and spreadsheets often lose
            revision control, causing delays, rework, confusion, and poor
            traceability.
          </p>
        </div>
        <div className={styles.problemGrid}>
          <div className={styles.problemColumn}>
            {[problems[0], problems[2]].map((item) => (
              <IconCard
                key={item.title}
                icon={`${iconRoot}/03 Why This Exists Section Icons/SVG Icons/${item.icon}`}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
          <div className={styles.problemVisual}>
            <Image
                src="/marketing/backgrounds/home-problem-visual-figma.png"
                alt="Scattered engineering files and disconnected handoffs"
                width={1448}
                height={1086}
                unoptimized
                sizes="(max-width: 767px) 86vw, 760px"
              />
          </div>
          <div className={styles.problemColumn}>
            {[problems[1], problems[3]].map((item) => (
              <IconCard
                key={item.title}
                icon={`${iconRoot}/03 Why This Exists Section Icons/SVG Icons/${item.icon}`}
                title={item.title}
                body={item.body}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

const ecosystemItems = [
  {
    key: "cad",
    icon: "CAD Tools icon container.svg",
    title: "CAD Tools",
    body: "Publish packages and revisions.",
  },
  {
    key: "vault",
    icon: "Vault icon container.svg",
    title: "Vault",
    body: "Maintain part history.",
  },
  {
    key: "requests",
    icon: "Requests icon container.svg",
    title: "Requests",
    body: "Track communication and feedback.",
  },
  {
    key: "quotes",
    icon: "Quotes icon container.svg",
    title: "Quotes",
    body: "Keep purchasing records attached.",
  },
  {
    key: "collaboration",
    icon: "Collaboration icon container.svg",
    title: "Collaboration",
    body: "Share only the required context.",
  },
  {
    key: "providers",
    icon: "Providers icon container.svg",
    title: "Providers",
    body: "Connect external suppliers.",
  },
  {
    key: "manufacturing",
    icon: "Manufacturing icon container.svg",
    title: "Manufacturing",
    body: "Internal & external production.",
  },
  {
    key: "traceability",
    icon: "Traceability icon container.svg",
    title: "Traceability",
    body: "Maintain a complete history.",
  },
];

function EcosystemSection() {
  return (
    <section className={`${styles.section} ${styles.ecosystemSection}`}>
      <div className={styles.contentRail}>
        <SectionHeading
          eyebrow="CONNECTED ECOSYSTEM"
          title={
            <>
              One control layer for the entire
              <br />
              product workflow.
            </>
          }
          centered
        />
        <div className={styles.ecosystemMap}>
          {ecosystemItems.map((item) => (
            <article
              key={item.key}
              className={`${styles.ecosystemItem} ${styles[`ecosystem_${item.key}`]}`}
            >
              <Image
                src={`${iconRoot}/04 Connected Ecosystem Section Icons/SVG Icons/${item.icon}`}
                alt=""
                width={58}
                height={58}
              />
              <div>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </div>
            </article>
          ))}
          <div className={styles.ecosystemCenter}>
            <Image
              src={`${iconRoot}/04 Connected Ecosystem Section Icons/SVG Icons/Central logo.svg`}
              alt="Kordyne"
              width={300}
              height={300}
            />
          </div>
          <svg
            className={styles.ecosystemConnectors}
            viewBox="0 0 920 450"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M460 88V135" />
            <path d="M460 315V362" />
            <path d="M370 225H210" />
            <path d="M370 225H285Q275 225 275 215V141Q275 131 265 131H210" />
            <path d="M370 225H285Q275 225 275 235V309Q275 319 265 319H210" />
            <path d="M550 225H710" />
            <path d="M550 225H635Q645 225 645 215V141Q645 131 655 131H710" />
            <path d="M550 225H635Q645 225 645 235V309Q645 319 655 319H710" />
            <circle cx="460" cy="88" r="5" />
            <circle cx="460" cy="362" r="5" />
            <circle cx="210" cy="131" r="5" />
            <circle cx="210" cy="225" r="5" />
            <circle cx="210" cy="319" r="5" />
            <circle cx="710" cy="131" r="5" />
            <circle cx="710" cy="225" r="5" />
            <circle cx="710" cy="319" r="5" />
          </svg>
        </div>
      </div>
    </section>
  );
}

function WorkSection() {
  const release = {
    icon: "Icon Group.svg",
    title: "Release",
    body: "Publish the approved part package from CAD into the vault with files, thumbnails, previews, and metadata.",
  };

  const work = [
    {
      icon: "Icon Group-1.svg",
      title: "Package",
      body: "Select the files, drawings, preview geometry, properties, and revision context needed for manufacturing.",
    },
    {
      icon: "Icon Group-2.svg",
      title: "Route",
      body: "Choose internal manufacturing, external providers, or project collaborators without exposing the full vault.",
    },
    {
      icon: "Icon Group-3.svg",
      title: "Respond",
      body: "Capture quotes, questions, lead times, returned files, and production feedback in the same workspace.",
    },
    {
      icon: "Icon Group-4.svg",
      title: "Trace",
      body: "Keep manufacturing decisions and evidence tied to the correct part, revision, package, and project.",
    },
  ];

  const releaseFlow = [
    { icon: "Icon.svg", label: "CAD" },
    { icon: "Icon-1.svg", label: "Review" },
    { icon: "Icon-2.svg", label: "Vault" },
    { icon: "Icon-3.svg", label: "Files" },
  ];

  return (
    <section className={`${styles.section} ${styles.workSection}`}>
      <div className={styles.contentRail}>
        <div className={styles.splitHeading}>
          <SectionHeading
            eyebrow="HOW WORK MOVES"
            title={
              <>
                Release, package, route,
                <br />
                respond, and trace.
              </>
            }
          />
          <p>
            Kordyne keeps part records as the source of truth, while each handoff
            adds context for manufacturing, suppliers, production & projects.
          </p>
        </div>
        <div className={styles.workGrid}>
          <article
            className={`${styles.featureCard} ${styles.featureCardDark} ${styles.workLead}`}
          >
            <span className={styles.numberTag}>1</span>
            <div className={styles.workLeadCopy}>
              <Image
                src={`${iconRoot}/05 How work moves Section Icons/SVG Icons/${release.icon}`}
                alt=""
                width={66}
                height={66}
                className={styles.cardIcon}
              />
              <h3>{release.title}</h3>
              <p>{release.body}</p>
            </div>
            <div className={styles.workLeadVisual} aria-hidden="true">
              <svg
                className={styles.workLeadConnectors}
                viewBox="0 0 176 138"
                preserveAspectRatio="none"
              >
                <path d="M78 34H98M78 104H98M39 65V73M137 65V73" />
                <circle cx="78" cy="34" r="2.5" />
                <circle cx="98" cy="34" r="2.5" />
                <circle cx="78" cy="104" r="2.5" />
                <circle cx="98" cy="104" r="2.5" />
                <circle cx="39" cy="65" r="2.5" />
                <circle cx="39" cy="73" r="2.5" />
                <circle cx="137" cy="65" r="2.5" />
                <circle cx="137" cy="73" r="2.5" />
              </svg>
              {releaseFlow.map((step) => (
                <div key={step.label} className={styles.workLeadStep}>
                  <Image
                    src={`${iconRoot}/05 How work moves Section Icons/SVG Icons/${step.icon}`}
                    alt=""
                    width={50}
                    height={50}
                  />
                  <span>{step.label}</span>
                </div>
              ))}
            </div>
          </article>
          {work.map((item, index) => (
            <IconCard
              key={item.title}
              icon={`${iconRoot}/05 How work moves Section Icons/SVG Icons/${item.icon}`}
              title={item.title}
              body={item.body}
              number={index + 2}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function NetworksSection() {
  const networks = [
    {
      icon: "Icon container.svg",
      title: "Engineering release",
      body: "Approved parts, revisions, CAD files, and manufacturing-ready packages for production use.",
    },
    {
      icon: "Icon container-1.svg",
      title: "Supplier collaboration",
      body: "Controlled file exposure, quote responses, provider questions, and returned files.",
    },
    {
      icon: "Icon container-2.svg",
      title: "Internal manufacturing",
      body: "Routing, capability matching, resource visibility, and production handoff.",
    },
    {
      icon: "Icon container-3.svg",
      title: "Project collaboration",
      body: "Shared workspaces for R&D, prototypes, customer programs, and cross-company work.",
    },
  ];

  return (
    <section className={`${styles.section} ${styles.networksSection}`}>
      <div className={styles.contentRail}>
        <div className={styles.splitHeading}>
          <SectionHeading
            eyebrow="MANUFACTURING NETWORKS"
            title={
              <>
                Built for modern
                <br />
                manufacturing networks.
              </>
            }
          />
          <p>
            Kordyne is built for companies moving controlled part data across
            engineering, production teams, suppliers, and project partners.
          </p>
        </div>
        <div className={styles.networkGrid}>
          {networks.map((item) => (
            <IconCard
              key={item.title}
              icon={`${iconRoot}/06 Manufacturing Networks Section Icons/SVG Icons/${item.icon}`}
              title={item.title}
              body={item.body}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className={styles.ctaShell}>
      <div className={styles.cta}>
        <div className={styles.ctaCopy}>
          <p className={styles.eyebrow}>BUILT FOR THE WORKFLOW AHEAD</p>
          <h2>
            Bring CAD release, part truth,
            <br />
            collaboration, & manufacturing handoff
            <br />
            into one controlled layer.
          </h2>
          <p>
            Start with the vault. Add part workspaces when collaboration begins.
            Create projects when the work becomes a real program.
          </p>
          <div className={styles.heroActions}>
            <ArrowLink href="/contact">Request Demo</ArrowLink>
          </div>
        </div>
        <footer className={styles.footer}>
          <span>&copy; 2026 Kordyne. All rights reserved.</span>
          <div>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className={`marketing-site ${styles.page}`}>
      <Hero />
      <ImpactSection />
      <ProblemSection />
      <EcosystemSection />
      <WorkSection />
      <NetworksSection />
      <FinalCta />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ConnectorReleaseShowcase,
  ControlPanelShowcase,
  HomeWorkflowShowcase,
} from "@/components/MarketingShowcase";

export const metadata: Metadata = {
  title: "Kordyne | Controlled CAD-to-Manufacturing Handoff",
  description:
    "Kordyne helps engineering and manufacturing teams move approved parts, revisions, files, supplier packages, and manufacturing responses through one controlled workspace.",
};

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase tracking-normal text-[#00bdde]">
      {children}
    </p>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  body: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
        {body}
      </p>
    </div>
  );
}

function FeatureCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-lg font-black text-slate-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </article>
  );
}

function DarkCard({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[8px] border border-white/12 bg-white/[0.06] p-5">
      <h3 className="text-lg font-black text-white">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-white/70">{body}</p>
    </article>
  );
}

const problemCards = [
  {
    title: "Files live in too many places",
    body: "CAD files, drawings, STEP files, quotes, and messages are often spread across emails, drives, and local folders.",
  },
  {
    title: "Revision control becomes unclear",
    body: "Teams struggle to know which version was approved, released, quoted, or manufactured.",
  },
  {
    title: "Supplier handoff is unstructured",
    body: "External providers receive files without full context, selected exposure rules, or a clear response workflow.",
  },
  {
    title: "Manufacturing decisions are hard to trace",
    body: "Internal versus external routing, quote decisions, and production history are not always connected to the part record.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Release",
    body: "Publish the approved part package from CAD into the vault with files, thumbnails, previews, and metadata.",
  },
  {
    number: "02",
    title: "Package",
    body: "Select the files, drawings, preview geometry, properties, and revision context needed for manufacturing.",
  },
  {
    number: "03",
    title: "Route",
    body: "Choose internal manufacturing, external providers, or project collaborators without exposing the full vault.",
  },
  {
    number: "04",
    title: "Respond",
    body: "Capture quotes, questions, lead times, returned files, and production feedback in the same workspace.",
  },
  {
    number: "05",
    title: "Trace",
    body: "Keep manufacturing decisions and evidence tied to the correct part, revision, package, and project.",
  },
];

const workspaceTypes = [
  {
    title: "Parts Vault",
    body: "The source of truth for part records, revisions, thumbnails, metadata, selected files, and manufacturing evidence.",
  },
  {
    title: "Part Workspace",
    body: "A focused space for one part or revision when it needs notes, discussion, controlled file access, or supplier response.",
  },
  {
    title: "Project Workspace",
    body: "A cross-functional space for customer programs, R&D builds, machine packages, and multi-part manufacturing work.",
  },
];

const connectorFeatures = [
  {
    title: "Publish from CAD",
    body: "Send files, previews, thumbnails, properties, and revision context from CAD into a controlled part record.",
  },
  {
    title: "Pull from the vault",
    body: "Find existing part records and bring controlled files back into the design environment when work resumes.",
  },
  {
    title: "Compare revisions",
    body: "Check whether the CAD model and vault record are aligned before downstream manufacturing work begins.",
  },
  {
    title: "Keep the source linked",
    body: "Maintain the relationship between CAD documents, part records, revisions, and manufacturing activity.",
  },
];

const manufacturingRoutes = [
  {
    title: "Internal manufacturing",
    body: "Route work to internal machines, schedules, capabilities, and factory resources while retaining source part context.",
  },
  {
    title: "External providers",
    body: "Share selected files for quotes and manufacturing review while keeping vault access, downloads, and returned files controlled.",
  },
  {
    title: "Project collaboration",
    body: "Move parts into a project workspace when R&D, customers, consultants, or internal teams need to work together.",
  },
];

const collaborationControls = [
  {
    title: "Selected file access",
    body: "Share only the files, previews, drawings, and metadata required for the task.",
  },
  {
    title: "Threaded context",
    body: "Keep notes, clarifications, quotes, returned files, and manufacturing decisions connected to the part.",
  },
  {
    title: "Provider response",
    body: "Give providers a focused workspace to review packages, ask questions, quote, and return evidence.",
  },
  {
    title: "Project continuity",
    body: "Link standalone parts to larger projects without duplicating the vault record.",
  },
];

const networkModules = [
  {
    title: "Engineering release",
    body: "Approved parts, revisions, CAD files, and manufacturing-ready packages.",
  },
  {
    title: "Supplier collaboration",
    body: "Controlled file exposure, quote responses, provider questions, and returned files.",
  },
  {
    title: "Internal manufacturing",
    body: "Routing, capability matching, resource visibility, and production handoff.",
  },
  {
    title: "Project collaboration",
    body: "Shared workspaces for R&D, prototypes, customer programs, and cross-company work.",
  },
];

const securityControls = [
  "Role-based access",
  "Selected exposure",
  "Revision-aware records",
  "Audit-ready foundation",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f8fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#003040] text-white">
        <div className="absolute inset-0 kordyne-grid-bg opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-[#00bdde]/35" />

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-6 lg:px-8 lg:py-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <Eyebrow>CAD-to-manufacturing workspace</Eyebrow>
              <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight text-white sm:text-[3rem] lg:text-[3.25rem]">
                Controlled CAD-to-manufacturing handoff.
              </h1>
              <p className="mt-6 max-w-4xl text-base leading-8 text-slate-200 sm:text-lg">
                Kordyne helps engineering and manufacturing teams move approved
                parts, revisions, files, and supplier packages through one
                controlled workspace, reducing file confusion, missing context,
                and uncontrolled handovers.
              </p>
              <p className="mt-4 max-w-4xl text-base leading-8 text-slate-300">
                Keep the part record clear from design release through internal
                manufacturing, external providers, and project collaboration.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] shadow-[0_16px_34px_rgba(0,189,222,0.22)] transition hover:bg-[#8ceeff]"
                >
                  Request Demo
                </Link>
                <Link
                  href="/platform"
                  className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
                >
                  View Platform
                </Link>
              </div>
            </div>

            <HomeWorkflowShowcase />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-16">
          <div>
            <Eyebrow>Why this exists</Eyebrow>
            <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
              Hardware work breaks when part context breaks.
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Engineering teams often rely on shared drives, emails,
              spreadsheets, and informal messages to move parts into
              manufacturing. As revisions change, teams lose clarity on which
              files are approved, what was sent, who received it, and what
              manufacturing route was chosen. This creates rework, quoting
              delays, supplier confusion, and weak traceability.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {problemCards.map((item) => (
              <FeatureCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="How work moves"
          title="Release, package, route, respond, and trace."
          body="Kordyne keeps the part record as the source of truth while each handoff creates the context needed for manufacturing, supplier review, internal production, or project collaboration."
        />

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {workflowSteps.map((step) => (
            <article
              key={step.number}
              className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-black text-[#00bdde]">{step.number}</p>
              <h3 className="mt-3 text-xl font-black text-slate-950">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {step.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#003040] py-16 text-white lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
            <div>
              <Eyebrow>Workspace model</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                Parts stay standalone until they need a workspace or project.
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-300 sm:text-lg">
                A part becomes a workspace only when collaboration starts, and a
                project only when the work becomes a larger customer program,
                R&D build, or multi-part manufacturing effort.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {workspaceTypes.map((item) => (
                <DarkCard key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionIntro
              eyebrow="CAD connectors"
              title="Start from the tools engineers already use."
              body="Kordyne connects CAD software to the vault so engineers can publish part data, preview files, metadata, and revisions without rebuilding context manually later."
            />

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {connectorFeatures.map((item) => (
                <FeatureCard key={item.title} title={item.title} body={item.body} />
              ))}
            </div>
          </div>

          <ConnectorReleaseShowcase />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow="Manufacturing handoff"
            title="Package the right files for the right manufacturing route."
            body="Once part context is controlled, Kordyne helps teams move toward production without uncontrolled folders, stale revisions, or supplier conversations floating outside the record."
            align="center"
          />

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {manufacturingRoutes.map((route) => (
              <FeatureCard key={route.title} title={route.title} body={route.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <SectionIntro
            eyebrow="Controlled collaboration"
            title="Share the part, not the whole company vault."
            body="External access should be explicit, limited, and connected to the exact part, request, or project being discussed. Kordyne is designed around selected files, selected collaborators, and traceable handoffs."
          />

          <div className="grid gap-4 md:grid-cols-2">
            {collaborationControls.map((item) => (
              <FeatureCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#edf8fb] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <SectionIntro
            eyebrow="Manufacturing networks"
            title="Built for modern manufacturing networks."
            body="Kordyne is designed for companies that need to move controlled part data between engineering, internal production teams, external suppliers, and project partners."
            align="center"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {networkModules.map((item) => (
              <FeatureCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionIntro
              eyebrow="Control by design"
              title="Built for controlled engineering collaboration."
              body="Kordyne is designed to reduce uncontrolled file sharing and keep sensitive engineering work connected to clear access, revision, and handoff records."
            />

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {securityControls.map((item) => (
                <div
                  key={item}
                  className="rounded-[8px] border border-slate-200 bg-white p-4 text-sm font-black text-slate-950 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <ControlPanelShowcase />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[8px] bg-[#003040] p-6 text-white shadow-[0_22px_60px_rgba(0,48,64,0.18)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.46fr] lg:items-center">
            <div>
              <Eyebrow>Built for the workflow ahead</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl">
                Bring CAD release, part truth, collaboration, and manufacturing
                handoff into one controlled layer.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 sm:text-lg">
                Start with the vault. Add part workspaces when collaboration
                begins. Create projects when the work becomes a real program.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-center text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Request Demo
              </Link>
              <Link
                href="/platform"
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/15"
              >
                View Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

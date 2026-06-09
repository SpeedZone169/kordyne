import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ConnectorReleaseShowcase,
  ControlPanelShowcase,
  OperatingLayerShowcase,
} from "@/components/MarketingShowcase";

export const metadata: Metadata = {
  title: "Kordyne | CAD-to-Manufacturing Workspace for Engineering Teams",
  description:
    "Kordyne helps engineering teams control CAD releases, part revisions, selected file sharing, supplier collaboration, internal manufacturing handoff, and returned manufacturing evidence.",
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
    body: "CAD files, STEP files, drawings, screenshots, and previews end up spread across folders, email, chat, and disconnected systems.",
  },
  {
    title: "Decisions happen somewhere else",
    body: "Comments, approvals, supplier questions, quote decisions, and manufacturing notes drift away from the part record.",
  },
  {
    title: "Manufacturing loses the thread",
    body: "Internal teams and external providers receive packages without the full revision, access, discussion, and evidence context.",
  },
];

const workflowSteps = [
  {
    number: "01",
    title: "Release from CAD",
    body: "Publish part files, thumbnails, STEP/STL, drawings, previews, and CAD metadata into a controlled Kordyne vault record.",
  },
  {
    number: "02",
    title: "Control the part record",
    body: "Manage revisions, selected files, preview context, notes, source links, and technical history around the part itself.",
  },
  {
    number: "03",
    title: "Create the handoff",
    body: "Package the right files for internal manufacturing, external providers, or project collaborators without losing the thread.",
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

const teamCards = [
  {
    title: "Engineering",
    body: "Release CAD data, manage revisions, and keep part records clean before work moves downstream.",
  },
  {
    title: "R&D",
    body: "Create focused workspaces for prototypes, trials, build reviews, and technical collaboration.",
  },
  {
    title: "Manufacturing",
    body: "Receive controlled packages with the correct revision, drawings, files, and context.",
  },
  {
    title: "Providers",
    body: "Review selected files, ask questions, submit quotes, and return manufacturing evidence in one place.",
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
                CAD release to manufacturing handoff, controlled in one
                workspace.
              </h1>
              <p className="mt-6 max-w-4xl text-base leading-8 text-slate-200 sm:text-lg">
                Kordyne connects CAD files, part revisions, live previews,
                collaboration, supplier quotes, manufacturing routes, and returned
                evidence so engineering teams can move from design to production
                without losing context.
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
                  View Product
                </Link>
              </div>
            </div>

            <OperatingLayerShowcase />
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
              Teams rarely lose momentum because one file is missing. They lose
              it because the file, revision, decision, quote, and manufacturing
              evidence are disconnected.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {problemCards.map((item) => (
              <FeatureCard key={item.title} title={item.title} body={item.body} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="How work moves"
          title="A cleaner path from design release to manufacturing decision."
          body="Kordyne keeps the part record as the source of truth. Workspaces and projects appear only when teams need collaboration, supplier review, internal manufacturing, or customer program control."
        />

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
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
            eyebrow="Built for hardware teams"
            title="For teams moving parts from design to production."
            body="Kordyne helps engineering, R&D, manufacturing, procurement, and provider teams work from the same controlled part context."
            align="center"
          />

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {teamCards.map((item) => (
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
                View Product
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

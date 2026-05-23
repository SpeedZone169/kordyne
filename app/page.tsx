import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { WorkflowShowcase } from "@/components/MarketingShowcase";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function SectionIntro({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-lg leading-8 text-slate-600">{body}</p>
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

const heroProofPoints = [
  [
    "Publish from CAD",
    "Move files, thumbnails, STEP/STL, drawings, and metadata from design tools into the vault.",
  ],
  [
    "Control the part",
    "Keep revisions, previews, project links, comments, and selected shares tied to the right record.",
  ],
  [
    "Hand off to manufacture",
    "Package selected files for internal machines, external providers, quotes, schedules, and returned evidence.",
  ],
];

const painPoints = [
  "CAD files live in one place, screenshots in another, and the actual manufacturing decision happens in email.",
  "A part becomes a project too early, or never gets a proper project space when collaboration actually starts.",
  "Suppliers receive file packs without the revision, discussion, access limits, and returned evidence staying connected.",
];

const workflowSteps = [
  {
    number: "01",
    title: "Release from CAD",
    body: "Publish the part, revision, preview image, STEP/STL, drawing, and metadata from design tools into Kordyne.",
  },
  {
    number: "02",
    title: "Work from the vault",
    body: "Review files, manage revisions, keep notes attached, and decide whether the part stays standalone or joins a project.",
  },
  {
    number: "03",
    title: "Create the handoff",
    body: "Send selected files to internal manufacturing, external providers, quote workflows, schedules, and returned-file tracking.",
  },
];

const workspaceTypes = [
  {
    title: "Parts Vault",
    body: "The source of truth for every part, revision, file, thumbnail, metadata field, and manufacturing evidence.",
  },
  {
    title: "Part Workspace",
    body: "A focused place for one part or revision when it needs notes, internal discussion, or controlled external sharing.",
  },
  {
    title: "Project Workspace",
    body: "An intentional collaboration space for a customer program, R&D build, machine package, or multi-part manufacturing effort.",
  },
];

const handoffRoutes = [
  {
    title: "Internal manufacturing",
    body: "Route work to internal machines, schedules, capabilities, and factory resources without losing the source part context.",
  },
  {
    title: "External providers",
    body: "Share selected files for quotes and manufacturing review while keeping vault access, downloads, and returned files controlled.",
  },
  {
    title: "Project collaboration",
    body: "Bring customers, vendors, consultants, and internal teams into the right project or part workspace instead of the full vault.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#003040] text-white">
        <div className="absolute inset-0 opacity-35">
          <div className="absolute inset-0 kordyne-grid-bg" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="max-w-5xl">
            <Eyebrow>CAD-to-manufacturing workspace</Eyebrow>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              From CAD software to manufacturing handoff, in one controlled
              place.
            </h1>
            <p className="mt-7 max-w-4xl text-lg leading-8 text-slate-200 sm:text-xl">
              Kordyne connects CAD release, part vault, revision control,
              project collaboration, file previews, supplier quotes, and
              internal or external manufacturing packages so teams can move
              from design to production without losing context.
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

          <div className="mt-12 grid gap-4 border-t border-white/12 pt-6 md:grid-cols-3">
            {heroProofPoints.map(([title, body]) => (
              <div key={title} className="max-w-sm">
                <p className="text-sm font-black text-[#8ceeff]">{title}</p>
                <p className="mt-2 text-sm leading-6 text-white/72">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8 lg:py-16">
          <div>
            <Eyebrow>Why this exists</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Hardware work breaks when the part context breaks.
            </h2>
          </div>

          <div className="grid gap-3">
            {painPoints.map((item) => (
              <div
                key={item}
                className="rounded-[8px] border border-slate-200 bg-[#f8fbfc] p-4 text-base font-semibold leading-7 text-slate-800"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <SectionIntro
          eyebrow="How work moves"
          title="A cleaner path from design release to manufacturing decision."
          body="Kordyne is not trying to turn every uploaded part into a project. The vault stays the source of truth. Workspaces and projects appear when the owner chooses to collaborate, share, or organize a larger effort."
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
              <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
                Parts stay standalone until they need a workspace or project.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                That keeps the vault clean as it grows. A project becomes a
                project only when there is a real customer program, R&D build,
                or multi-part collaboration to manage.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {workspaceTypes.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[8px] border border-white/12 bg-white/[0.06] p-5"
                >
                  <h3 className="text-lg font-black text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/70">
                    {item.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionIntro
              eyebrow="Manufacturing handoff"
              title="Package the right files for the right route."
              body="Once the part context is controlled, Kordyne helps teams move toward production without uncontrolled folders, stale revisions, or supplier conversations floating outside the record."
            />

            <div className="mt-8 grid gap-4">
              {handoffRoutes.map((route) => (
                <FeatureCard
                  key={route.title}
                  title={route.title}
                  body={route.body}
                />
              ))}
            </div>
          </div>

          <WorkflowShowcase variant="platform" compact />
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <SectionIntro
              eyebrow="Controlled collaboration"
              title="Share the part, not the whole company vault."
              body="External access should be explicit, limited, and connected to the exact part, request, or project being discussed. Kordyne is designed around selected files, selected collaborators, and traceable handoffs."
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FeatureCard
                title="Selected file access"
                body="Share metadata, previews, selected files, or downloadable selected files without broad vault visibility."
              />
              <FeatureCard
                title="Threaded context"
                body="Keep comments, clarifications, quotes, and returned files attached to the part or project where the decision happened."
              />
              <FeatureCard
                title="Provider response"
                body="Give manufacturers a focused workspace to review packages, ask questions, quote, and return evidence."
              />
              <FeatureCard
                title="Project continuity"
                body="When a standalone part becomes part of a larger effort, link it to a project without duplicating the vault record."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-[8px] bg-[#003040] p-6 text-white shadow-[0_22px_60px_rgba(0,48,64,0.18)] lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.46fr] lg:items-center">
            <div>
              <Eyebrow>Built for the workflow ahead</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white">
                Bring CAD release, part truth, collaboration, and manufacturing
                handoff into one operating layer.
              </h2>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
                Start with the vault. Add part workspaces when collaboration
                starts. Create projects when the work becomes a real program.
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

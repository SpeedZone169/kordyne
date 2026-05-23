import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { WorkflowShowcase, WorkflowStrip } from "@/components/MarketingShowcase";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function CapabilityCard({
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

const flowSteps = [
  "Project",
  "CAD <-> Kordyne Vault",
  "Collaboration Space",
  "External Collaboration",
];

const internalFlow = [
  "Internal Manufacturing",
  "Machine Utilisation",
  "Scheduling",
];

const externalFlow = [
  "External Manufacturing",
  "Supplier Quote",
  "Invoicing",
  "Inventory Update",
  "Project Update",
];

function FlowPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] border border-white/12 bg-white/[0.07] px-4 py-3 text-sm font-black text-white shadow-sm">
      {children}
    </div>
  );
}

function WorkflowRouteMap() {
  return (
    <section className="bg-[#003040] py-16 text-white lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <Eyebrow>Operating flow</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              A finished workflow from project context to manufacturing
              execution.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-300">
              Kordyne keeps the part record alive as it moves through CAD,
              vault control, collaboration, provider routing, production,
              commercial response, inventory, and project status.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[8px] border border-white/12 bg-white/[0.05] p-5">
            <div className="absolute inset-0 kordyne-grid-bg opacity-50" />
            <div className="relative space-y-5">
              <div className="grid gap-3 md:grid-cols-4">
                {flowSteps.map((step) => (
                  <FlowPill key={step}>{step}</FlowPill>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[8px] border border-[#00bdde]/25 bg-[#00bdde]/10 p-4">
                  <p className="text-xs font-black uppercase text-[#8ceeff]">
                    Internal route
                  </p>
                  <div className="mt-3 grid gap-3">
                    {internalFlow.map((step) => (
                      <FlowPill key={step}>{step}</FlowPill>
                    ))}
                  </div>
                </div>

                <div className="rounded-[8px] border border-white/15 bg-white/[0.06] p-4">
                  <p className="text-xs font-black uppercase text-white/75">
                    External route
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {externalFlow.map((step) => (
                      <FlowPill key={step}>{step}</FlowPill>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#003040] text-white">
        <div className="absolute inset-0 opacity-55">
          <div className="absolute inset-0 kordyne-grid-bg" />
        </div>
        <div className="absolute inset-y-8 right-[-140px] hidden w-[760px] opacity-80 lg:block">
          <WorkflowShowcase variant="hero" compact />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div className="max-w-4xl">
            <Eyebrow>Advanced manufacturing digital thread</Eyebrow>
            <h1 className="mt-5 max-w-4xl text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
              Controlled part collaboration from CAD to manufacturing.
            </h1>
            <p className="mt-7 max-w-3xl text-xl leading-9 text-slate-200">
              One controlled workspace for part vaults, revision history,
              live file review, request routing, provider collaboration, and
              machine-connected manufacturing workflows.
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

          <div className="mt-14 lg:hidden">
            <WorkflowShowcase variant="hero" compact />
          </div>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">
          <WorkflowStrip />
        </div>
      </section>

      <WorkflowRouteMap />

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <Eyebrow>What Kordyne coordinates</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              From CAD release to manufacturing execution, without losing the
              thread.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Kordyne is shaped around the way real hardware work moves:
              designs leave Inventor or Fusion, part records collect files and
              revisions, teams review the live model, then controlled packages
              move to internal machines, providers, and external reviewers.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <CapabilityCard
              title="Part Vault"
              body="Keep STEP, STL, drawings, PDFs, images, manufacturing docs, and quality evidence attached to the correct part revision."
            />
            <CapabilityCard
              title="Live Review"
              body="Give the viewer the space it deserves: inspect 3D files, drawings, and revision context before routing work."
            />
            <CapabilityCard
              title="Requests"
              body="Create manufacturing, CAD, and optimization workflows from the exact revision and selected files."
            />
            <CapabilityCard
              title="Collaboration"
              body="Keep customer, vendor, internal, external viewer, and consultant messages linked to the part or request context."
            />
          </div>
        </div>
      </section>

      <section className="bg-[#002532] py-16 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
            <WorkflowShowcase variant="enterprise" compact />

            <div>
              <Eyebrow>Competitive edge</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
                A collaboration layer built around permissioned part truth.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                Two customer teams can work with multiple providers and outside
                consultants while keeping the vault controlled. External
                viewers can be mentioned into a specific thread without being
                handed the whole workspace.
              </p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {["Scoped access", "Revision evidence", "Provider routing"].map(
                  (item) => (
                    <div
                      key={item}
                      className="rounded-[8px] border border-white/10 bg-white/[0.06] p-4 text-sm font-bold text-white"
                    >
                      {item}
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="grid gap-4 md:grid-cols-3">
          <CapabilityCard
            title="Machine connectors"
            body="Bring printers, CNC cells, and factory resources into the same operational surface as the parts and requests they support."
          />
          <CapabilityCard
            title="Internal scheduling"
            body="See internal capacity alongside external provider options so teams can route work with better context."
          />
          <CapabilityCard
            title="Provider workspace"
            body="Give manufacturers a focused place to review packages, clarify technical questions, quote, and return files."
          />
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Eyebrow>OEM digital parts</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Certified spare-part files can become a controlled commercial
              channel for machine manufacturers.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Machine OEMs can publish approved digital part files by machine
              model, control who can access them, and let customers route those
              files into internal production or approved provider packages.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "Machine model library",
              "Licensed part files",
              "Customer entitlement",
              "Manufacturing-ready package",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[8px] border border-slate-200 bg-white p-5 text-sm font-bold text-slate-900 shadow-sm"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="max-w-4xl">
            <Eyebrow>Built for the workflow you are describing</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              High-trust part collaboration for customers, vendors, consultants,
              and machine-connected teams.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Kordyne is not just a prettier file vault. It is the operating
              layer where part context, revisions, manufacturing requests,
              messages, selected file access, and provider responses stay
              connected.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/enterprise"
                className="rounded-[8px] border border-slate-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-slate-50"
              >
                Enterprise Direction
              </Link>
              <Link
                href="/providers"
                className="rounded-[8px] bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
              >
                Provider Portal
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

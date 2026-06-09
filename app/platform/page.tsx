import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ProductFlowShowcase } from "@/components/MarketingShowcase";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function Capability({
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

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="bg-[#003040] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
          <div className="self-center">
            <Eyebrow>Platform</Eyebrow>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              How Kordyne carries part context from CAD into manufacturing.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Kordyne connects the design release, live part review, selected
              file packages, internal scheduling, external provider routing, and
              project-level collaboration spaces.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Request Demo
              </Link>
              <Link
                href="/providers"
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                Provider Workflow
              </Link>
            </div>
          </div>

          <ProductFlowShowcase />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <Eyebrow>Core model</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Built around parts, not loose files.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Every workflow starts with controlled part context. That makes the
              rest of the system cleaner: request packages, messages, viewer
              access, provider responses, and machine routing all know which
              revision they belong to.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Capability
              title="Parts Vault"
              body="Thumbnail-led vault rows, live file preview, file categories, revision families, and part information in one workspace."
            />
            <Capability
              title="Projects"
              body="A library for small and large programs where one project can carry multiple parts, requests, providers, and consultants."
            />
            <Capability
              title="Requests"
              body="Manufacturing, CAD, and optimization requests can start from a part revision or standalone uploaded files."
            />
            <Capability
              title="Collaboration"
              body="Threaded messages stay tied to the part, revision, provider package, or project context they belong to."
            />
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-0 px-5 sm:px-6 lg:grid-cols-4 lg:px-8">
          {[
            ["01", "Save from CAD", "Inventor and Fusion workflows can publish into Kordyne."],
            ["02", "Review release", "Preview model, drawing, PDF, image, and quality files."],
            ["03", "Route work", "Choose internal machines or external providers."],
            ["04", "Retain evidence", "Keep messages, files, quotes, and revision context linked."],
          ].map(([number, title, body]) => (
            <div
              key={number}
              className="border-b border-slate-200 py-6 lg:border-b-0 lg:border-r lg:px-6 last:lg:border-r-0"
            >
              <p className="text-xs font-black text-[#00bdde]">{number}</p>
              <h3 className="mt-2 text-lg font-black text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-4 lg:grid-cols-3">
          <Capability
            title="Machine connectors"
            body="Treat printers, CNC cells, and internal factory resources as machine connectors, not a narrow printer-only sidebar."
          />
          <Capability
            title="External viewers"
            body="Mention outside experts into the exact thread they need without handing over full vault access."
          />
          <Capability
            title="Provider network"
            body="Package only selected files, ask clarifying questions, receive quotes, and keep vendor communication controlled."
          />
        </div>

        <div className="mt-12 rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <Eyebrow>Platform direction</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
                From vault to operating system for advanced manufacturing
                collaboration.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                The goal is a trusted layer where customers, vendors,
                manufacturers, internal teams, and consultants coordinate around
                the same controlled part data.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#003040] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#005169]"
              >
                Request Demo
              </Link>
              <Link
                href="/providers"
                className="rounded-[8px] border border-slate-300 px-5 py-3 text-center text-sm font-black text-slate-950 transition hover:bg-slate-50"
              >
                Provider Workflow
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ControlPanelShowcase } from "@/components/MarketingShowcase";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function PricingSignal({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-[8px] border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-slate-950">{title}</h2>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
    </article>
  );
}

const pricingSignals = [
  {
    title: "Vault and revision scope",
    body: "How many teams, part families, files, revisions, previews, and controlled workspaces need to be managed.",
  },
  {
    title: "Manufacturing workflow depth",
    body: "Whether the rollout includes supplier packages, internal manufacturing, project collaboration, or returned production evidence.",
  },
  {
    title: "Connector and onboarding needs",
    body: "Which CAD connectors, beta users, data setup, training, and support are needed for a confident launch.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden bg-[#003040] text-white">
        <div className="absolute inset-0 kordyne-grid-bg opacity-70" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <Eyebrow>Pricing</Eyebrow>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Pricing is shaped around the workflow you need to control.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Kordyne is currently best introduced through a short discovery
              call. That keeps pricing aligned to your part vault, CAD
              connectors, collaboration needs, and manufacturing handoff model.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Request pricing
              </Link>
              <Link
                href="/platform"
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                View Platform
              </Link>
            </div>
          </div>

          <ControlPanelShowcase />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Contact-led for beta</Eyebrow>
          <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            No public plan grid yet.
          </h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            For early customers, the right commercial shape depends on the
            controlled workflow: part vault size, CAD connector usage, internal
            manufacturing, provider collaboration, and onboarding support.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {pricingSignals.map((item) => (
            <PricingSignal key={item.title} title={item.title} body={item.body} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-6 lg:px-8 lg:pb-20">
        <div className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.45fr] lg:items-center">
            <div>
              <Eyebrow>Next step</Eyebrow>
              <h2 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
                Start with the workflow, then price the rollout.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                A short conversation is enough to understand whether Kordyne
                should begin with a part vault, CAD connector workflow, provider
                package flow, internal manufacturing handoff, or project
                collaboration.
              </p>
            </div>
            <Link
              href="/contact"
              className="rounded-[8px] bg-[#003040] px-5 py-3 text-center text-sm font-black text-white transition hover:bg-[#005169]"
            >
              Contact Kordyne
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { WorkflowShowcase } from "@/components/MarketingShowcase";
import {
  buildProviderLoginHref,
  buildProviderSignupHref,
} from "@/lib/auth/provider-access";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function ProviderCard({
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

export default function ProvidersLandingPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="bg-[#003040] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <Eyebrow>Kordyne for providers</Eyebrow>
            <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-6xl">
              A cleaner way to receive packages, ask questions, quote, and
              return manufacturing evidence.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Approved providers get a focused workspace for controlled customer
              packages, revision context, quote response, collaboration, and
              future scheduling or status updates.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={buildProviderLoginHref("/provider")}
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Provider sign in
              </Link>
              <Link
                href={buildProviderSignupHref("/provider")}
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                Request provider access
              </Link>
            </div>
          </div>

          <WorkflowShowcase variant="providers" compact />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-4 md:grid-cols-3">
          <ProviderCard
            title="Controlled package access"
            body="Review only the files, requirements, comments, and customer context intentionally shared with your organization."
          />
          <ProviderCard
            title="Structured response"
            body="Prepare quotes, lead-time details, manufacturability notes, and clarification responses in one provider workspace."
          />
          <ProviderCard
            title="Collaboration without inbox drift"
            body="Keep customer questions, returned files, images, results, and message history tied to the package."
          />
        </div>

        <div className="mt-12 rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <Eyebrow>Provider workflow</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
                Customers keep the vault controlled. Providers get the context
                needed to manufacture with confidence.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Kordyne is designed so manufacturers can receive scoped
                packages, collaborate on exact features, submit commercial
                responses, and eventually share production status or inspection
                results back into the same thread.
              </p>
            </div>

            <div className="rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Provider surface
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Package review",
                  "Quote response",
                  "Clarification thread",
                  "Returned files",
                  "Future status updates",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ProviderWorkShowcase } from "@/components/MarketingShowcase";
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
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-14">
          <div className="self-center">
            <Eyebrow>Kordyne for providers</Eyebrow>
            <h1 className="mt-4 text-4xl font-black leading-tight text-white sm:text-5xl">
              Quote manufacturing work with clearer files and less back-and-forth.
            </h1>
            <p className="mt-6 text-base leading-8 text-slate-300 sm:text-lg">
              Kordyne gives approved manufacturing providers a clean workspace
              for incoming RFQs, revision context, technical questions, quote
              responses, and returned production evidence.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={buildProviderSignupHref("/provider")}
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Request provider access
              </Link>
              <Link
                href={buildProviderLoginHref("/provider")}
                className="rounded-[8px] border border-white/18 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                Provider sign in
              </Link>
            </div>
          </div>

          <ProviderWorkShowcase />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-4 md:grid-cols-3">
          <ProviderCard
            title="Complete RFQ context"
            body="Receive the part files, drawings, previews, notes, and revision context needed to quote with fewer missing details."
          />
          <ProviderCard
            title="Faster quote response"
            body="Keep lead time, process notes, manufacturability questions, and commercial response in one structured workspace."
          />
          <ProviderCard
            title="Cleaner customer collaboration"
            body="Ask technical questions and return production files without losing the thread across email and shared folders."
          />
        </div>

        <div className="mt-12 rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
            <div>
              <Eyebrow>Provider workflow</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
                A professional workspace for the manufacturing work you are
                invited to quote.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Instead of receiving disconnected files and unclear email
                threads, providers can review a focused package, ask questions,
                submit quote details, and return files against the same job
                record.
              </p>
            </div>

            <div className="rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Provider surface
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Incoming RFQs",
                  "File and drawing review",
                  "Technical questions",
                  "Quote response",
                  "Returned files and evidence",
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

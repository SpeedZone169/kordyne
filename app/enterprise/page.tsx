import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { ControlPanelShowcase } from "@/components/MarketingShowcase";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-black uppercase text-[#00bdde]">
      {children}
    </p>
  );
}

function EnterpriseCard({
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

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="bg-[#003040] text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <Eyebrow>Enterprise</Eyebrow>
            <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-6xl">
              Controlled part collaboration for teams that cannot afford
              ambiguous handoffs.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Kordyne is built for organizations managing high-value part IP,
              revision-sensitive production, external manufacturers, and audit
              expectations across the manufacturing lifecycle.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-[8px] bg-[#00bdde] px-5 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff]"
              >
                Talk to Kordyne
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
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow>Governance model</Eyebrow>
            <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
              Keep the full vault protected while work moves across companies.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              Enterprise workflows need more than upload and share. Kordyne is
              designed to separate full vault access from scoped request,
              project, provider, and viewer collaboration.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <EnterpriseCard
              title="Role-based access"
              body="Admins, engineers, viewers, providers, and external participants can be kept in the right context."
            />
            <EnterpriseCard
              title="Scoped external review"
              body="A consultant can be tagged into a part or request thread without gaining broad vault visibility."
            />
            <EnterpriseCard
              title="Revision evidence"
              body="Requests, files, comments, and provider responses remain linked to the exact revision under discussion."
            />
            <EnterpriseCard
              title="Project networks"
              body="Two customers, multiple providers, and specialist reviewers can work together around one controlled project."
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-3">
            <EnterpriseCard
              title="Audit-ready records"
              body="The system can preserve who shared which files, which revision was used, what was discussed, and how providers responded."
            />
            <EnterpriseCard
              title="Internal and external routing"
              body="Compare internal machine availability against external provider workflows before deciding where work should go."
            />
            <EnterpriseCard
              title="Sensitive file boundaries"
              body="Provider and viewer experiences are built around selected packages rather than uncontrolled folder access."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="rounded-[8px] border border-slate-200 bg-white p-6 shadow-sm lg:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_0.82fr] lg:items-center">
            <div>
              <Eyebrow>Enterprise direction</Eyebrow>
              <h2 className="mt-4 text-4xl font-black leading-tight text-slate-950">
                The long-term aim is trusted manufacturing infrastructure, not
                another shared drive.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Kordyne can become the place where part vaults, project
                libraries, machine connectors, requests, quotes, comments, and
                returned files stay connected for the life of the program.
              </p>
            </div>

            <div className="rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-5">
              <p className="text-xs font-black uppercase text-slate-500">
                Enterprise signals
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Part and revision ownership",
                  "Controlled provider packages",
                  "External viewer boundaries",
                  "Manufacturing request traceability",
                  "Machine and scheduling context",
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

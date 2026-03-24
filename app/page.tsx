import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
      {children}
    </p>
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
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-gray-950">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-gray-600">{body}</p>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-[32px] border border-gray-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.08)]">
      <div className="border-b border-gray-200 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
              Product view
            </p>
            <h2 className="mt-2 text-xl font-semibold text-gray-950">
              Controlled part record and manufacturing workflow
            </h2>
          </div>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Revision B approved
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-6">
        <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Part record
              </p>
              <h3 className="mt-1 text-lg font-semibold text-gray-950">
                Wing Bracket / WB-1042
              </h3>
            </div>
            <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white">
              Manufacturing-ready
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Linked files
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                CAD, drawing, spec, QC doc
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Current request
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Supplier review package
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-500">
                Ownership
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-700">
                Engineering / Manufacturing
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              Revision history
            </p>

            <div className="mt-4 space-y-3">
              {[
                {
                  title: "Revision B",
                  body: "Drawing updated and supplier package prepared",
                },
                {
                  title: "Revision A",
                  body: "Initial manufacturing-ready release",
                },
                {
                  title: "Prototype",
                  body: "Internal design validation",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-2 h-2.5 w-2.5 rounded-full bg-gray-900" />
                    <div>
                      <p className="font-medium text-gray-950">{item.title}</p>
                      <p className="mt-1 text-sm leading-6 text-gray-600">
                        {item.body}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl bg-gray-950 p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
                Why this matters
              </p>
              <p className="mt-3 text-base leading-7 text-gray-200">
                Kordyne keeps part data, revision context, and manufacturing
                execution connected in one controlled system.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                System layers
              </p>

              <div className="mt-4 space-y-2">
                {[
                  "Part record",
                  "Revision history",
                  "Request orchestration",
                  "Controlled sharing",
                  "Workspace access",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-700"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-16 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="max-w-4xl">
            <Eyebrow>Kordyne</Eyebrow>

            <h1 className="mt-4 max-w-5xl text-5xl font-semibold tracking-tight text-gray-950 sm:text-6xl lg:text-7xl lg:leading-[1.02]">
              The system of record for part data, revision control, and
              manufacturing requests.
            </h1>

            <p className="mt-8 max-w-3xl text-xl leading-9 text-gray-600">
              Kordyne gives engineering teams one secure workspace to manage
              part files, track revisions, control external sharing, and launch
              manufacturing workflows with clear traceability from design to
              execution.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-full bg-gray-950 px-6 py-3.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
              >
                Request Demo
              </Link>

              <Link
                href="/platform"
                className="rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
              >
                View Platform
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              {[
                "Part-linked files and documentation",
                "Revision-aware manufacturing workflows",
                "Controlled external file sharing",
                "Traceability from part to request",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm leading-6 text-gray-700 shadow-sm"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 text-sm font-medium text-gray-600 lg:grid-cols-4 lg:px-8">
          <div>Built for advanced manufacturing teams</div>
          <div>Structured around part-level traceability</div>
          <div>Designed for controlled collaboration</div>
          <div>Ready for real engineering workflows</div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="max-w-3xl">
          <Eyebrow>Core platform</Eyebrow>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
            Built for advanced parts, not generic file storage
          </h2>
          <p className="mt-6 text-xl leading-9 text-gray-600">
            Kordyne is designed for hardware teams managing high-value part
            data, changing revisions, and external manufacturing coordination.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <FeatureCard
            title="Parts Vault"
            body="Keep CAD files, drawings, images, manufacturing documents, and quality records connected to the exact part and revision they belong to."
          />
          <FeatureCard
            title="Revision Control"
            body="Track what changed, what was approved, and what was sent, with requests tied to the exact revision under review or manufacture."
          />
          <FeatureCard
            title="Controlled Sharing"
            body="Select exactly which files belong to a request before anything moves outside your workspace."
          />
          <FeatureCard
            title="Manufacturing Workflows"
            body="Start manufacturing, CAD, or optimization requests from the part record with clearer visibility and context."
          />
        </div>
      </section>

      <section className="bg-gray-950 py-20 text-white lg:py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <Eyebrow>Why teams choose Kordyne</Eyebrow>
              <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Built for control, clarity, and coordination.
              </h2>
              <p className="mt-6 max-w-2xl text-xl leading-9 text-gray-300">
                Kordyne replaces disconnected folders, email threads, and
                unclear handoffs with one system for structured part data,
                revision history, and manufacturing execution.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold text-white">
                  Controlled records
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                  Keep files, documentation, and quality records tied to the
                  correct part and revision.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold text-white">
                  Revision-linked execution
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                  Launch requests from the part record and keep every workflow
                  tied to the exact revision under review.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <h3 className="text-xl font-semibold text-white">
                  Secure external collaboration
                </h3>
                <p className="mt-3 text-sm leading-7 text-gray-300">
                  Share only the files that belong to a request and maintain
                  clearer boundaries around sensitive part data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm">
            <Eyebrow>For engineering teams</Eyebrow>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              Reduce friction between design, revision, and sourcing
            </h3>
            <p className="mt-5 text-base leading-8 text-gray-600">
              Replace scattered files and disconnected supplier threads with one
              operating layer for part history, request context, and
              manufacturing readiness.
            </p>
          </div>

          <div className="rounded-[32px] border border-gray-200 bg-white p-8 shadow-sm">
            <Eyebrow>For manufacturing partners</Eyebrow>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950">
              A cleaner way to receive and manage request data
            </h3>
            <p className="mt-5 text-base leading-8 text-gray-600">
              Give providers clearer file context, revision traceability, and
              better-structured requests across advanced manufacturing
              workflows.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-8 lg:pb-28">
        <div className="rounded-[36px] border border-gray-200 bg-white p-8 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-10 lg:p-14">
          <div className="max-w-4xl">
            <Eyebrow>The bigger vision</Eyebrow>

            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl lg:leading-tight">
              Digital infrastructure for trusted advanced manufacturing
              collaboration.
            </h2>

            <p className="mt-6 text-xl leading-9 text-gray-600">
              Kordyne brings part data, revision history, manufacturing
              requests, and cross-company coordination into one controlled
              environment built for real hardware workflows.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/enterprise"
                className="rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
              >
                View Enterprise Direction
              </Link>

              <Link
                href="/contact"
                className="rounded-full bg-gray-950 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                Talk to Kordyne
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
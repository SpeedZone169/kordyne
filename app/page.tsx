import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid gap-16 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
          <div className="max-w-4xl">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Kordyne
            </p>

            <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl">
              The secure bridge between part design and manufacturing
            </h1>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
              Kordyne helps engineering teams store advanced part files, manage
              revisions, and launch manufacturing workflows from one controlled
              workspace. From 3D printing and CNC to composite manufacturing,
              Kordyne connects part data to real execution.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
              >
                Request Demo
              </Link>

              <Link
                href="/platform"
                className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Explore Platform
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="rounded-full bg-gray-100 px-4 py-2">
                Secure part vault
              </span>
              <span className="rounded-full bg-gray-100 px-4 py-2">
                Revision-aware workflows
              </span>
              <span className="rounded-full bg-gray-100 px-4 py-2">
                Controlled file sharing
              </span>
              <span className="rounded-full bg-gray-100 px-4 py-2">
                Manufacturing request orchestration
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Why teams use Kordyne
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold">One place for part data</h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Keep CAD, drawings, images, manufacturing documents, and
                  quality files linked to the exact part and revision they belong to.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Better control before sharing
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Select exactly which files belong to a request before anything
                  moves outside your workspace.
                </p>
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Built for real manufacturing workflows
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  Launch requests for manufacturing, CAD creation, and
                  optimization with clear traceability from part to revision.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-24">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Core platform
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Built for advanced parts, not generic file storage
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Kordyne is designed for hardware teams managing high-value part
              data, changing revisions, and external manufacturing coordination.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Parts Vault</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Centralize CAD files, drawings, images, manufacturing documents,
                and quality records in one structured workspace.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Revision Control</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Track related revisions, record what changed, and keep requests
                tied to the exact revision being reviewed or manufactured.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Manufacturing Workflows</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Start manufacturing, CAD creation, or optimization requests from
                the part record and manage them with better visibility.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-24 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              For engineering teams
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              Reduce friction between design, revision, and sourcing
            </h3>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Stop losing context across folders, emails, and disconnected
              supplier conversations. Kordyne gives teams one operating layer
              for part history, request context, and manufacturing readiness.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              For manufacturing partners
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              A cleaner way to receive and manage request data
            </h3>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Kordyne is being shaped to support trusted provider collaboration
              with clearer file context, revision traceability, and better
              request structure across advanced manufacturing workflows.
            </p>
          </div>
        </div>

        <div className="mt-24 rounded-3xl border border-gray-200 p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              The bigger vision
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Kordyne is building digital infrastructure for trusted advanced
              manufacturing collaboration
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              The long-term direction is not just part storage or procurement.
              It is a secure system for managing part data, revision history,
              manufacturing requests, and cross-company collaboration in one
              controlled environment.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/enterprise"
                className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                View Enterprise Direction
              </Link>

              <Link
                href="/contact"
                className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
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
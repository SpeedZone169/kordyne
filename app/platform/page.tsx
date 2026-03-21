import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Platform
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            One secure system for part data, revisions, and manufacturing workflows
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Kordyne gives engineering teams a structured workspace to manage part
            records, revision history, file context, and external manufacturing
            requests. It is designed for advanced parts that move across 3D
            printing, CNC machining, and composite manufacturing workflows.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Parts Vault</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Centralize CAD files, drawings, images, manufacturing documents,
              and quality records in one structured workspace tied to the correct
              part and revision.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Revision Control</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Track related revisions, record what changed, and maintain a clear
              link between historical versions and the current part state.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Controlled File Context</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Choose exactly which files belong to a request instead of exposing
              everything by default. This helps protect sensitive IP and improves
              request quality.
            </p>
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Workflow layer
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Start real engineering and manufacturing requests from the part record
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Kordyne lets teams launch manufacturing, CAD creation, and
              optimization requests directly from the part page. Requests remain
              linked to the exact part revision and selected files, improving
              clarity before any external collaboration begins.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Advanced manufacturing
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Built for 3D printing, CNC, and composite workflows
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Kordyne is being designed for teams working across multiple
              manufacturing routes, where file control, revision accuracy, and
              request structure matter as much as cost and lead time.
            </p>
          </div>
        </div>

        <div className="mt-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Core capabilities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              A platform designed for controlled collaboration
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Kordyne is not built as a generic file repository or a simple
              procurement portal. It is being shaped as the digital layer between
              engineering teams, part data, and trusted manufacturing execution.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Organization workspaces</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Teams work inside company-controlled environments with roles,
                member access, and shared visibility across part records and
                requests.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Revision-aware requests</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Requests stay linked to the exact revision being reviewed or
                manufactured, reducing confusion and improving accountability.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Structured request history</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Teams can track request progress, understand what was submitted,
                and keep a clearer record of manufacturing activity over time.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Foundation for trusted providers</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                The long-term direction is a cleaner collaboration model between
                hardware teams and trusted external manufacturers, with better
                data structure and traceability.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-gray-200 p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Platform direction
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From secure part storage to trusted manufacturing coordination
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Kordyne is evolving toward a platform for controlled part data
              exchange, revision traceability, and manufacturing collaboration
              across organizations and providers.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/enterprise"
                className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Explore Enterprise
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
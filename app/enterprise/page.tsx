import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-4xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Enterprise
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Built for hardware teams that need control, traceability, and secure
            manufacturing collaboration
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600">
            Kordyne is designed for organizations managing high-value part data,
            revision-sensitive workflows, and external manufacturing coordination.
            It gives teams a structured system for part storage, controlled file
            sharing, and manufacturing requests across advanced production routes.
          </p>

          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/contact"
              className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Talk to Kordyne
            </Link>

            <Link
              href="/platform"
              className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
            >
              View Platform
            </Link>
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Organization model
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Company-controlled workspaces, not scattered user files
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Kordyne is built around organization workspaces with role-based
              access, team visibility, and shared ownership of part data. That
              means hardware teams can manage advanced parts inside one
              structured environment instead of relying on disconnected folders,
              inboxes, and personal file chains.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Revision confidence
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Keep manufacturing tied to the exact revision being reviewed
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              Kordyne links requests to the exact part revision and lets teams
              control which files move with that request. This reduces ambiguity,
              supports cleaner handoffs, and helps prevent the wrong revision or
              the wrong file set from being shared externally.
            </p>
          </div>
        </div>

        <div className="mt-20">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
              Enterprise priorities
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Designed for secure collaboration across engineering and manufacturing
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Enterprise teams do not just need storage. They need structure,
              governance, and a clear system for how part data moves from design
              to sourcing and production.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Role-based team access</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Give admins, engineers, and viewers the right level of access to
                parts, files, requests, and organization settings.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Controlled file exposure</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Share only the files relevant to a specific request instead of
                exposing the full part record by default.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Revision-aware workflows</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Maintain a clear history of what changed, which revision is
                current, and which revision was used for a given request.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold">Manufacturing coordination</h3>
              <p className="mt-3 text-sm leading-6 text-gray-600">
                Structure requests for manufacturing, CAD creation, and
                optimization in a way that is easier to manage internally and
                cleaner to hand off externally.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              IP-sensitive workflows
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              Better control before data leaves your workspace
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              For advanced parts, file control is not a minor feature. It is a
              core requirement. Kordyne is being shaped to help teams prepare,
              limit, and track what gets shared with external providers so
              collaboration is more deliberate and easier to govern.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Trusted provider direction
            </p>
            <h2 className="mt-3 text-2xl font-semibold">
              A foundation for cleaner supplier and manufacturing collaboration
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-600">
              The long-term enterprise direction is not just quoting software. It
              is trusted manufacturing collaboration infrastructure: structured
              requests, revision traceability, controlled document exchange, and
              better coordination across internal teams and external providers.
            </p>
          </div>
        </div>

        <div className="mt-20 rounded-3xl border border-gray-200 p-8 shadow-sm sm:p-10">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-gray-500">
              Enterprise direction
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Kordyne is being built as digital infrastructure for advanced part
              collaboration
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              The goal is to give organizations one secure layer for part data,
              revision history, manufacturing requests, and trusted external
              collaboration. That makes Kordyne relevant not only as internal
              software, but as infrastructure for cross-company manufacturing
              workflows.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Contact Kordyne
              </Link>

              <Link
                href="/platform"
                className="rounded-2xl border border-gray-300 px-6 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Explore the Platform
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
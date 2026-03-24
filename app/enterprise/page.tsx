import Link from "next/link";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold uppercase tracking-[0.22em] text-gray-500">
      {children}
    </p>
  );
}

function CardBlock({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[28px] border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
      <h3 className="text-xl font-semibold tracking-tight text-gray-950">
        {title}
      </h3>
      <p className="mt-3 text-sm leading-7 text-gray-600 sm:text-[15px]">
        {body}
      </p>
    </div>
  );
}

function HighlightCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[32px] border border-gray-200 bg-white p-7 shadow-sm sm:p-8">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-950 sm:text-3xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-8 text-gray-600">{body}</p>
    </div>
  );
}

export default function EnterprisePage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="max-w-5xl">
          <Eyebrow>Enterprise</Eyebrow>

          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl lg:leading-[1.04]">
            Built for hardware teams that need control, traceability, and secure
            manufacturing collaboration.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
            Kordyne is designed for organizations managing high-value part data,
            revision-sensitive workflows, and external manufacturing
            coordination. It gives teams a structured system for part storage,
            controlled file sharing, and manufacturing requests across advanced
            production routes.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Talk to Kordyne
            </Link>

            <Link
              href="/platform"
              className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
            >
              View Platform
            </Link>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <HighlightCard
            eyebrow="Organization model"
            title="Company-controlled workspaces, not scattered user files."
            body="Kordyne is built around organization workspaces with role-based access, team visibility, and shared ownership of part data. That means hardware teams can manage advanced parts inside one structured environment instead of relying on disconnected folders, inboxes, and personal file chains."
          />

          <HighlightCard
            eyebrow="Revision confidence"
            title="Keep manufacturing tied to the exact revision being reviewed."
            body="Kordyne links requests to the exact part revision and lets teams control which files move with that request. This reduces ambiguity, supports cleaner handoffs, and helps prevent the wrong revision or wrong file set from being shared externally."
          />
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="max-w-3xl">
            <Eyebrow>Enterprise priorities</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              Designed for secure collaboration across engineering and
              manufacturing.
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
              Enterprise teams do not just need storage. They need structure,
              governance, and a clear system for how part data moves from design
              to sourcing and production.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CardBlock
              title="Role-based team access"
              body="Give admins, engineers, and viewers the right level of access to parts, files, requests, and organization settings."
            />

            <CardBlock
              title="Controlled file exposure"
              body="Share only the files relevant to a specific request instead of exposing the full part record by default."
            />

            <CardBlock
              title="Revision-aware workflows"
              body="Maintain a clear history of what changed, which revision is current, and which revision was used for a given request."
            />

            <CardBlock
              title="Manufacturing coordination"
              body="Structure requests for manufacturing, CAD creation, and optimization in a way that is easier to manage internally and cleaner to hand off externally."
            />
          </div>
        </div>

        <div className="mt-16 grid gap-6 lg:mt-20 lg:grid-cols-2">
          <HighlightCard
            eyebrow="IP-sensitive workflows"
            title="Better control before data leaves your workspace."
            body="For advanced parts, file control is not a minor feature. It is a core requirement. Kordyne is being shaped to help teams prepare, limit, and track what gets shared with external providers so collaboration is more deliberate and easier to govern."
          />

          <HighlightCard
            eyebrow="Trusted provider direction"
            title="A foundation for cleaner supplier and manufacturing collaboration."
            body="The long-term enterprise direction is not just quoting software. It is trusted manufacturing collaboration infrastructure: structured requests, revision traceability, controlled document exchange, and better coordination across internal teams and external providers."
          />
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="rounded-[36px] border border-gray-200 bg-white p-7 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-10 lg:p-14">
            <div className="max-w-4xl">
              <Eyebrow>Enterprise direction</Eyebrow>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl lg:leading-tight">
                Kordyne is being built as digital infrastructure for advanced
                part collaboration.
              </h2>

              <p className="mt-5 text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
                The goal is to give organizations one secure layer for part
                data, revision history, manufacturing requests, and trusted
                external collaboration. That makes Kordyne relevant not only as
                internal software, but as infrastructure for cross-company
                manufacturing workflows.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Contact Kordyne
                </Link>

                <Link
                  href="/platform"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Explore the Platform
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
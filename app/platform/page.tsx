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

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="max-w-5xl">
          <Eyebrow>Platform</Eyebrow>

          <h1 className="mt-4 max-w-5xl text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl lg:text-6xl lg:leading-[1.04]">
            One secure system for part data, revisions, and manufacturing
            workflows.
          </h1>

          <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
            Kordyne gives engineering teams a structured workspace to manage
            part records, revision history, file context, and external
            manufacturing requests. It is designed for advanced parts that move
            across 3D printing, CNC machining, and composite manufacturing
            workflows.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          <CardBlock
            title="Parts Vault"
            body="Centralize CAD files, drawings, images, manufacturing documents, and quality records in one structured workspace tied to the correct part and revision."
          />

          <CardBlock
            title="Revision Control"
            body="Track related revisions, record what changed, and maintain a clear link between historical versions and the current part state."
          />

          <CardBlock
            title="Controlled File Context"
            body="Choose exactly which files belong to a request instead of exposing everything by default. This helps protect sensitive IP and improves request quality."
          />
        </div>

        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-2">
          <HighlightCard
            eyebrow="Workflow layer"
            title="Start real engineering and manufacturing requests from the part record."
            body="Kordyne lets teams launch manufacturing, CAD creation, and optimization requests directly from the part page. Requests remain linked to the exact part revision and selected files, improving clarity before any external collaboration begins."
          />

          <HighlightCard
            eyebrow="Advanced manufacturing"
            title="Built for 3D printing, CNC, and composite workflows."
            body="Kordyne is being designed for teams working across multiple manufacturing routes, where file control, revision accuracy, and request structure matter as much as cost and lead time."
          />
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="max-w-3xl">
            <Eyebrow>Core capabilities</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
              A platform designed for controlled collaboration.
            </h2>
            <p className="mt-5 text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
              Kordyne is not built as a generic file repository or a simple
              procurement portal. It is being shaped as the digital layer
              between engineering teams, part data, and trusted manufacturing
              execution.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <CardBlock
              title="Organization workspaces"
              body="Teams work inside company-controlled environments with roles, member access, and shared visibility across part records and requests."
            />

            <CardBlock
              title="Revision-aware requests"
              body="Requests stay linked to the exact revision being reviewed or manufactured, reducing confusion and improving accountability."
            />

            <CardBlock
              title="Structured request history"
              body="Teams can track request progress, understand what was submitted, and keep a clearer record of manufacturing activity over time."
            />

            <CardBlock
              title="Foundation for trusted providers"
              body="The long-term direction is a cleaner collaboration model between hardware teams and trusted external manufacturers, with better data structure and traceability."
            />
          </div>
        </div>

        <div className="mt-16 sm:mt-20">
          <div className="rounded-[36px] border border-gray-200 bg-white p-7 shadow-[0_12px_40px_rgba(15,23,42,0.06)] sm:p-10 lg:p-14">
            <div className="max-w-4xl">
              <Eyebrow>Platform direction</Eyebrow>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl lg:text-5xl lg:leading-tight">
                From secure part storage to trusted manufacturing coordination.
              </h2>

              <p className="mt-5 text-lg leading-8 text-gray-600 sm:text-xl sm:leading-9">
                Kordyne is evolving toward a platform for controlled part data
                exchange, revision traceability, and manufacturing collaboration
                across organizations and providers.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/enterprise"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Explore Enterprise
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Talk to Kordyne
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
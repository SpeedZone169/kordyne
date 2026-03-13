import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function PlatformPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Platform
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            One platform for part storage, quoting, and manufacturing workflows
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Kordyne helps engineering teams store part files, manage revisions,
            request quotes, and compare manufacturing options across 3D
            printing, CNC, and composites.
          </p>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2">
          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Parts Vault</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Centralize CAD files, part history, revisions, and documentation
              in one secure workspace.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Quote Management</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Request quotes faster and compare manufacturing routes based on
              cost, lead time, and performance.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Process Comparison</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Evaluate whether a part should be 3D printed, CNC machined, or
              produced with composite methods.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Enterprise Readiness</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Built for teams that need structure, visibility, and scalable
              manufacturing workflows.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
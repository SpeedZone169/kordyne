import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Kordyne
          </p>

          <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Digital infrastructure for advanced parts
          </h1>

          <p className="mt-6 text-lg leading-8 text-gray-600">
            Store, quote, and source engineered parts across 3D printing, CNC,
            and composite workflows from one enterprise-ready platform.
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
              View Platform
            </Link>
          </div>
        </div>

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Parts Vault</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Securely store CAD files, revisions, and manufacturing history in
              one place.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Quote Workflows</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Request and manage quotes for composite parts, 3D printed parts,
              and CNC work with clarity.
            </p>
          </div>

          <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Manufacturing Intelligence</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              Compare processes and choose the best manufacturable version for
              performance, lead time, and cost.
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
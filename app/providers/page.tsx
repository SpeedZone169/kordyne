import Link from "next/link";
import {
  buildProviderLoginHref,
  buildProviderSignupHref,
} from "@/lib/auth/provider-access";

export default function ProvidersLandingPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-16 lg:px-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="max-w-4xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Kordyne for providers
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
            A secure workspace for reviewing customer packages and responding
            with confidence
          </h1>
          <p className="text-base text-slate-600">
            The Kordyne Provider Portal gives approved manufacturing partners a
            focused environment for package review, quoting, and future
            scheduling and collaboration workflows.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={buildProviderLoginHref("/provider")}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Provider sign in
            </Link>
            <Link
              href={buildProviderSignupHref("/provider")}
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Request provider access
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Controlled package access
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Review only the files, requirements, and customer context explicitly
            shared with your organization.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Structured commercial response
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Prepare quote responses inside a focused provider workspace instead
            of managing fragmented email threads.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Foundation for operations
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Kordyne’s provider surface is designed to grow into status updates,
            planning, messaging, and ongoing customer collaboration.
          </p>
        </div>
      </section>
    </div>
  );
}
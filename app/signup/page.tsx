import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <section className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-24">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Customer onboarding
            </p>

            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 lg:text-6xl">
              Customer access is currently by approval and invitation
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600">
              Kordyne customer accounts are not open for public self-signup yet.
              Companies are onboarded directly, assigned a plan, and invited
              into the platform once approved.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90"
              >
                Contact Kordyne
              </Link>

              <Link
                href="/platform"
                className="rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Explore platform
              </Link>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              How onboarding works
            </p>

            <div className="mt-6 space-y-5">
              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <p className="text-sm font-semibold text-slate-950">
                  1. Initial discussion
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  You contact Kordyne and we review your manufacturing,
                  engineering, and collaboration needs.
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <p className="text-sm font-semibold text-slate-950">
                  2. Plan and onboarding approval
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your company is configured internally with a plan, seat limit,
                  and onboarding status before user access is enabled.
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
                <p className="text-sm font-semibold text-slate-950">
                  3. Admin invite
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Your company admin receives an invite link and completes
                  account setup through the secure invite flow.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-[24px] border border-zinc-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-950">
                Already invited?
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the invite link from your email to complete your account.
              </p>
              <Link
                href="/login"
                className="mt-4 inline-flex rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
              >
                Go to login
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";
import { buildProviderLoginHref } from "@/lib/auth/provider-access";

export default function ProviderSignupPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-145px)] w-full max-w-6xl items-center px-4 py-16 lg:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Provider onboarding
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Provider access is invite-led
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Kordyne connects providers intentionally to customer organizations.
            Access is best managed through invitation and provider organization
            setup rather than open self-serve signup.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={buildProviderLoginHref("/provider")}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              I already have access
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Contact Kordyne
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Recommended onboarding flow
          </h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <p>Create or identify the provider organization.</p>
            <p>Link the provider organization to the customer organization.</p>
            <p>Invite provider users into that organization.</p>
            <p>Route published packages into the provider portal.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
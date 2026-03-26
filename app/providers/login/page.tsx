import Link from "next/link";
import { buildProviderLoginHref } from "@/lib/auth/provider-access";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
  }>;
};

export default async function ProviderLoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const next = resolvedSearchParams.next || "/provider";
  const loginHref = buildProviderLoginHref(next);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-145px)] w-full max-w-6xl items-center px-4 py-16 lg:px-6">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            Provider sign in
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
            Access the Kordyne provider workspace
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Sign in with the invited account linked to your provider
            organization. You’ll land in the provider portal rather than the
            customer dashboard.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              Continue to sign in
            </Link>
            <Link
              href="/providers/signup"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Need access?
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            What this portal helps providers do
          </h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <p>Review published customer packages in one controlled workspace.</p>
            <p>Prepare structured quote responses with clear package context.</p>
            <p>Work from a provider-specific portal built for future scheduling and collaboration.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
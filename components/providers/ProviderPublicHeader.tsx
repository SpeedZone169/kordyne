import Image from "next/image";
import Link from "next/link";
import { buildProviderLoginHref } from "@/lib/auth/provider-access";

export default function ProviderPublicHeader() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
        <Link href="/providers" className="flex items-center gap-3">
          <Image
            src="/kordyne-logo.svg"
            alt="Kordyne"
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <div>
            <p className="text-sm font-medium text-slate-500">Kordyne</p>
            <p className="text-lg font-semibold text-slate-900">
              Provider Portal
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/providers"
            className="hidden rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 md:inline-flex"
          >
            Providers
          </Link>
          <Link
            href={buildProviderLoginHref("/provider")}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}
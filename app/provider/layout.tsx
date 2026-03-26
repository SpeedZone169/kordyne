import type { ReactNode } from "react";
import Link from "next/link";
import ProviderShellNav from "@/components/providers/ProviderShellNav";
import { requireProviderUser } from "@/lib/auth/provider-access";

export default async function ProviderLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireProviderUser();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:flex-row lg:px-6">
        <ProviderShellNav />
        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <p>Kordyne Provider Portal</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="/contact" className="hover:text-slate-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
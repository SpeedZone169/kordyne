import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProviderContext, isProviderOnlyUser } from "@/lib/auth/provider-access";
import LogoutButton from "./LogoutButton";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/parts", label: "Parts" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/organization", label: "Organization" },
  { href: "/dashboard/account", label: "Account" },
  { href: "/dashboard/insights", label: "Insights" },
];

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const providerContext = await getProviderContext();

  if (providerContext && isProviderOnlyUser(providerContext)) {
    redirect("/provider");
  }

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-[#f5f5f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:px-10">
          <Link href="/dashboard" className="flex shrink-0 items-center">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={260}
              height={64}
              priority
              className="h-11 w-auto object-contain"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-8 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <LogoutButton />
          </div>
        </div>

        <div className="border-t border-zinc-200 px-6 py-3 lg:hidden">
          <nav className="flex flex-wrap gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</main>

      <footer className="mt-12 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between lg:px-10">
          <p>Kordyne Customer Workspace</p>
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
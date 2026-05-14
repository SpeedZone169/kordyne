import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProviderContext, isProviderOnlyUser } from "@/lib/auth/provider-access";
import LogoutButton from "./LogoutButton";

const primaryNavItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/parts", label: "Parts" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/insights", label: "Insights" },
];

const operationsNavItems = [
  { href: "/dashboard/internal-manufacturing", label: "Internal Manufacturing" },
  { href: "/dashboard/design-connectors", label: "Design Connectors" },
];

const adminNavItems = [
  { href: "/dashboard/organization", label: "Organization" },
  { href: "/dashboard/account", label: "Account" },
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
    <div className="min-h-screen bg-[#eef3f7] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#081321] text-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col px-4 py-5">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#1c5d8f] text-sm font-bold">
                K
              </span>
              <span>
                <span className="block text-[15px] font-semibold uppercase tracking-[0.18em]">
                  Kordyne
                </span>
                <span className="block text-xs text-slate-400">
                  Manufacturing OS
                </span>
              </span>
            </Link>

            <nav className="mt-8 space-y-6">
              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Workspace
                </p>
                <div className="mt-3 space-y-1">
                  {primaryNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Operations
                </p>
                <div className="mt-3 space-y-1">
                  {operationsNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div>
                <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Admin
                </p>
                <div className="mt-3 space-y-1">
                  {adminNavItems.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </nav>

            <div className="mt-auto rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Secure Session
              </p>
              <div className="mt-3">
                <LogoutButton />
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#eef3f7]/90 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-7 2xl:px-9">
              <Link href="/dashboard" className="font-semibold text-slate-950 lg:hidden">
                Kordyne
              </Link>

              <nav className="hidden min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:flex">
                {[...primaryNavItems, ...operationsNavItems, ...adminNavItems].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-white hover:text-slate-950"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3 lg:hidden">
              <nav className="flex gap-2 overflow-x-auto">
                {[...primaryNavItems, ...operationsNavItems, ...adminNavItems].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </header>

          <main className="w-full px-4 py-5 lg:px-7 lg:py-7 2xl:px-9">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

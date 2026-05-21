import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getProviderContext, isProviderOnlyUser } from "@/lib/auth/provider-access";
import ShellIcon from "@/components/ShellIcon";
import ThemeToggle from "@/components/ThemeToggle";
import LogoutButton from "./LogoutButton";

const primaryNavItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/parts", label: "Part Vault" },
  { href: "/dashboard/projects", label: "Projects" },
  { href: "/dashboard/requests", label: "Requests" },
  { href: "/dashboard/internal-manufacturing/schedule", label: "Schedule" },
  { href: "/dashboard/insights", label: "Insights" },
  { href: "/dashboard/collaboration", label: "Collaboration" },
];

const railNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/dashboard/parts", label: "Part Vault", icon: "vault" },
  { href: "/dashboard/projects", label: "Projects", icon: "projects" },
  { href: "/dashboard/requests", label: "Requests", icon: "requests" },
  { href: "/dashboard/collaboration", label: "Collaboration", icon: "network" },
  { href: "/dashboard/insights", label: "Insights", icon: "insights" },
  { href: "/dashboard/internal-manufacturing", label: "Internal manufacturing", icon: "manufacturing" },
  { href: "/dashboard/internal-manufacturing/connectors", label: "Machine connectors", icon: "machine" },
  { href: "/dashboard/internal-manufacturing/schedule", label: "Internal scheduling", icon: "calendar" },
  { href: "/dashboard/design-connectors", label: "CAD connectors", icon: "plug" },
] as const;

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
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#1c2430] text-white shadow-[0_10px_30px_rgba(2,8,23,0.18)]">
        <div className="flex min-h-[60px] items-center gap-4 px-4 lg:px-5">
          <Link
            href="/"
            className="flex min-w-[148px] items-center rounded-[10px] bg-white/95 px-3 py-1.5 shadow-sm transition hover:bg-white"
            aria-label="Kordyne home"
          >
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={172}
              height={44}
              priority
              className="h-8 w-auto object-contain"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap border-b-2 border-transparent px-3 py-5 text-sm font-semibold text-slate-300 transition hover:border-[#e08a49] hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Link
              href="/dashboard/account"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-bold text-white transition hover:bg-white/15"
              aria-label="Open account profile"
            >
              <ShellIcon name="account" className="h-5 w-5" />
            </Link>
            <Link
              href="/dashboard/organization"
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sm font-bold text-white transition hover:bg-white/15 sm:flex"
              aria-label="Open settings"
            >
              <ShellIcon name="settings" className="h-5 w-5" />
            </Link>
            <LogoutButton variant="header" />
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {primaryNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full border border-white/10 bg-white/[0.06] px-3 py-2 text-xs font-semibold text-slate-200"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <div className="grid min-h-[calc(100vh-60px)] lg:grid-cols-[64px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--shell-border)] bg-[var(--shell-surface)] lg:block">
          <div className="sticky top-[60px] flex h-[calc(100vh-60px)] flex-col items-center gap-3 py-4">
            {railNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-transparent text-xs font-bold text-slate-500 transition hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950"
                aria-label={item.label}
                title={item.label}
              >
                <ShellIcon name={item.icon} className="h-5 w-5" />
              </Link>
            ))}

            <div className="mt-auto px-2">
              <LogoutButton />
            </div>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-5 lg:px-6 lg:py-6 2xl:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

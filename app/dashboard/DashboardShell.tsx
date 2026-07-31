"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/BrandLogo";
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
  { href: "/dashboard/requests", label: "Service Requests", icon: "requests" },
  { href: "/dashboard/collaboration", label: "Collaboration", icon: "network" },
  { href: "/dashboard/internal-manufacturing/schedule", label: "Schedule", icon: "calendar" },
  { href: "/dashboard/insights", label: "Insights", icon: "insights" },
  { href: "/dashboard/design-connectors", label: "Design Connectors", icon: "plug" },
  { href: "/dashboard/organization", label: "Organisation", icon: "manufacturing" },
] as const;

export default function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/dashboard") {
    return <>{children}</>;
  }

  if (pathname === "/dashboard/parts") {
    return (
      <div className="flex min-h-screen w-full bg-white text-[#003040]">
        <aside className="group/sidebar fixed left-0 top-0 z-[100] flex h-full w-20 flex-col overflow-hidden border-r border-white/10 bg-[#001220] shadow-[8px_0_30px_rgba(0,18,32,0.28)] transition-all duration-300 ease-in-out hover:w-56 hover:shadow-[12px_0_42px_rgba(0,18,32,0.36)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(0,18,32,0.99),rgba(0,24,39,0.97)_42%,rgba(0,18,32,0.99))]" />

          <Link
            href="/dashboard"
            prefetch={false}
            className="relative mx-4 mt-5 flex h-14 items-center overflow-hidden rounded-xl text-white transition-all duration-300 group-hover/sidebar:mx-5"
            aria-label="Kordyne dashboard"
          >
            <span className="block h-12 w-[39px] shrink-0 overflow-hidden transition-all duration-300 group-hover/sidebar:w-0 group-hover/sidebar:opacity-0">
              <Image
                src="/kordyne-logo-white.svg"
                alt=""
                width={188}
                height={48}
                className="h-12 w-[188px] max-w-none object-left"
                priority
              />
            </span>
            <span className="absolute left-0 flex h-12 w-[188px] items-center opacity-0 transition-all duration-300 group-hover/sidebar:opacity-100">
              <Image
                src="/kordyne-logo-white.svg"
                alt="Kordyne"
                width={188}
                height={48}
                className="h-10 w-auto"
                priority
              />
            </span>
          </Link>

          <nav className="relative flex flex-1 flex-col gap-1 overflow-hidden px-2.5 py-5">
            {railNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={false}
                  className={`group flex h-14 w-full items-center justify-center gap-0 rounded-xl px-0 transition-all duration-150 group-hover/sidebar:justify-start group-hover/sidebar:gap-3 group-hover/sidebar:px-3 ${
                    isActive
                      ? "bg-[#00bdde]/16 text-white"
                      : "text-white/70 hover:bg-[#00bdde]/10 hover:text-[#00bdde]"
                  }`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 ${
                      isActive
                        ? "bg-[#00bdde] text-[#001827]"
                        : "bg-white/[0.06] text-white ring-1 ring-white/10 group-hover:bg-[#00bdde] group-hover:text-[#001827] group-hover:ring-[#00bdde]"
                    }`}
                  >
                    <ShellIcon name={item.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="w-0 overflow-hidden whitespace-nowrap text-[13px] opacity-0 transition-all duration-300 group-hover/sidebar:w-36 group-hover/sidebar:opacity-100">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="ml-20 min-w-0 flex-1 bg-white px-4 pb-8 pt-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#1c2430] text-white shadow-[0_10px_30px_rgba(2,8,23,0.18)]">
        <div className="flex min-h-[60px] items-center gap-4 px-4 lg:px-5">
          <Link
            href="/"
            className="flex min-w-[148px] items-center rounded-[10px] px-2 py-1.5 transition hover:bg-white/5"
            aria-label="Kordyne home"
          >
            <BrandLogo mode="white" priority heightClassName="h-8" />
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

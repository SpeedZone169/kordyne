import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireProviderUser } from "@/lib/auth/provider-access";
import { enforceMfaOrRedirect } from "@/lib/auth/mfa";
import ShellIcon from "@/components/ShellIcon";
import ProviderLogoutButton from "@/components/providers/ProviderLogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

const providerNavItems = [
  { href: "/provider", label: "Dashboard" },
  { href: "/provider/requests", label: "Requests" },
  { href: "/provider/schedule", label: "Schedule" },
  { href: "/provider/capabilities", label: "Capabilities" },
  { href: "/provider/company", label: "Company" },
];

const providerRailItems = [
  { href: "/provider", label: "Dashboard", icon: "dashboard" },
  { href: "/provider/requests", label: "Requests", icon: "requests" },
  { href: "/provider/schedule", label: "Schedule", icon: "calendar" },
  { href: "/provider/capabilities", label: "Capabilities", icon: "manufacturing" },
  { href: "/provider/company", label: "Company", icon: "settings" },
] as const;

function getProviderMemberRole(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;

  const topLevel = value as {
    memberRole?: unknown;
    organization?: unknown;
  };

  if (typeof topLevel.memberRole === "string") {
    return topLevel.memberRole;
  }

  if (topLevel.organization && typeof topLevel.organization === "object") {
    const organization = topLevel.organization as {
      memberRole?: unknown;
    };

    if (typeof organization.memberRole === "string") {
      return organization.memberRole;
    }
  }

  return null;
}

export default async function ProviderLayout({
  children,
}: {
  children: ReactNode;
}) {
  const providerUser = await requireProviderUser();
  const providerRole = getProviderMemberRole(providerUser);

  if (providerRole === "admin") {
    await enforceMfaOrRedirect("/provider");
  }

  return (
    <div className="min-h-screen bg-[var(--shell-bg)] text-[var(--foreground)]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#1c2430] text-white shadow-[0_10px_30px_rgba(2,8,23,0.18)]">
        <div className="flex min-h-[72px] items-center gap-4 px-4 lg:px-6">
          <Link
            href="/"
            className="flex min-w-[174px] items-center rounded-[10px] bg-white/95 px-3 py-2 shadow-sm transition hover:bg-white"
            aria-label="Kordyne home"
          >
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={172}
              height={44}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>

          <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
            {providerNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap border-b-2 border-transparent px-4 py-6 text-sm font-semibold text-slate-300 transition hover:border-[#5fd0d3] hover:text-white"
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
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-3 md:hidden">
          <nav className="flex gap-2 overflow-x-auto">
            {providerNavItems.map((item) => (
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

      <div className="grid min-h-[calc(100vh-72px)] lg:grid-cols-[64px_minmax(0,1fr)]">
        <aside className="hidden border-r border-[var(--shell-border)] bg-[var(--shell-surface)] lg:block">
          <div className="sticky top-[72px] flex h-[calc(100vh-72px)] flex-col items-center gap-3 py-4">
            {providerRailItems.map((item) => (
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
              <ProviderLogoutButton />
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

import type { ReactNode } from "react";
import Link from "next/link";
import { requireProviderUser } from "@/lib/auth/provider-access";
import { enforceMfaOrRedirect } from "@/lib/auth/mfa";
import ProviderTopNav from "@/components/providers/ProviderTopNav";
import ProviderLogoutButton from "@/components/providers/ProviderLogoutButton";

const providerNavItems = [
  { href: "/provider", label: "Home" },
  { href: "/provider/requests", label: "Requests" },
  { href: "/provider/schedule", label: "Schedule" },
  { href: "/provider/capabilities", label: "Capabilities" },
  { href: "/provider/company", label: "Company" },
];

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
    <div className="min-h-screen bg-[#eef3f7] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[252px_minmax(0,1fr)]">
        <aside className="hidden border-r border-white/10 bg-[#081321] text-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col px-4 py-5">
            <Link href="/provider" className="flex items-center gap-3 px-2">
              <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#196c72] text-sm font-bold">
                K
              </span>
              <span>
                <span className="block text-[15px] font-semibold uppercase tracking-[0.18em]">
                  Kordyne
                </span>
                <span className="block text-xs text-slate-400">
                  Provider Ops
                </span>
              </span>
            </Link>

            <nav className="mt-8 space-y-1">
              {providerNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-[10px] px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto space-y-3 rounded-[14px] border border-white/10 bg-white/[0.04] p-4">
              <Link
                href="/dashboard/account"
                className="block rounded-[10px] border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08]"
              >
                Account
              </Link>
              <ProviderLogoutButton />
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#eef3f7]/90 backdrop-blur">
            <div className="flex min-h-16 items-center justify-between gap-4 px-4 lg:px-7 2xl:px-9">
              <Link href="/provider" className="font-semibold text-slate-950 lg:hidden">
                Kordyne Provider
              </Link>

              <div className="hidden min-w-0 flex-1 lg:block">
                <ProviderTopNav />
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href="/dashboard/account"
                  className="hidden rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50 sm:inline-flex"
                >
                  Account
                </Link>
                <div className="lg:hidden">
                  <ProviderLogoutButton />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 px-4 py-3 lg:hidden">
              <ProviderTopNav />
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

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireProviderUser } from "@/lib/auth/provider-access";
import { enforceMfaOrRedirect } from "@/lib/auth/mfa";
import ProviderTopNav from "@/components/providers/ProviderTopNav";
import ProviderLogoutButton from "@/components/providers/ProviderLogoutButton";

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
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-[#f5f5f3]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-6 lg:px-10">
          <Link href="/provider" className="flex shrink-0 items-center">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={260}
              height={64}
              priority
              className="h-11 w-auto object-contain"
            />
          </Link>

          <div className="hidden min-w-0 flex-1 justify-center lg:flex">
            <ProviderTopNav />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/dashboard/account"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Account
            </Link>
            <ProviderLogoutButton />
          </div>
        </div>

        <div className="border-t border-zinc-200 px-6 py-3 lg:hidden">
          <ProviderTopNav />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8 lg:px-10">{children}</main>

      <footer className="mt-12 border-t border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 lg:flex-row lg:items-center lg:justify-between lg:px-10">
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
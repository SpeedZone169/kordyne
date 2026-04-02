import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";
import { enforceMfaOrRedirect } from "@/lib/auth/mfa";
import AdminLogoutButton from "./AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/organizations", label: "Organizations" },
  { href: "/admin/providers", label: "Providers" },
  { href: "/admin/requests", label: "Requests" },
  { href: "/admin/stats", label: "Statistics" },
];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requirePlatformOwner();

  await enforceMfaOrRedirect("/admin");

  return (
    <div className="min-h-screen bg-[#f5f5f3] text-slate-950">
      <header className="border-b border-zinc-200 bg-[#f5f5f3]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-10">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-center gap-3">
              <Image
                src="/kordyne-logo.svg"
                alt="Kordyne"
                width={220}
                height={48}
                className="h-10 w-auto"
                priority
              />
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">
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
          </div>

          <div className="flex items-center gap-3">
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Kordyne internal
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Platform owner console
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Internal administration for Kordyne. This area is separate from
              customer and provider workflows.
            </p>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-white px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Signed in
            </p>
            <p className="mt-2 text-sm font-medium text-slate-950">
              {profile.full_name || profile.email || "Platform owner"}
            </p>
            <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
          </div>
        </div>

        {children}
      </main>
    </div>
  );
}
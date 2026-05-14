"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";

type AuthUser = {
  email?: string;
} | null;

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/platform", label: "Platform" },
  { href: "/enterprise", label: "Enterprise" },
  { href: "/providers", label: "Providers" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUser(user);
      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  function handleNavClick() {
    setMobileOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
    router.refresh();
  }

  function linkClass(href: string) {
    const isActive =
      href === "/" ? pathname === "/" : pathname?.startsWith(href);

    return isActive
      ? "text-white"
      : "text-slate-300 transition hover:text-white";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#18202b]/95 text-white shadow-[0_14px_34px_rgba(2,8,23,0.2)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-[8px] bg-white/95 px-3 py-2 shadow-sm transition hover:bg-white"
          >
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={260}
              height={64}
              priority
              className="h-9 w-auto object-contain sm:h-10"
            />
          </Link>

          <nav className="hidden items-center gap-7 text-[14px] font-semibold md:flex">
            {marketingLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={linkClass(item.href)}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {!loading && !user ? (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Login
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-[8px] bg-[#e08a49] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c97539]"
                >
                  Request Demo
                </Link>
              </>
            ) : null}

            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/account"
                  className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/15"
                >
                  Account
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-[8px] bg-[#e08a49] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#c97539]"
                >
                  Log out
                </button>
              </>
            ) : null}
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-white/15 bg-white/10 text-white transition hover:bg-white/15 md:hidden"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              {mobileOpen ? (
                <>
                  <path d="M6 6l12 12" />
                  <path d="M18 6l-12 12" />
                </>
              ) : (
                <>
                  <path d="M4 7h16" />
                  <path d="M4 12h16" />
                  <path d="M4 17h16" />
                </>
              )}
            </svg>
          </button>
        </div>

        {mobileOpen ? (
          <div className="border-t border-white/10 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {marketingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href))
                      ? "bg-white/12 text-white"
                      : "text-slate-300 transition hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 flex flex-col gap-2">
              {!loading && !user ? (
                <>
                  <Link
                    href="/login"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Login
                  </Link>

                  <Link
                    href="/contact"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] bg-[#e08a49] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c97539]"
                  >
                    Request Demo
                  </Link>
                </>
              ) : null}

              {!loading && user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/dashboard/account"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    Account
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-[8px] bg-[#e08a49] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#c97539]"
                  >
                    Log out
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </header>
  );
}

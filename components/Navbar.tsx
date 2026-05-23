"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { usePathname, useRouter } from "next/navigation";
import BrandLogo from "./BrandLogo";

type AuthUser = {
  email?: string;
} | null;

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/platform", label: "Platform" },
  { href: "/pricing", label: "Pricing" },
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
      ? "text-[#003040]"
      : "text-slate-600 transition hover:text-[#003040]";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 text-slate-900 shadow-[0_14px_34px_rgba(2,48,64,0.08)] backdrop-blur">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center rounded-[8px] px-1 py-1.5 transition"
          >
            <BrandLogo priority heightClassName="h-11 sm:h-12" />
          </Link>

          <nav className="hidden items-center gap-7 text-[14px] font-bold md:flex">
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
                  className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                >
                  Login
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-[8px] bg-[#003040] px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(0,48,64,0.18)] transition hover:bg-[#005169]"
                >
                  Request Demo
                </Link>
              </>
            ) : null}

            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/account"
                  className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-4 py-2.5 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                >
                  Account
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-[8px] bg-[#003040] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#005169]"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white text-[#003040] transition hover:bg-[#eef9fb] md:hidden"
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
          <div className="border-t border-slate-200 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {marketingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleNavClick}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href))
                      ? "bg-[#eef9fb] text-[#003040]"
                      : "text-slate-600 transition hover:bg-[#eef9fb] hover:text-[#003040]"
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
                    className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-5 py-3 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                  >
                    Login
                  </Link>

                  <Link
                    href="/contact"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] bg-[#003040] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005169]"
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
                    className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-5 py-3 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/dashboard/account"
                    onClick={handleNavClick}
                    className="inline-flex items-center justify-center rounded-[8px] border border-[#003040]/20 bg-white px-5 py-3 text-sm font-bold text-[#003040] transition hover:bg-[#eef9fb]"
                  >
                    Account
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-[8px] bg-[#003040] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#005169]"
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

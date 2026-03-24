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

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

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
      ? "text-gray-950"
      : "text-gray-600 transition hover:text-gray-950";
  }

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/kordyne-logo.svg"
              alt="Kordyne"
              width={260}
              height={64}
              priority
              className="h-11 w-auto object-contain sm:h-12"
            />
          </Link>

          <nav className="hidden items-center gap-8 text-[15px] md:flex">
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
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Login
                </Link>

                <Link
                  href="/contact"
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  Request Demo
                </Link>
              </>
            ) : null}

            {!loading && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Dashboard
                </Link>

                <Link
                  href="/dashboard/account"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                >
                  Account
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-900 transition hover:bg-gray-100 md:hidden"
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
          <div className="border-t border-gray-200 py-4 md:hidden">
            <nav className="flex flex-col gap-1">
              {marketingLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    pathname === item.href ||
                    (item.href !== "/" && pathname?.startsWith(item.href))
                      ? "bg-gray-100 text-gray-950"
                      : "text-gray-700 transition hover:bg-gray-100 hover:text-gray-950"
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
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                  >
                    Login
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
                  >
                    Request Demo
                  </Link>
                </>
              ) : null}

              {!loading && user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                  >
                    Dashboard
                  </Link>

                  <Link
                    href="/dashboard/account"
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-100"
                  >
                    Account
                  </Link>

                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
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
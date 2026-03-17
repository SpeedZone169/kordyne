"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";

type AuthUser = {
  email?: string;
} | null;

export default function Navbar() {
  const supabase = createClient();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-gray-900"
        >
          Kordyne
        </Link>

        <nav className="hidden gap-8 text-sm text-gray-600 md:flex">
          <Link href="/" className="transition hover:text-gray-900">
            Home
          </Link>
          <Link href="/platform" className="transition hover:text-gray-900">
            Platform
          </Link>
          <Link href="/enterprise" className="transition hover:text-gray-900">
            Enterprise
          </Link>
          <Link href="/contact" className="transition hover:text-gray-900">
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!loading && !user ? (
            <>
              <Link
                href="/login"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Login
              </Link>

              <Link
                href="/signup"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Sign Up
              </Link>

              <Link
                href="/contact"
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Request Demo
              </Link>
            </>
          ) : null}

          {!loading && user ? (
            <>
              <Link
                href="/dashboard"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Dashboard
              </Link>

              <Link
                href="/dashboard/account"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Account
              </Link>

              <Link
                href="/dashboard/organization"
                className="rounded-2xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
              >
                Organization
              </Link>

              <button
                onClick={handleLogout}
                className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Log out
              </button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}
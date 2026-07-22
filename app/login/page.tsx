import type { Metadata } from "next";
import Link from "next/link";

import MarketingNav from "@/components/MarketingNav";
import { getSafeRedirectPath } from "@/lib/auth/redirects";

import Client from "./Client";
import styles from "./login.module.css";

type PortalMode = "customer" | "provider" | "admin";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
    portal?: string;
  }>;
};

export const metadata: Metadata = {
  title: "Sign in to Kordyne",
  description:
    "Securely access your Kordyne customer, provider, or administration workspace.",
};

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const portal: PortalMode =
    resolvedSearchParams.portal === "admin"
      ? "admin"
      : resolvedSearchParams.portal === "provider"
        ? "provider"
        : "customer";

  const fallback =
    portal === "admin"
      ? "/admin"
      : portal === "provider"
        ? "/provider"
        : "/dashboard";
  const nextPath = getSafeRedirectPath(resolvedSearchParams.next, fallback);

  return (
    <main className={`${styles.page} marketing-site`}>
      <section className={styles.hero}>
        <MarketingNav active="login" />

        <div className={styles.loginRail}>
          <Client nextPath={nextPath} portal={portal} />
        </div>

        <footer className={styles.footer}>
          <p>&copy; 2026 Kordyne. All rights reserved.</p>
          <div>
            <Link href="/terms">Terms &amp; Conditions</Link>
            <Link href="/privacy">Privacy Policy</Link>
          </div>
        </footer>
      </section>
    </main>
  );
}

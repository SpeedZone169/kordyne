import Image from "next/image";
import Link from "next/link";

import styles from "./MarketingNav.module.css";

type MarketingPage = "home" | "platform" | "providers" | "contact" | "login";

type MarketingNavProps = {
  active?: MarketingPage;
};

const navigation = [
  { id: "home" as const, href: "/", label: "Home" },
  { id: "platform" as const, href: "/platform", label: "Platform" },
  { id: "providers" as const, href: "/providers", label: "Providers" },
  { id: "contact" as const, href: "/contact", label: "Contact" },
];

export default function MarketingNav({ active }: MarketingNavProps) {
  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      <Link href="/" className={styles.brand} aria-label="Kordyne home">
        <Image
          src="/kordyne-logo-white.svg"
          alt="Kordyne"
          width={200}
          height={51}
          priority
        />
      </Link>

      <div className={styles.navLinks}>
        {navigation.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={active === item.id ? styles.activeNavLink : undefined}
            aria-current={active === item.id ? "page" : undefined}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className={styles.navActions}>
        <Link
          href="/login"
          className={active === "login" ? styles.activeNavLink : undefined}
          aria-current={active === "login" ? "page" : undefined}
        >
          Login
        </Link>
        <Link href="/contact" className={styles.actionButton}>
          <span>Request Demo</span>
          <span className={styles.actionArrow} aria-hidden="true">
            &rarr;
          </span>
        </Link>
      </div>

      <details className={styles.mobileMenu}>
        <summary aria-label="Open navigation">
          <span />
          <span />
          <span />
        </summary>
        <div className={styles.mobileMenuPanel}>
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={active === item.id ? styles.mobileActiveLink : undefined}
              aria-current={active === item.id ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={active === "login" ? styles.mobileActiveLink : undefined}
            aria-current={active === "login" ? "page" : undefined}
          >
            Login
          </Link>
          <Link className={styles.mobileDemoLink} href="/contact">
            Request Demo
          </Link>
        </div>
      </details>
    </nav>
  );
}

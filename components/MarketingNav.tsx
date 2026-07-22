"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

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
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      className={`${styles.nav} ${menuOpen ? styles.menuOpen : ""}`}
      aria-label="Primary navigation"
    >
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

      <div className={styles.mobileMenu}>
        <button
          type="button"
          className={styles.mobileMenuToggle}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-marketing-navigation"
          onClick={() => setMenuOpen((isOpen) => !isOpen)}
        >
          <span />
          <span />
          <span />
        </button>
        <div
          id="mobile-marketing-navigation"
          className={`${styles.mobileMenuPanel} ${
            menuOpen ? styles.mobileMenuPanelOpen : ""
          }`}
          aria-hidden={!menuOpen}
        >
          {navigation.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={active === item.id ? styles.mobileActiveLink : undefined}
              aria-current={active === item.id ? "page" : undefined}
              tabIndex={menuOpen ? 0 : -1}
              onClick={closeMenu}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={active === "login" ? styles.mobileActiveLink : undefined}
            aria-current={active === "login" ? "page" : undefined}
            tabIndex={menuOpen ? 0 : -1}
            onClick={closeMenu}
          >
            Login
          </Link>
          <Link
            className={styles.mobileDemoLink}
            href="/contact"
            tabIndex={menuOpen ? 0 : -1}
            onClick={closeMenu}
          >
            Request Demo
            <span aria-hidden="true">&rarr;</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

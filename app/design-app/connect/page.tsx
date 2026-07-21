"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

import MarketingNav from "@/components/MarketingNav";

import styles from "./connect.module.css";

type Status =
  | "checking"
  | "needs_login"
  | "redirecting_to_login"
  | "approving"
  | "approved"
  | "error";

const CLIENT_LABELS: Record<string, string> = {
  fusion: "Fusion",
  inventor: "Inventor",
  onshape: "Onshape",
  solidworks: "SolidWorks",
};

function getRedirectKey(code: string) {
  return `kordyne-design-app-login-redirect:${code}`;
}

export default function DesignAppConnectPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Checking browser session...");
  const [code, setCode] = useState("");
  const [codeReady, setCodeReady] = useState(false);
  const [clientLabel, setClientLabel] = useState("CAD connector");
  const [redirectToDashboardAfterApproval, setRedirectToDashboardAfterApproval] =
    useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const clientType = (
        params.get("client_type") ??
        params.get("clientType") ??
        ""
      ).toLowerCase();

      setClientLabel(CLIENT_LABELS[clientType] ?? "CAD connector");
      setCode(params.get("code") ?? "");
      setCodeReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const approve = useCallback(async function approve(currentCode: string) {
    setStatus("approving");
    setMessage(`Approving ${clientLabel} connection...`);

    const { data } = await supabase.auth.getSession();
    let accessToken = data.session?.access_token;

    if (!accessToken && data.session?.refresh_token) {
      const { data: refreshed } = await supabase.auth.refreshSession();
      accessToken = refreshed.session?.access_token;
    }

    const res = await fetch("/api/design-app/auth/approve", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: currentCode,
        accessToken,
      }),
    });

    const payload = (await res.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (res.status === 401) {
      setStatus("needs_login");
      setMessage(payload.error ?? "Please log in to Kordyne to continue.");
      return "needs_login" as const;
    }

    let cameFromLogin = false;
    try {
      cameFromLogin = sessionStorage.getItem(getRedirectKey(currentCode)) === "1";
    } catch {}

    if (!res.ok || !payload.ok) {
      setStatus("error");
      setMessage(payload.error ?? "Approval failed.");
      return "error" as const;
    }

    try {
      sessionStorage.removeItem(getRedirectKey(currentCode));
    } catch {}

    setStatus("approved");
    setRedirectToDashboardAfterApproval(cameFromLogin);
    setMessage(
      cameFromLogin
        ? "Connection approved. Opening your Kordyne dashboard."
        : `Connection approved. You can return to ${clientLabel}.`,
    );
    return "approved" as const;
  }, [clientLabel, supabase]);

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!codeReady) return;

      if (!code) {
        if (!isMounted) return;
        setStatus("error");
        setMessage("Missing connection code.");
        return;
      }

      const approvalResult = await approve(code);

      if (!isMounted) return;

      if (approvalResult !== "needs_login") {
        return;
      }

      let alreadyRedirected = false;
      try {
        alreadyRedirected = sessionStorage.getItem(getRedirectKey(code)) === "1";
      } catch {}

      if (!alreadyRedirected) {
        try {
          sessionStorage.setItem(getRedirectKey(code), "1");
        } catch {}

        const returnTo = `${window.location.pathname}${window.location.search}`;
        const loginUrl = `/login?next=${encodeURIComponent(returnTo)}`;

        setStatus("redirecting_to_login");
        setMessage("Redirecting to Kordyne login...");
        window.location.assign(loginUrl);
        return;
      }

      setStatus("needs_login");
      setMessage("Log in to Kordyne in this browser, then continue.");
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [approve, code, codeReady, supabase]);

  useEffect(() => {
    if (status !== "approved") return;

    const closeTimer = window.setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 250);

    let dashboardTimer: number | undefined;
    if (redirectToDashboardAfterApproval) {
      dashboardTimer = window.setTimeout(() => {
        window.location.replace("/dashboard");
      }, 900);
    }

    return () => {
      window.clearTimeout(closeTimer);
      if (dashboardTimer) {
        window.clearTimeout(dashboardTimer);
      }
    };
  }, [redirectToDashboardAfterApproval, status]);

  const loginHref =
    typeof window !== "undefined"
      ? `/login?next=${encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        )}`
      : "/login";

  const isPending =
    status === "checking" ||
    status === "approving" ||
    status === "redirecting_to_login";

  const statusLabel =
    status === "approved"
      ? "Connection approved"
      : status === "error"
        ? "Connection interrupted"
        : status === "needs_login"
          ? "Sign in required"
          : status === "redirecting_to_login"
            ? "Opening secure login"
            : status === "approving"
              ? "Approving connection"
              : "Checking secure session";

  return (
    <main className={`${styles.page} marketing-site`}>
      <section className={styles.hero}>
        <MarketingNav />

        <div className={styles.connectRail}>
          <article className={styles.connectCard} aria-live="polite">
            <header className={styles.cardHeader}>
              <p className={styles.eyebrow}>SECURE CONNECTOR ACCESS</p>
              <h1>Connect {clientLabel} to Kordyne</h1>
              <p className={styles.intro}>
                Approve this browser session to connect your CAD workspace to
                your controlled Kordyne Vault.
              </p>
            </header>

            <div
              className={`${styles.statusPanel} ${styles[status]}`}
              role={status === "error" ? "alert" : "status"}
            >
              <span className={styles.statusIcon} aria-hidden="true">
                {isPending ? <span className={styles.spinner} /> : null}
                {status === "approved" ? "✓" : null}
                {status === "needs_login" ? "→" : null}
                {status === "error" ? "!" : null}
              </span>
              <span className={styles.statusCopy}>
                <strong>{statusLabel}</strong>
                <span>{message}</span>
              </span>
            </div>

            <div className={styles.connectionSummary}>
              <div className={styles.connectorMark} aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div>
                <span>CONNECTING</span>
                <strong>{clientLabel}</strong>
              </div>
              <span className={styles.connectionLine} aria-hidden="true" />
              <div className={styles.destination}>
                <span>DESTINATION</span>
                <strong>Kordyne Vault</strong>
              </div>
            </div>

            {(status === "needs_login" || status === "error") && (
              <div className={styles.actions}>
                {status === "needs_login" ? (
                  <>
                    <a href={loginHref} className={styles.primaryButton}>
                      <span>Open Kordyne Login</span>
                      <span aria-hidden="true">→</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => void approve(code)}
                      className={styles.secondaryButton}
                    >
                      I already logged in
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => void approve(code)}
                    className={styles.primaryButton}
                  >
                    <span>Retry secure connection</span>
                    <span aria-hidden="true">→</span>
                  </button>
                )}
              </div>
            )}

            <div className={styles.securityNote}>
              <span className={styles.lockIcon} aria-hidden="true" />
              <p>
                Keep {clientLabel} open during approval. This one-time browser
                handoff does not expose your Kordyne password to the connector.
              </p>
            </div>
          </article>
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

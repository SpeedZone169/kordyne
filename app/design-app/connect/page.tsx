"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

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

  return (
    <div className="min-h-screen bg-[#003040] bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:36px_36px] p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-[8px] border border-cyan-100/20 bg-[#062f3d]/95 p-6 text-white shadow-sm">
          <Image
            src="/kordyne-logo-white.svg"
            alt="Kordyne"
            width={228}
            height={58}
            className="h-10 w-auto"
          />
          <h1 className="mt-8 text-2xl font-semibold">
            Connect {clientLabel} to Kordyne
          </h1>

          <p className="mt-3 text-sm leading-6 text-cyan-50/75">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            {status === "needs_login" ? (
              <>
                <a
                  href={loginHref}
                  className="rounded-[8px] border border-[#00bdde] bg-[#00bdde] px-4 py-2 text-sm font-medium text-[#002b38]"
                >
                  Open Kordyne Login
                </a>
                <button
                  type="button"
                  onClick={() => void approve(code)}
                  className="rounded-[8px] border border-cyan-100/25 px-4 py-2 text-sm font-medium"
                >
                  I already logged in
                </button>
              </>
            ) : null}

            {status === "error" ? (
              <button
                type="button"
                onClick={() => void approve(code)}
                className="rounded-[8px] border border-cyan-100/25 px-4 py-2 text-sm font-medium"
              >
                Retry
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-[8px] border border-cyan-100/20 bg-white/5 p-4 text-sm leading-6 text-cyan-50/70">
            <p>
              Keep {clientLabel} open while Kordyne completes the connection.
            </p>
            <p className="mt-2">
              After approval, this tab will close if your browser allows it.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

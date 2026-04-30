"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type Status =
  | "checking"
  | "needs_login"
  | "redirecting_to_login"
  | "approving"
  | "approved"
  | "error";

function getRedirectKey(code: string) {
  return `kordyne-design-app-login-redirect:${code}`;
}

export default function DesignAppConnectPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Checking browser session…");
  const [code, setCode] = useState("");
  const [codeReady, setCodeReady] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCode(params.get("code") ?? "");
    setCodeReady(true);
  }, []);

  async function approve(currentCode: string) {
    setStatus("approving");
    setMessage("Approving Fusion connection…");

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      setStatus("needs_login");
      setMessage("Please log in to Kordyne in this browser to continue.");
      return;
    }

    const res = await fetch("/api/design-app/auth/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: currentCode,
        accessToken: data.session.access_token,
      }),
    });

    const payload = (await res.json()) as {
      ok?: boolean;
      error?: string;
      message?: string;
    };

    if (!res.ok || !payload.ok) {
      setStatus("error");
      setMessage(payload.error ?? "Approval failed.");
      return;
    }

    try {
      sessionStorage.removeItem(getRedirectKey(currentCode));
    } catch {}

    setStatus("approved");
    setMessage(
      payload.message ??
        "Connection approved. Returning control to Fusion.",
    );
  }

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

      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (data.session?.access_token) {
        void approve(code);
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
        setMessage("Redirecting to Kordyne login…");
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
  }, [code, codeReady, supabase]);

  useEffect(() => {
    if (status !== "approved") return;

    const timer = window.setTimeout(() => {
      try {
        window.close();
      } catch {}

      window.setTimeout(() => {
        window.location.replace("/dashboard");
      }, 800);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [status]);

  const loginHref =
    typeof window !== "undefined"
      ? `/login?next=${encodeURIComponent(
          `${window.location.pathname}${window.location.search}`,
        )}`
      : "/login";

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">
          Connect Fusion to Kordyne
        </h1>

        <p className="mt-3 text-sm text-gray-600">{message}</p>

        <div className="mt-6 flex flex-wrap gap-3">
          {status === "needs_login" ? (
            <>
              <a
                href={loginHref}
                className="rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              >
                Open Kordyne Login
              </a>
              <button
                type="button"
                onClick={() => void approve(code)}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                I already logged in
              </button>
            </>
          ) : null}

          {status === "error" ? (
            <button
              type="button"
              onClick={() => void approve(code)}
              className="rounded-xl border px-4 py-2 text-sm font-medium"
            >
              Retry
            </button>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
          <p>
            Connection code:{" "}
            <span className="font-mono font-semibold">
              {codeReady ? code || "—" : "…"}
            </span>
          </p>
          <p className="mt-2">
            After approval, this page will try to close. If the browser blocks that, it will redirect to your dashboard.
          </p>
        </div>
      </div>
    </div>
  );
}
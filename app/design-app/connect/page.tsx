"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

type Status =
  | "checking"
  | "needs_login"
  | "approving"
  | "approved"
  | "error";

export default function DesignAppConnectPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("Checking browser session…");

  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  async function approve() {
    setStatus("approving");
    setMessage("Approving Fusion connection…");

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.access_token) {
      setStatus("needs_login");
      setMessage("Log in to Kordyne in this browser, then click Continue.");
      return;
    }

    const res = await fetch("/api/design-app/auth/approve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
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

    setStatus("approved");
    setMessage(
      payload.message ??
        "Connection approved. Returning control to Fusion.",
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function run() {
      if (!code) {
        if (!isMounted) return;
        setStatus("error");
        setMessage("Missing connection code.");
        return;
      }

      const { data } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (data.session?.access_token) {
        void approve();
      } else {
        setStatus("needs_login");
        setMessage("Log in to Kordyne in this browser, then click Continue.");
      }
    }

    void run();

    return () => {
      isMounted = false;
    };
  }, [code, supabase]);

  useEffect(() => {
    if (status !== "approved") return;

    const timer = window.setTimeout(() => {
      try {
        window.close();
      } catch {}

      window.setTimeout(() => {
        router.replace("/dashboard/design-connectors");
      }, 800);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [status, router]);

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
                href="/login"
                className="rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              >
                Open Kordyne Login
              </a>
              <button
                type="button"
                onClick={() => void approve()}
                className="rounded-xl border px-4 py-2 text-sm font-medium"
              >
                Continue after login
              </button>
            </>
          ) : null}

          {status === "error" ? (
            <button
              type="button"
              onClick={() => void approve()}
              className="rounded-xl border px-4 py-2 text-sm font-medium"
            >
              Retry
            </button>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border bg-gray-50 p-4 text-sm text-gray-600">
          <p>
            Connection code:{" "}
            <span className="font-mono font-semibold">{code || "—"}</span>
          </p>
          <p className="mt-2">
            After approval, this page will attempt to close and Fusion will connect automatically.
          </p>
        </div>
      </div>
    </div>
  );
}
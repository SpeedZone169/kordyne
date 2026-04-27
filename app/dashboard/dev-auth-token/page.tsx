"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

type SessionInfo = {
  accessToken: string;
  refreshToken: string;
  userEmail: string | null;
  expiresAt: number | null;
};

function formatExpiry(unixSeconds: number | null) {
  if (!unixSeconds) return "—";
  const date = new Date(unixSeconds * 1000);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

export default function DevAuthTokenPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      ),
    [],
  );

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setSessionInfo(null);
        setLoading(false);
        return;
      }

      const session = data.session;

      if (!session) {
        setError("No active session found. Log in to Kordyne first.");
        setSessionInfo(null);
        setLoading(false);
        return;
      }

      setSessionInfo({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        userEmail: session.user.email ?? null,
        expiresAt: session.expires_at ?? null,
      });
      setLoading(false);
    }

    void loadSession();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function copyToken() {
    if (!sessionInfo?.accessToken) return;

    await navigator.clipboard.writeText(sessionInfo.accessToken);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-2xl font-semibold text-red-900">Dev Auth Token</h1>
        <p className="mt-2 text-sm text-red-800">
          Development-only page. Use this only for local Fusion connector testing.
          Remove this page before production.
        </p>
      </div>

      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        {loading ? (
          <p className="text-sm text-gray-600">Loading session…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : sessionInfo ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">User</p>
              <p className="mt-1 text-sm text-gray-900">
                {sessionInfo.userEmail ?? "—"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Expires</p>
              <p className="mt-1 text-sm text-gray-900">
                {formatExpiry(sessionInfo.expiresAt)}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-gray-500">Access Token</p>
                <button
                  type="button"
                  onClick={copyToken}
                  className="rounded-xl border px-3 py-2 text-sm font-medium"
                >
                  {copied ? "Copied" : "Copy token"}
                </button>
              </div>
              <textarea
                readOnly
                value={sessionInfo.accessToken}
                className="mt-2 min-h-[220px] w-full rounded-2xl border p-3 font-mono text-xs text-gray-900"
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No session information available.</p>
        )}
      </div>
    </div>
  );
}
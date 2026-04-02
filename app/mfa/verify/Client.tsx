"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
};

export default function Client({ nextPath }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;

        if (!user) {
          router.replace(
            `/login?next=${encodeURIComponent(`/mfa/verify?next=${nextPath}`)}`,
          );
          return;
        }

        const aalResult =
          await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aalResult.error) {
          throw aalResult.error;
        }

        if (
          aalResult.data.currentLevel === "aal2" &&
          aalResult.data.nextLevel === "aal2"
        ) {
          router.replace(nextPath);
          router.refresh();
          return;
        }

        const factorsResult = await supabase.auth.mfa.listFactors();
        if (factorsResult.error) {
          throw factorsResult.error;
        }

        const existingTotp = factorsResult.data.totp?.[0];

        if (!existingTotp) {
          router.replace(`/mfa/setup?next=${encodeURIComponent(nextPath)}`);
          return;
        }

        if (!cancelled) {
          setFactorId(existingTotp.id);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to prepare MFA verification.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [nextPath, router, supabase]);

  async function handleVerify() {
    if (!factorId) {
      setError("No enrolled MFA factor was found.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const challengeResult = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResult.error) {
        throw challengeResult.error;
      }

      const verifyResult = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResult.data.id,
        code: verifyCode.trim(),
      });

      if (verifyResult.error) {
        throw verifyResult.error;
      }

      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid MFA code.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">Loading MFA verification…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-16">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Multi-factor authentication
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Verify your admin sign-in
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Enter the 6-digit code from your authenticator app to continue.
        </p>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 space-y-2">
          <label htmlFor="mfa-code" className="text-sm font-medium text-slate-700">
            6-digit code
          </label>
          <input
            id="mfa-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={verifyCode}
            onChange={(event) =>
              setVerifyCode(event.target.value.replace(/\s+/g, ""))
            }
            placeholder="123456"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleVerify}
            disabled={submitting || !verifyCode.trim() || !factorId}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Verifying..." : "Verify MFA"}
          </button>

          <button
            type="button"
            onClick={() => router.push(`/mfa/setup?next=${encodeURIComponent(nextPath)}`)}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
          >
            Set up MFA instead
          </button>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TotpFactor = {
  id: string;
};

type Props = {
  nextPath: string;
};

export default function Client({ nextPath }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState("");
  const [secret, setSecret] = useState("");
  const [verifyCode, setVerifyCode] = useState("");

  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qrCodeDataUrl = useMemo(() => {
    if (!qrCodeSvg) return "";
    return `data:image/svg+xml;utf8,${encodeURIComponent(qrCodeSvg)}`;
  }, [qrCodeSvg]);

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
            `/login?next=${encodeURIComponent(`/mfa/setup?next=${nextPath}`)}`
          );
          return;
        }

        const factorsResult = await supabase.auth.mfa.listFactors();
        if (factorsResult.error) {
          throw factorsResult.error;
        }

        const existingTotp = factorsResult.data.totp?.[0] as
          | TotpFactor
          | undefined;

        if (existingTotp) {
          if (!cancelled) {
            setAlreadyEnrolled(true);
            setFactorId(existingTotp.id);
          }
          return;
        }

        const enrollResult = await supabase.auth.mfa.enroll({
          factorType: "totp",
        });

        if (enrollResult.error) {
          throw enrollResult.error;
        }

        if (!cancelled) {
          setFactorId(enrollResult.data.id);
          setQrCodeSvg(enrollResult.data.totp.qr_code);
          setSecret(enrollResult.data.totp.secret);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to start MFA setup."
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

  async function handleEnableMfa() {
    if (!factorId) {
      setError("No MFA factor is ready yet.");
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
      setError(err instanceof Error ? err.message : "Failed to verify MFA code.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-sm text-slate-600">Loading MFA setup…</p>
        </div>
      </div>
    );
  }

  if (alreadyEnrolled) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Multi-factor authentication
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            MFA is already set up
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Your account already has a TOTP factor enrolled. Continue to the verify
            step to finish sign-in.
          </p>

          <div className="mt-6">
            <button
              type="button"
              onClick={() =>
                router.push(`/mfa/verify?next=${encodeURIComponent(nextPath)}`)
              }
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Go to MFA verify
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-[28px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Multi-factor authentication
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Set up authenticator app MFA
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Scan this QR code in your authenticator app, then enter the 6-digit code to
          activate MFA for this admin account.
        </p>

        {error ? (
          <div className="mt-6 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {qrCodeDataUrl ? (
          <div className="mt-8 flex justify-center rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
            <img
              src={qrCodeDataUrl}
              alt="MFA QR code"
              className="h-56 w-56 rounded-[20px] border border-zinc-200 bg-white p-3"
            />
          </div>
        ) : null}

        {secret ? (
          <div className="mt-6 rounded-[18px] border border-zinc-200 bg-[#fafaf9] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              Manual setup secret
            </p>
            <p className="mt-2 break-all font-mono text-sm text-slate-800">
              {secret}
            </p>
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
            onClick={handleEnableMfa}
            disabled={submitting || !verifyCode.trim() || !factorId}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enabling..." : "Enable MFA"}
          </button>

          <button
            type="button"
            onClick={() => router.push(nextPath)}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
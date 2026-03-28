"use client";

import Link from "next/link";
import Script from "next/script";
import { FormEvent, useState } from "react";

type InviteSignupFormProps = {
  inviteToken: string;
  inviteEmail: string;
  organizationName: string;
  inviteType: "customer" | "provider";
};

export default function InviteSignupForm({
  inviteToken,
  inviteEmail,
  organizationName,
  inviteType,
}: InviteSignupFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const repeatPassword = String(formData.get("repeatPassword") ?? "");
    const acceptedTerms = formData.get("acceptedTerms") === "on";
    const turnstileToken = String(
      formData.get("cf-turnstile-response") ?? ""
    ).trim();

    if (!fullName) {
      setError("Full name is required.");
      return;
    }

    if (!password || !repeatPassword) {
      setError("Password fields are required.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete verification.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          company: organizationName,
          email: inviteEmail,
          password,
          repeatPassword,
          turnstileToken,
          acceptedTerms,
          inviteToken,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Unable to create account.");
      }

      setSuccess(true);
      form.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Account created
        </p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Check your email to continue
        </h2>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Your invited {inviteType} account has been created for{" "}
          <strong>{inviteEmail}</strong>. If email confirmation is enabled,
          confirm your email first, then return to your invite link and accept
          the invite.
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/invite/${inviteToken}`}
            className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Back to invite
          </Link>

          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}`}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {siteKey ? (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          async
          defer
        />
      ) : null}

      <div className="rounded-[32px] border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Invited account setup
        </p>

        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Create your {inviteType} account
        </h2>

        <p className="mt-4 text-sm leading-6 text-slate-600">
          This account is being created for <strong>{organizationName}</strong>.
          You must sign up using the invited email address.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Organization
            </label>
            <input
              type="text"
              value={organizationName}
              readOnly
              className="w-full rounded-full border border-zinc-300 bg-[#fafaf9] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Invited email
            </label>
            <input
              type="email"
              value={inviteEmail}
              readOnly
              className="w-full rounded-full border border-zinc-300 bg-[#fafaf9] px-4 py-3 text-sm text-slate-600 outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              type="text"
              name="fullName"
              required
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              placeholder="Create a password"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Repeat password
            </label>
            <input
              type="password"
              name="repeatPassword"
              required
              minLength={8}
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              placeholder="Repeat your password"
            />
          </div>

          <label className="flex items-start gap-3 rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm leading-6 text-slate-600">
            <input
              type="checkbox"
              name="acceptedTerms"
              className="mt-1"
              required
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-slate-950 underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-slate-950 underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          {siteKey ? (
            <div
              className="cf-turnstile"
              data-sitekey={siteKey}
              data-theme="light"
            />
          ) : (
            <div className="rounded-[20px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing.
            </div>
          )}

          {error ? (
            <div className="rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !siteKey}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Create invited account"}
            </button>

            <Link
              href={`/invite/${inviteToken}`}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Back to invite
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
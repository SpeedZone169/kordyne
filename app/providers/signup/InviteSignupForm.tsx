"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

import TurnstileWidget from "../../../components/TurnstileWidget";

import styles from "./provider-signup.module.css";

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
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);

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
      setTurnstileToken("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to create account."
      );
    } finally {
      setIsSubmitting(false);
      setTurnstileToken("");
      setTurnstileKey((value) => value + 1);
    }
  }

  if (success) {
    return (
      <div className={`${styles.formCard} ${styles.successCard}`}>
        <span className={styles.successMark} aria-hidden="true">
          &#10003;
        </span>
        <p className={styles.formEyebrow}>Account created</p>
        <h2>Check your email to continue</h2>
        <p>
          Your invited {inviteType} account has been created for{" "}
          <strong>{inviteEmail}</strong>. If email confirmation is enabled,
          confirm your email before accepting the invitation.
        </p>

        <div className={styles.formActions}>
          <Link href={`/invite/${inviteToken}`} className={styles.primaryButton}>
            Back to invite
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(`/invite/${inviteToken}`)}`}
            className={styles.secondaryButton}
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.formCard}>
      <p className={styles.formEyebrow}>Invited account setup</p>
      <h2>Create your {inviteType} account</h2>
      <p className={styles.formDescription}>
        Complete the secure account details below. The organization and invited
        email are locked to this invitation.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <label>
            <span>Organization</span>
            <input type="text" value={organizationName} readOnly />
          </label>
          <label>
            <span>Invited email</span>
            <input type="email" value={inviteEmail} readOnly />
          </label>
        </div>

        <label>
          <span>Full name</span>
          <input
            type="text"
            name="fullName"
            required
            autoComplete="name"
            placeholder="Your full name"
          />
        </label>

        <div className={styles.formRow}>
          <label>
            <span>Password</span>
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Create a password"
            />
          </label>
          <label>
            <span>Repeat password</span>
            <input
              type="password"
              name="repeatPassword"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
          </label>
        </div>

        <label className={styles.termsRow}>
          <input type="checkbox" name="acceptedTerms" required />
          <span>
            I agree to the <Link href="/terms">Terms</Link> and{" "}
            <Link href="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        {siteKey ? (
          <div className={styles.turnstilePanel}>
            <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} />
          </div>
        ) : (
          <div className={styles.warningMessage}>
            Security verification is unavailable. Please contact Kordyne to
            complete account setup.
          </div>
        )}

        {error ? <div className={styles.errorMessage}>{error}</div> : null}

        <div className={styles.formActions}>
          <button
            type="submit"
            disabled={isSubmitting || !siteKey || !turnstileToken}
            className={styles.primaryButton}
          >
            {isSubmitting ? "Creating account..." : "Create invited account"}
          </button>
          <Link href={`/invite/${inviteToken}`} className={styles.secondaryButton}>
            Back to invite
          </Link>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";

import TurnstileWidget from "@/components/TurnstileWidget";

import styles from "./provider-signup.module.css";

type ProviderAccessForm = {
  fullName: string;
  email: string;
  company: string;
  website: string;
  country: string;
  capabilities: string;
  certifications: string;
  message: string;
};

const emptyForm: ProviderAccessForm = {
  fullName: "",
  email: "",
  company: "",
  website: "",
  country: "",
  capabilities: "",
  certifications: "",
  message: "",
};

export default function ProviderAccessRequestForm() {
  const [form, setForm] = useState<ProviderAccessForm>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!turnstileToken) {
      setStatus(
        turnstileError || "Please complete the security check before sending.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/providers/access-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          turnstileToken,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Unable to send your request.");
      }

      setSubmitted(true);
      setForm(emptyForm);
      setStatus("");
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Unable to send your request.",
      );
    } finally {
      setIsSubmitting(false);
      setTurnstileToken("");
      setTurnstileError("");
      setTurnstileKey((value) => value + 1);
    }
  }

  if (submitted) {
    return (
      <article className={`${styles.formCard} ${styles.successCard}`}>
        <span className={styles.successMark} aria-hidden="true">
          &#10003;
        </span>
        <p className={styles.formEyebrow}>Request received</p>
        <h2>Thank you for introducing your company</h2>
        <p>
          Kordyne will review your manufacturing capabilities and contact you
          before any provider invitation is issued. This request does not create
          an account or grant access to customer work.
        </p>
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setSubmitted(false)}
        >
          Submit another request
        </button>
      </article>
    );
  }

  return (
    <article className={styles.formCard}>
      <p className={styles.formEyebrow}>Provider access request</p>
      <h2>Tell us about your manufacturing company</h2>
      <p className={styles.formDescription}>
        Kordyne reviews every provider before sending a secure, scoped
        invitation.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formRow}>
          <label>
            <span>Full name</span>
            <input
              type="text"
              name="fullName"
              required
              autoComplete="name"
              value={form.fullName}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </label>
          <label>
            <span>Work email</span>
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="name@company.com"
            />
          </label>
        </div>

        <div className={styles.formRow}>
          <label>
            <span>Company</span>
            <input
              type="text"
              name="company"
              required
              autoComplete="organization"
              value={form.company}
              onChange={handleChange}
              placeholder="Company name"
            />
          </label>
          <label>
            <span>Website</span>
            <input
              type="text"
              inputMode="url"
              name="website"
              autoComplete="url"
              value={form.website}
              onChange={handleChange}
              placeholder="company.com"
            />
          </label>
        </div>

        <label>
          <span>Country or region</span>
          <input
            type="text"
            name="country"
            required
            autoComplete="country-name"
            value={form.country}
            onChange={handleChange}
            placeholder="Where do you manufacture?"
          />
        </label>

        <label>
          <span>Manufacturing capabilities</span>
          <input
            type="text"
            name="capabilities"
            required
            value={form.capabilities}
            onChange={handleChange}
            placeholder="CNC, additive, composites, inspection..."
          />
        </label>

        <label>
          <span>Certifications</span>
          <input
            type="text"
            name="certifications"
            value={form.certifications}
            onChange={handleChange}
            placeholder="ISO 9001, AS9100, ISO 13485... (optional)"
          />
        </label>

        <label>
          <span>What work would you like to receive through Kordyne?</span>
          <textarea
            name="message"
            required
            value={form.message}
            onChange={handleChange}
            placeholder="Tell us about your typical work, industries, batch sizes, and available capacity."
          />
        </label>

        {siteKey ? (
          <div className={styles.turnstilePanel}>
            <TurnstileWidget
              key={turnstileKey}
              action="provider_access"
              onVerify={(token) => {
                setTurnstileToken(token);
                if (token) {
                  setTurnstileError("");
                }
              }}
              onError={setTurnstileError}
            />
          </div>
        ) : (
          <div className={styles.warningMessage}>
            Security verification is unavailable. Please contact Kordyne
            support.
          </div>
        )}

        {status ? (
          <div className={styles.errorMessage} role="status">
            {status}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !siteKey || !turnstileToken}
          className={styles.primaryButton}
        >
          {isSubmitting ? "Sending request..." : "Request provider access"}
        </button>
      </form>
    </article>
  );
}

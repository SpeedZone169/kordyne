"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";

import MarketingNav from "@/components/MarketingNav";
import TurnstileWidget from "../../components/TurnstileWidget";

import styles from "./contact.module.css";

type ContactForm = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  teamSize: string;
  process: string;
  message: string;
};

const emptyForm: ContactForm = {
  firstName: "",
  lastName: "",
  email: "",
  company: "",
  teamSize: "",
  process: "",
  message: "",
};

const contactTopics = [
  "Part Vault and revision release",
  "Supplier or customer collaboration",
  "CAD connector and manufacturing handoff",
];

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("");

    if (!turnstileToken) {
      setStatus(
        turnstileError || "Please complete the security check before sending.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          company: form.company,
          teamSize: form.teamSize,
          process: form.process,
          message: form.message,
          turnstileToken,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok && data?.success) {
        setStatus("Thanks - your request has been sent.");
        setForm(emptyForm);
      } else {
        setStatus(data?.error || "Sorry - something went wrong.");
      }
    } catch (error) {
      console.error("Contact form submit error:", error);
      setStatus("Sorry - something went wrong.");
    } finally {
      setLoading(false);
      setTurnstileToken("");
      setTurnstileError("");
      setTurnstileKey((value) => value + 1);
    }
  }

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  return (
    <main className={`${styles.page} marketing-site`}>
      <section className={styles.hero}>
        <MarketingNav active="contact" />

        <div className={styles.contactRail}>
          <div className={styles.contactCopy}>
            <p className={styles.eyebrow}>Request a demo</p>
            <h1>Plan your CAD release &amp; manufacturing handoff.</h1>
            <p className={styles.intro}>
              Share where design release, supplier review, or production handoff
              is getting messy. We will help map the right Kordyne setup.
            </p>

            <div className={styles.usefulFor}>
              <p className={styles.usefulHeading}>Useful for</p>
              <ul>
                {contactTopics.map((topic) => (
                  <li key={topic}>
                    <Image
                      src="/marketing/icons/contact-check.svg"
                      alt=""
                      width={24}
                      height={24}
                    />
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <article className={styles.formCard}>
            <header className={styles.formHeader}>
              <h2>Tell us what you need</h2>
              <p>A short note is enough. We can fill the details in.</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.twoColumns}>
                <label>
                  <span className={styles.srOnly}>First name</span>
                  <input
                    type="text"
                    name="firstName"
                    required
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={handleChange}
                    placeholder="First Name"
                  />
                </label>
                <label>
                  <span className={styles.srOnly}>Last name</span>
                  <input
                    type="text"
                    name="lastName"
                    required
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={handleChange}
                    placeholder="Last Name"
                  />
                </label>
              </div>

              <div className={styles.twoColumns}>
                <label>
                  <span className={styles.srOnly}>Work email</span>
                  <input
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Work Email"
                  />
                </label>
                <label>
                  <span className={styles.srOnly}>Company</span>
                  <input
                    type="text"
                    name="company"
                    autoComplete="organization"
                    value={form.company}
                    onChange={handleChange}
                    placeholder="Company"
                  />
                </label>
              </div>

              <label>
                <span className={styles.srOnly}>Team size</span>
                <select
                  name="teamSize"
                  value={form.teamSize}
                  onChange={handleChange}
                  aria-label="Team size"
                >
                  <option value="">Team Size</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                </select>
              </label>

              <label>
                <span className={styles.srOnly}>Primary manufacturing interest</span>
                <select
                  name="process"
                  value={form.process}
                  onChange={handleChange}
                  aria-label="Primary manufacturing interest"
                >
                  <option value="">Primary Manufacturing Interest</option>
                  <option value="3D Printing">3D printing</option>
                  <option value="CNC">CNC</option>
                  <option value="Composites">Composites</option>
                  <option value="Mixed manufacturing">Mixed manufacturing</option>
                  <option value="OEM digital parts catalog">
                    OEM digital parts catalog
                  </option>
                </select>
              </label>

              <label>
                <span className={styles.srOnly}>What should Kordyne help with?</span>
                <textarea
                  name="message"
                  required
                  value={form.message}
                  onChange={handleChange}
                  placeholder="What should Kordyne help you coordinate?"
                />
              </label>

              <div className={styles.turnstilePanel}>
                <TurnstileWidget
                  key={turnstileKey}
                  onVerify={(token) => {
                    setTurnstileToken(token);
                    if (token) {
                      setTurnstileError("");
                    }
                  }}
                  onError={setTurnstileError}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className={styles.submitButton}
              >
                {loading ? "Sending..." : "Send Request"}
              </button>

              {status ? (
                <p className={styles.formStatus} role="status">
                  {status}
                </p>
              ) : null}
            </form>
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

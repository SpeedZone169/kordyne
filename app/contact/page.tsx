"use client";

import { useState } from "react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import TurnstileWidget from "../../components/TurnstileWidget";

type ContactForm = {
  name: string;
  email: string;
  company: string;
  teamSize: string;
  process: string;
  message: string;
};

const emptyForm: ContactForm = {
  name: "",
  email: "",
  company: "",
  teamSize: "",
  process: "",
  message: "",
};

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");

    if (!turnstileToken) {
      setStatus("Please complete the verification before sending.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          turnstileToken,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
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
      setTurnstileKey((value) => value + 1);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-500">
            Request a Demo
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Talk to us about your part management workflow
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Tell us about your team, your manufacturing needs, and what kinds of
            parts you manage today.
          </p>
        </div>

        <div className="mt-12 max-w-2xl rounded-3xl border border-gray-200 p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Full name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  value={form.name}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Work email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Company
                </label>
                <input
                  type="text"
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">
                  Team size
                </label>
                <select
                  name="teamSize"
                  value={form.teamSize}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
                >
                  <option value="">Select</option>
                  <option value="1-10">1-10</option>
                  <option value="11-50">11-50</option>
                  <option value="51-200">51-200</option>
                  <option value="200+">200+</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Primary manufacturing interest
              </label>
              <select
                name="process"
                value={form.process}
                onChange={handleChange}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
              >
                <option value="">Select</option>
                <option value="3D Printing">3D Printing</option>
                <option value="CNC">CNC</option>
                <option value="Composites">Composites</option>
                <option value="Mixed workflows">Mixed workflows</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-900">
                What do you want to solve?
              </label>
              <textarea
                name="message"
                rows={6}
                required
                value={form.message}
                onChange={handleChange}
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-gray-900"
                placeholder="Example: We need a better way to store CAD revisions, request quotes, and track low-volume part orders."
              />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <TurnstileWidget key={turnstileKey} onVerify={setTurnstileToken} />
            </div>

            <button
              type="submit"
              disabled={loading || !turnstileToken}
              className="rounded-2xl bg-gray-900 px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send request"}
            </button>

            {status && <p className="text-sm text-gray-600">{status}</p>}
          </form>
        </div>
      </section>

      <Footer />
    </main>
  );
}

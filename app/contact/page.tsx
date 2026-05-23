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

const mapPoints = [
  { label: "Dublin", left: "46%", top: "36%" },
  { label: "Detroit", left: "27%", top: "42%" },
  { label: "Munich", left: "50%", top: "40%" },
  { label: "Singapore", left: "73%", top: "59%" },
  { label: "Sydney", left: "82%", top: "72%" },
];

function GlobalMapBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#003040]" />
      <div className="absolute inset-0 kordyne-grid-bg opacity-55" />
      <div className="absolute left-[8%] top-[20%] h-[56%] w-[84%] rounded-full border border-white/10" />
      <div className="absolute left-[18%] top-[28%] h-[40%] w-[64%] rounded-full border border-[#00bdde]/25" />
      <div className="absolute left-[12%] right-[12%] top-[49%] h-px bg-gradient-to-r from-transparent via-[#00bdde]/55 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#003040] to-transparent" />
      {mapPoints.map((point, index) => (
        <div
          key={point.label}
          className="kordyne-animate-in absolute"
          style={{
            left: point.left,
            top: point.top,
            animationDelay: `${index * 110}ms`,
          }}
        >
          <span className="absolute h-3 w-3 rounded-full bg-[#00bdde] shadow-[0_0_0_8px_rgba(0,189,222,0.16)]" />
          <span className="ml-5 whitespace-nowrap text-[11px] font-black uppercase text-white/60">
            {point.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("");

    if (!turnstileToken) {
      setStatus(turnstileError || "Please complete the security check before sending.");
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
      setTurnstileError("");
      setTurnstileKey((value) => value + 1);
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <Navbar />

      <section className="relative overflow-hidden text-white">
        <GlobalMapBackdrop />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-20">
          <div className="self-center">
            <p className="text-xs font-black uppercase text-[#00bdde]">
              Request a demo
            </p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-white sm:text-6xl">
              Build a controlled manufacturing network around your parts.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Tell Kordyne about your part vault, CAD release process, internal
              machines, supplier network, and collaboration requirements.
            </p>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              {["Vault setup", "Provider routing", "Machine connectors"].map(
                (item) => (
                  <div
                    key={item}
                    className="rounded-[8px] border border-white/12 bg-white/[0.07] p-4 text-sm font-black text-white"
                  >
                    {item}
                  </div>
                ),
              )}
            </div>
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white p-5 text-slate-900 shadow-[0_28px_80px_rgba(2,8,23,0.32)] lg:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Full name
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Work email
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Company
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-900">
                    Team size
                  </label>
                  <select
                    name="teamSize"
                    value={form.teamSize}
                    onChange={handleChange}
                    className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
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
                <label className="mb-2 block text-sm font-bold text-slate-900">
                  Primary manufacturing interest
                </label>
                <select
                  name="process"
                  value={form.process}
                  onChange={handleChange}
                  className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                >
                  <option value="">Select</option>
                  <option value="3D Printing">3D printing</option>
                  <option value="CNC">CNC</option>
                  <option value="Composites">Composites</option>
                  <option value="Mixed manufacturing">Mixed manufacturing</option>
                  <option value="OEM digital parts catalog">OEM digital parts catalog</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-slate-900">
                  What should Kordyne help you coordinate?
                </label>
                <textarea
                  name="message"
                  rows={5}
                  required
                  value={form.message}
                  onChange={handleChange}
                  className="w-full rounded-[8px] border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-slate-900"
                  placeholder="Part vault, supplier collaboration, machine connectors, quote workflow, or OEM spare-parts catalog."
                />
              </div>

              <div className="rounded-[8px] border border-slate-200 bg-[#f5f7fa] p-4">
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
                className="w-full rounded-[8px] bg-[#00bdde] px-6 py-3 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send request"}
              </button>

              {status ? <p className="text-sm text-slate-600">{status}</p> : null}
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

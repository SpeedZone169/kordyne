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

const contactTopics = [
  "Part Vault and revision release",
  "Supplier or customer collaboration",
  "CAD connector and manufacturing handoff",
];

const inputClass =
  "w-full rounded-[8px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#00bdde] focus:ring-4 focus:ring-[#00bdde]/10";

const labelClass = "mb-2 block text-sm font-black text-slate-900";

function GlobalMapBackdrop() {
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#003040]" />
      <div className="absolute inset-0 kordyne-grid-bg opacity-35" />
      <div className="absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#00bdde]/10 blur-3xl" />
      <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-[#00bdde]/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-[#002531] to-transparent" />
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

      <section className="relative overflow-hidden border-b-4 border-[#00bdde] text-white">
        <GlobalMapBackdrop />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8 lg:py-16">
          <div className="self-center lg:pr-6">
            <p className="text-xs font-black uppercase text-[#00bdde]">
              Request a demo
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight text-white sm:text-[3.25rem]">
              Plan your CAD release and manufacturing handoff.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Share where design release, supplier review, or production handoff
              is getting messy. We will help map the right Kordyne setup.
            </p>

            <div className="mt-8 space-y-3 border-l border-[#00bdde]/45 pl-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-white/55">
                Useful for
              </p>
              {contactTopics.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-bold text-white">
                  <span className="h-2 w-2 rounded-full bg-[#00bdde]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-white/12 bg-white/95 p-5 text-slate-900 shadow-[0_28px_80px_rgba(2,8,23,0.26)] backdrop-blur lg:p-6">
            <div className="mb-5 flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0089a2]">
                  Contact
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Tell us what you need
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-slate-500">
                A short note is enough. We can fill the details in together.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Full name</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Work email</label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Company</label>
                  <input
                    type="text"
                    name="company"
                    value={form.company}
                    onChange={handleChange}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Team size</label>
                  <select
                    name="teamSize"
                    value={form.teamSize}
                    onChange={handleChange}
                    className={inputClass}
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
                <label className={labelClass}>
                  Primary manufacturing interest
                </label>
                <select
                  name="process"
                  value={form.process}
                  onChange={handleChange}
                  className={inputClass}
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
                <label className={labelClass}>What should Kordyne help with?</label>
                <textarea
                  name="message"
                  rows={4}
                  required
                  value={form.message}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Part vault, supplier collaboration, machine connectors, quote workflow, or spare-parts catalog."
                />
              </div>

              <div className="rounded-[8px] border border-slate-200 bg-slate-50 px-4 py-3">
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
                className="w-full rounded-[8px] bg-[#00bdde] px-6 py-3.5 text-sm font-black text-[#003040] transition hover:bg-[#8ceeff] disabled:cursor-not-allowed disabled:opacity-50"
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

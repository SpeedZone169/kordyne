"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import TurnstileWidget from "../../components/TurnstileWidget";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the bot check.");
      return;
    }

    const verifyRes = await fetch("/api/verify-turnstile", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token: turnstileToken }),
    });

    const verifyData = await verifyRes.json();

    if (!verifyData.success) {
      setError("Turnstile verification failed. Please try again.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company,
        },
      },
    });

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold">Create Account</h1>

        <form onSubmit={handleSignup} className="mt-8 space-y-4">
          <input
            type="text"
            placeholder="Full Name"
            className="w-full rounded-xl border px-4 py-3"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <input
            type="text"
            placeholder="Company"
            className="w-full rounded-xl border px-4 py-3"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full rounded-xl border px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Repeat Password"
            className="w-full rounded-xl border px-4 py-3"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />

          <TurnstileWidget onVerify={setTurnstileToken} />

          <button className="w-full rounded-xl bg-gray-900 py-3 text-white">
            Sign Up
          </button>

          {error ? <p className="text-red-600">{error}</p> : null}
        </form>
      </section>

      <Footer />
    </main>
  );
}
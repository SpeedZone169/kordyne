"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "http://localhost:3000/reset-password",
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Password reset email sent. Please check your inbox.");
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold">Forgot Password</h1>
        <p className="mt-4 text-gray-600">
          Enter your email and we’ll send you a password reset link.
        </p>

        <form onSubmit={handleReset} className="mt-8 space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <button className="w-full rounded-xl bg-gray-900 py-3 text-white">
            Send Reset Link
          </button>

          {message ? <p className="text-green-700">{message}</p> : null}
          {error ? <p className="text-red-600">{error}</p> : null}
        </form>
      </section>

      <Footer />
    </main>
  );
}
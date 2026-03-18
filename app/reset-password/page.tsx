"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleUpdatePassword(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!password || !repeatPassword) {
      setError("Please fill in both password fields.");
      return;
    }

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setError(error.message || "Unable to update password.");
        return;
      }

      setMessage("Your password has been updated. You can now log in.");
      setPassword("");
      setRepeatPassword("");

      setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-20">
        <h1 className="text-3xl font-bold">Reset Password</h1>
        <p className="mt-4 text-gray-600">
          Enter your new password below.
        </p>

        <form onSubmit={handleUpdatePassword} className="mt-8 space-y-4">
          <input
            type="password"
            placeholder="New Password"
            className="w-full rounded-xl border px-4 py-3"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Repeat New Password"
            className="w-full rounded-xl border px-4 py-3"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gray-900 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>

          {message ? <p className="text-green-700">{message}</p> : null}
          {error ? <p className="text-red-600">{error}</p> : null}
        </form>
      </section>

      <Footer />
    </main>
  );
}
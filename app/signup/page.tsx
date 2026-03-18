"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import TurnstileWidget from "../../components/TurnstileWidget";

type InviteDetails = {
  token: string;
  organization_name: string;
  email: string;
  role: string;
  status: string;
};

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const inviteToken = searchParams.get("invite");

  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(
    null
  );
  const [inviteLoading, setInviteLoading] = useState(Boolean(inviteToken));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      if (!inviteToken) {
        setInviteLoading(false);
        return;
      }

      setInviteLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/invites/details?token=${encodeURIComponent(inviteToken)}`
        );
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Unable to load invite.");
          setInviteLoading(false);
          return;
        }

        const invite = data.invite as InviteDetails;

        if (invite.status !== "pending") {
          setError("This invite is no longer pending.");
          setInviteLoading(false);
          return;
        }

        setInviteDetails(invite);
        setCompany(invite.organization_name || "");
        setEmail(invite.email || "");
      } catch {
        setError("Unable to load invite.");
      } finally {
        setInviteLoading(false);
      }
    }

    loadInvite();
  }, [inviteToken]);

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (password !== repeatPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!acceptedTerms) {
      setError("You must agree to the Terms and Conditions.");
      return;
    }

    if (!turnstileToken) {
      setError("Please complete the verification.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          company,
          email,
          password,
          repeatPassword,
          turnstileToken,
          acceptedTerms,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to create account.");
        return;
      }

      router.push(inviteToken ? `/invite/${inviteToken}` : "/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isInviteSignup = Boolean(inviteDetails);

  return (
    <>
      <h1 className="text-3xl font-bold">
        {isInviteSignup ? "Join Organization" : "Create Account"}
      </h1>

      {isInviteSignup ? (
        <p className="mt-4 text-gray-600">
          You are joining <strong>{inviteDetails?.organization_name}</strong> as{" "}
          <strong>{inviteDetails?.role}</strong>.
        </p>
      ) : null}

      {inviteLoading ? (
        <p className="mt-6 text-sm text-gray-600">Loading invite...</p>
      ) : (
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
            className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            disabled={isInviteSignup}
          />

          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-xl border px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isInviteSignup}
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

          <label className="block rounded-xl border border-gray-200 p-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1"
              />
              <div>
                <p>
                  I agree to the{" "}
                  <a
                    href="/terms"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    Terms and Conditions
                  </a>
                  .
                </p>
                <p className="mt-2">
                  Please also review our{" "}
                  <a
                    href="/privacy"
                    className="underline underline-offset-2 hover:no-underline"
                  >
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </div>
          </label>

          <TurnstileWidget onVerify={setTurnstileToken} />

          <button
            type="submit"
            disabled={loading || inviteLoading}
            className="w-full rounded-xl bg-gray-900 py-3 text-white disabled:opacity-60"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>

          {error ? <p className="text-red-600">{error}</p> : null}
        </form>
      )}
    </>
  );
}

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-md px-6 py-20">
        <Suspense
          fallback={<p className="text-sm text-gray-600">Loading signup...</p>}
        >
          <SignupPageContent />
        </Suspense>
      </section>

      <Footer />
    </main>
  );
}
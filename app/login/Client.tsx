"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import TurnstileWidget from "@/components/TurnstileWidget";
import { createClient } from "@/lib/supabase/client";

import styles from "./login.module.css";

type PortalMode = "customer" | "provider" | "admin";

type Props = {
  nextPath: string;
  portal: PortalMode;
};

function getLoginCopy(portal: PortalMode) {
  if (portal === "admin") {
    return {
      badge: "Admin sign in",
      title: "Access the Kordyne owner console",
      description:
        "Manage users, organizations, providers, requests, and internal platform oversight.",
    };
  }

  if (portal === "provider") {
    return {
      badge: "Provider sign in",
      title: "Access the Kordyne provider workspace",
      description:
        "Continue to incoming packages, RFQs, quote responses, and returned production evidence.",
    };
  }

  return {
    badge: "Customer sign in",
    title: "Access the Kordyne customer workspace",
    description:
      "Sign in to manage parts, requests, quotes, invoices, and your organization settings.",
  };
}

export default function Client({ nextPath, portal }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileKey, setTurnstileKey] = useState(0);
  const [turnstileError, setTurnstileError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = getLoginCopy(portal);

  async function resolvePostLoginDestination(): Promise<string> {
    if (portal === "admin") {
      return "/admin";
    }

    if (portal === "provider") {
      return "/provider";
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return nextPath || "/dashboard";
    }

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("platform_role")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profile?.platform_role === "platform_owner") {
        return "/admin";
      }
    } catch {
      // Continue to the organization routing checks.
    }

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

      if (membershipsError) {
        throw membershipsError;
      }

      const membershipOrgIds = (memberships ?? []).map(
        (row) => row.organization_id,
      );

      if (!membershipOrgIds.length) {
        return nextPath || "/dashboard";
      }

      const [
        { data: relationshipRows, error: relationshipError },
        { data: packageRows, error: packageError },
      ] = await Promise.all([
        supabase
          .from("provider_relationships")
          .select("provider_org_id")
          .in("provider_org_id", membershipOrgIds),
        supabase
          .from("provider_request_packages")
          .select("provider_org_id")
          .in("provider_org_id", membershipOrgIds),
      ]);

      if (relationshipError) {
        throw relationshipError;
      }

      if (packageError) {
        throw packageError;
      }

      const providerOrgIds = [
        ...new Set([
          ...(relationshipRows ?? []).map((row) => row.provider_org_id),
          ...(packageRows ?? []).map((row) => row.provider_org_id),
        ]),
      ];

      const providerSet = new Set(providerOrgIds);
      const isProviderOnly =
        membershipOrgIds.length > 0 &&
        providerOrgIds.length > 0 &&
        membershipOrgIds.every((orgId) => providerSet.has(orgId));

      if (isProviderOnly) {
        return "/provider";
      }
    } catch {
      // Preserve the safe fallback when role lookup is unavailable.
    }

    return nextPath || "/dashboard";
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (!turnstileToken) {
        throw new Error(turnstileError || "Please complete the security check.");
      }

      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          turnstileToken,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Invalid email or password.");
      }

      const destination = await resolvePostLoginDestination();

      router.replace(destination);
      router.refresh();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to sign in.",
      );
      setTurnstileToken("");
      setTurnstileError("");
      setTurnstileKey((value) => value + 1);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <article className={styles.loginCard}>
      <header className={styles.loginHeader}>
        <p className={styles.loginBadge}>{copy.badge}</p>
        <h1>{copy.title}</h1>
        <p className={styles.loginDescription}>{copy.description}</p>
      </header>

      <form onSubmit={handleLogin} className={styles.form}>
        <label>
          <span className={styles.srOnly}>Email address</span>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email Address"
            required
          />
        </label>

        <label className={styles.passwordField}>
          <span className={styles.srOnly}>Password</span>
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            <Image
              src="/marketing/icons/login-eye.svg"
              alt=""
              width={18}
              height={15}
            />
          </button>
        </label>

        <div className={styles.formOptions}>
          <span>Secure session</span>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>

        {error ? (
          <p className={styles.errorMessage} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.turnstilePanel}>
          <TurnstileWidget
            key={turnstileKey}
            action="login"
            onVerify={(token) => {
              setTurnstileToken(token);
              if (token) {
                setTurnstileError("");
              }
            }}
            onError={setTurnstileError}
          />
        </div>

        <div className={`${styles.formActions} ${styles.singleAction}`}>
          <button
            type="submit"
            disabled={submitting || !turnstileToken}
            className={styles.primaryButton}
          >
            <span>{submitting ? "Signing in..." : "Sign In"}</span>
            <span aria-hidden="true">&rarr;</span>
          </button>
        </div>
      </form>
    </article>
  );
}

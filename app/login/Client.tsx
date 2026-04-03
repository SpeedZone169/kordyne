"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        "Sign in to manage platform users, organizations, providers, requests, and internal platform oversight.",
    };
  }

  if (portal === "provider") {
    return {
      badge: "Provider sign in",
      title: "Access the Kordyne provider workspace",
      description:
        "Sign in with the invited account linked to your provider organization and continue into the provider portal.",
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
      // ignore and continue to other routing checks
    }

    try {
      const { data: memberships, error: membershipsError } = await supabase
        .from("organization_members")
        .select("organization_id")
        .eq("user_id", user.id);

      if (membershipsError) {
        throw membershipsError;
      }

      const membershipOrgIds = (memberships ?? []).map((row) => row.organization_id);

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
      // ignore and fall back
    }

    return nextPath || "/dashboard";
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      const destination = await resolvePostLoginDestination();

      router.replace(destination);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-145px)] w-full max-w-2xl items-center px-4 py-16 lg:px-6">
      <div className="w-full rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
          {copy.badge}
        </p>

        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
          {copy.title}
        </h1>

        <p className="mt-4 text-base leading-7 text-slate-600">
          {copy.description}
        </p>

        <form onSubmit={handleLogin} className="mt-8 space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-sm text-slate-500 hover:text-slate-900"
              >
                Forgot password?
              </Link>
            </div>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              required
            />
          </div>

          {error ? (
            <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in..." : "Sign in"}
            </button>

            {portal === "customer" ? (
              <Link
                href="/signup"
                className="rounded-full border border-zinc-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-zinc-50"
              >
                Create account
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
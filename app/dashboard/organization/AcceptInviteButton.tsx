"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type AcceptInviteButtonProps = {
  inviteToken: string;
};

function getFriendlyError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("email")) {
    return "You must be signed in with the invited email address to accept this invite.";
  }

  if (normalized.includes("accepted")) {
    return "This invite has already been accepted.";
  }

  if (normalized.includes("invalid") || normalized.includes("not found")) {
    return "This invite is invalid or no longer available.";
  }

  return message || "Failed to accept invite.";
}

export default function AcceptInviteButton({
  inviteToken,
}: AcceptInviteButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function resolvePostAcceptDestination() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return "/login";
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership?.organization_id) {
      return "/dashboard";
    }

    const { count: providerRelationshipCount, error: providerLookupError } =
      await supabase
        .from("provider_relationships")
        .select("*", { count: "exact", head: true })
        .eq("provider_org_id", membership.organization_id);

    if (!providerLookupError && (providerRelationshipCount ?? 0) > 0) {
      return "/provider";
    }

    return "/dashboard";
  }

  async function handleAccept() {
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const { error } = await supabase.rpc("accept_invite", {
        invite_token: inviteToken,
      });

      if (error) {
        setError(getFriendlyError(error.message));
        return;
      }

      const destination = await resolvePostAcceptDestination();
      router.replace(destination);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Organization"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type AcceptInviteButtonProps = {
  inviteToken: string;
};

export default function AcceptInviteButton({
  inviteToken,
}: AcceptInviteButtonProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleAccept() {
    setLoading(true);
    setError("");
    setSuccess("");

    const { error } = await supabase.rpc("accept_invite", {
      invite_token: inviteToken,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Invite accepted.");
    setLoading(false);
    router.push("/dashboard/organization");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Organization"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </div>
  );
}
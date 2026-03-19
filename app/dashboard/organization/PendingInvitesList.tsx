"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type PendingInvite = {
  id: string;
  token: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
};

type PendingInvitesListProps = {
  invites: PendingInvite[];
  isAdmin: boolean;
};

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function PendingInvitesList({
  invites,
  isAdmin,
}: PendingInvitesListProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleRevoke(inviteId: string) {
    if (!isAdmin) return;

    setError("");
    setLoadingId(inviteId);

    try {
      const { error: updateError } = await supabase
        .from("organization_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCopy(token: string, inviteId: string) {
    try {
      const inviteUrl = `${window.location.origin}/invite/${token}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedId(inviteId);

      setTimeout(() => {
        setCopiedId(null);
      }, 2000);
    } catch {
      setError("Unable to copy invite link.");
    }
  }

  if (invites.length === 0) {
    return <p className="mt-4 text-sm text-gray-600">No pending invites.</p>;
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Email</th>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Role</th>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Status</th>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Created</th>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Link</th>
              <th className="px-4 py-4 font-medium whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody>
            {invites.map((invite) => (
              <tr key={invite.id} className="border-t border-gray-200 align-top">
                <td className="px-4 py-4 min-w-[240px] break-words">
                  {invite.email}
                </td>
                <td className="px-4 py-4 whitespace-nowrap capitalize">
                  {invite.role}
                </td>
                <td className="px-4 py-4 whitespace-nowrap capitalize">
                  {invite.status}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {formatDate(invite.created_at)}
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => handleCopy(invite.token, invite.id)}
                    className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                  >
                    {copiedId === invite.id ? "Copied" : "Copy Link"}
                  </button>
                </td>
                <td className="px-4 py-4 whitespace-nowrap">
                  {isAdmin && invite.status === "pending" ? (
                    <button
                      type="button"
                      onClick={() => handleRevoke(invite.id)}
                      disabled={loadingId === invite.id}
                      className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                    >
                      {loadingId === invite.id ? "Revoking..." : "Revoke"}
                    </button>
                  ) : (
                    "-"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
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

    const { error: updateError } = await supabase
      .from("organization_invites")
      .update({ status: "revoked" })
      .eq("id", inviteId);

    if (updateError) {
      setError(updateError.message);
      setLoadingId(null);
      return;
    }

    setLoadingId(null);
    router.refresh();
  }

  async function handleCopy(token: string, inviteId: string) {
    const inviteUrl = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopiedId(inviteId);

    setTimeout(() => {
      setCopiedId(null);
    }, 2000);
  }

  if (invites.length === 0) {
    return <p className="mt-4 text-sm text-gray-600">No pending invites.</p>;
  }

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-4 font-medium">Email</th>
            <th className="px-6 py-4 font-medium">Role</th>
            <th className="px-6 py-4 font-medium">Status</th>
            <th className="px-6 py-4 font-medium">Created</th>
            <th className="px-6 py-4 font-medium">Link</th>
            <th className="px-6 py-4 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {invites.map((invite) => (
            <tr key={invite.id} className="border-t border-gray-200">
              <td className="px-6 py-4">{invite.email}</td>
              <td className="px-6 py-4">{invite.role}</td>
              <td className="px-6 py-4">{invite.status}</td>
              <td className="px-6 py-4">{formatDate(invite.created_at)}</td>
              <td className="px-6 py-4">
                <button
                  type="button"
                  onClick={() => handleCopy(invite.token, invite.id)}
                  className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50"
                >
                  {copiedId === invite.id ? "Copied" : "Copy Link"}
                </button>
              </td>
              <td className="px-6 py-4">
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

      {error ? <p className="p-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
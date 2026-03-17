"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type OrganizationInviteFormProps = {
  organizationId: string;
  seatLimit: number;
  activeMemberCount: number;
  pendingInviteCount: number;
  isAdmin: boolean;
};

const ROLE_OPTIONS = [
  { value: "engineer", label: "Engineer" },
  { value: "viewer", label: "Viewer" },
];

export default function OrganizationInviteForm({
  organizationId,
  seatLimit,
  activeMemberCount,
  pendingInviteCount,
  isAdmin,
}: OrganizationInviteFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("engineer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const seatsUsed = activeMemberCount + pendingInviteCount;
  const seatsRemaining = Math.max(seatLimit - seatsUsed, 0);
  const canInvite = isAdmin && seatsRemaining > 0;

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!isAdmin) {
      setError("Only admins can invite members.");
      return;
    }

    if (seatsRemaining <= 0) {
      setError("Seat limit reached for your current plan.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    const { error: insertError } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: organizationId,
        email: normalizedEmail,
        role,
        status: "pending",
      });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setSuccess("Invite created.");
    setEmail("");
    setRole("engineer");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleInvite} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">Invite Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={!isAdmin || loading}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
          placeholder="teammate@company.com"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium">Role</label>
        <select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={!isAdmin || loading}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        <p>
          Seats used: {seatsUsed} / {seatLimit}
        </p>
        <p>Active members: {activeMemberCount}</p>
        <p>Pending invites: {pendingInviteCount}</p>
        <p>Seats remaining: {seatsRemaining}</p>
      </div>

      <button
        type="submit"
        disabled={!canInvite || loading}
        className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Creating Invite..." : "Invite Member"}
      </button>

      {!isAdmin ? (
        <p className="text-sm text-gray-500">
          Only admins can invite members.
        </p>
      ) : null}

      {seatsRemaining <= 0 ? (
        <p className="text-sm text-red-600">
          Your organization has reached its seat limit.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </form>
  );
}
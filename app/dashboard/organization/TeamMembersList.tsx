"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type TeamMember = {
  member_user_id: string;
  member_role: string;
  full_name: string | null;
  email: string | null;
  joined_at: string | null;
};

type TeamMembersListProps = {
  members: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
};

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "engineer", label: "Engineer" },
  { value: "viewer", label: "Viewer" },
];

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-gray-900 text-white";
    case "engineer":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function TeamMembersList({
  members,
  isAdmin,
  currentUserId,
}: TeamMembersListProps) {
  const supabase = createClient();
  const router = useRouter();

  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    Object.fromEntries(
      members.map((member) => [member.member_user_id, member.member_role])
    )
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSaveRole(memberUserId: string) {
    setError("");
    setSuccess("");
    setLoadingId(memberUserId);

    try {
      const nextRole = selectedRoles[memberUserId];

      const { error } = await supabase.rpc("update_org_member_role", {
        target_user_id: memberUserId,
        new_role: nextRole,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Member role updated.");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  async function handleRemove(memberUserId: string, displayName: string) {
    const confirmed = window.confirm(
      `Remove ${displayName} from the organization?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");
    setLoadingId(memberUserId);

    try {
      const { error } = await supabase.rpc("remove_org_member", {
        target_user_id: memberUserId,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess("Member removed.");
      router.refresh();
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-2xl border border-gray-200">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Email</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Joined</th>
              {isAdmin ? (
                <th className="px-6 py-4 font-medium">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => {
              const isSelf = member.member_user_id === currentUserId;
              const displayName = member.full_name || member.email || "this member";
              const roleChanged =
                selectedRoles[member.member_user_id] !== member.member_role;

              return (
                <tr
                  key={member.member_user_id}
                  className="border-t border-gray-200 align-top"
                >
                  <td className="px-6 py-4">{member.full_name || "-"}</td>
                  <td className="px-6 py-4">{member.email || "-"}</td>
                  <td className="px-6 py-4">
                    {isAdmin ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                            member.member_role
                          )}`}
                        >
                          {member.member_role}
                        </span>

                        {!isSelf ? (
                          <select
                            value={selectedRoles[member.member_user_id] || member.member_role}
                            onChange={(e) =>
                              setSelectedRoles((prev) => ({
                                ...prev,
                                [member.member_user_id]: e.target.value,
                              }))
                            }
                            disabled={loadingId === member.member_user_id}
                            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500">You</span>
                        )}
                      </div>
                    ) : (
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                          member.member_role
                        )}`}
                      >
                        {member.member_role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">{formatDate(member.joined_at)}</td>

                  {isAdmin ? (
                    <td className="px-6 py-4">
                      {isSelf ? (
                        <span className="text-sm text-gray-500">
                          Your account
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveRole(member.member_user_id)}
                            disabled={
                              loadingId === member.member_user_id || !roleChanged
                            }
                            className="rounded-xl border border-gray-300 px-3 py-2 text-xs font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            {loadingId === member.member_user_id
                              ? "Saving..."
                              : "Save Role"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleRemove(member.member_user_id, displayName)
                            }
                            disabled={loadingId === member.member_user_id}
                            className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            {loadingId === member.member_user_id
                              ? "Working..."
                              : "Remove"}
                          </button>
                        </div>
                      )}
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {success ? <p className="mt-4 text-sm text-green-700">{success}</p> : null}
      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
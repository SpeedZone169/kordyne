"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

type OrganizationSettingsFormProps = {
  organizationId: string;
  initialName: string;
  isAdmin: boolean;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OrganizationSettingsForm({
  organizationId,
  initialName,
  isAdmin,
}: OrganizationSettingsFormProps) {
  const supabase = createClient();
  const router = useRouter();

  const [name, setName] = useState(initialName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const changed = name.trim() !== initialName.trim();

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!isAdmin) {
      setError("Only organization admins can update settings.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Organization name is required.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("organizations")
      .update({
        name: trimmedName,
        slug: slugify(trimmedName),
      })
      .eq("id", organizationId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSuccess("Organization updated.");
    setLoading(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium">
          Organization Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={!isAdmin || loading}
          className="w-full rounded-2xl border border-gray-300 px-4 py-3 disabled:bg-gray-50 disabled:text-gray-500"
        />
      </div>

      <button
        type="submit"
        disabled={!isAdmin || !changed || loading}
        className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving..." : "Save Changes"}
      </button>

      {!isAdmin ? (
        <p className="text-sm text-gray-500">
          Only admins can update organization settings.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-green-700">{success}</p> : null}
    </form>
  );
}
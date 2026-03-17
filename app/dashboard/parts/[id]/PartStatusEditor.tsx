"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type PartStatusEditorProps = {
  partId: string;
  currentStatus: string | null;
};

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

export default function PartStatusEditor({
  partId,
  currentStatus,
}: PartStatusEditorProps) {
  const supabase = createClient();
  const router = useRouter();

  const initialStatus = currentStatus || "draft";

  const [selectedStatus, setSelectedStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const statusChanged = selectedStatus !== initialStatus;

  async function handleSave() {
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from("parts")
        .update({
          status: selectedStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", partId);

      if (updateError) {
        setError(`Status update failed: ${updateError.message}`);
        return;
      }

      setSuccess("Status updated.");
      router.refresh();
    } catch {
      setError("Something went wrong while updating the status.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={selectedStatus}
          onChange={(e) => {
            setSelectedStatus(e.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={saving}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSave}
          disabled={!statusChanged || saving}
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      {success ? <p className="text-xs text-green-700">{success}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
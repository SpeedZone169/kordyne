"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type FileActionsProps = {
  fileId: string;
  fileName: string;
  storagePath: string;
  signedUrl: string | null;
};

export default function FileActions({
  fileId,
  fileName,
  storagePath,
  signedUrl,
}: FileActionsProps) {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${fileName}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setLoading(true);
    setError("");

    try {
      const { error: storageError } = await supabase.storage
        .from("part-files")
        .remove([storagePath]);

      if (storageError) {
        setError(`Storage delete failed: ${storageError.message}`);
        setLoading(false);
        return;
      }

      const { error: dbError } = await supabase
        .from("part_files")
        .delete()
        .eq("id", fileId);

      if (dbError) {
        setError(`Database delete failed: ${dbError.message}`);
        setLoading(false);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong while deleting the file.");
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {signedUrl ? (
        <a
          href={signedUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
        >
          Download
        </a>
      ) : (
        <span className="text-sm text-gray-400">Unavailable</span>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Deleting..." : "Delete"}
      </button>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
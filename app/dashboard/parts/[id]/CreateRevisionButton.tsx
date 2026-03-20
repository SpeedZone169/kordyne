"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  sourcePartId: string;
  currentRevision: string | null;
};

export default function CreateRevisionButton({
  sourcePartId,
  currentRevision,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newRevision, setNewRevision] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setNewRevision("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/parts/create-revision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourcePartId,
          newRevision,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create revision.");
      }

      closeModal();
      router.push(`/dashboard/parts/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create revision.");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex rounded-2xl border border-gray-300 px-5 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50"
      >
        Create New Revision
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Revision
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                This will create a new part record in the same revision family.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Current revision
                </label>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  {currentRevision || "-"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  New revision
                </label>
                <input
                  type="text"
                  value={newRevision}
                  onChange={(e) => setNewRevision(e.target.value)}
                  placeholder="Example: B"
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  required
                  disabled={loading}
                />
              </div>

              <p className="text-xs text-gray-500">
                Metadata will be copied from the current part. Files are not copied yet.
              </p>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create Revision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
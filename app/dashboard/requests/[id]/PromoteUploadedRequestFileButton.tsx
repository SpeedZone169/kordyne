"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const FILE_CATEGORY_OPTIONS = [
  { value: "cad_3d", label: "CAD 3D" },
  { value: "drawing_2d", label: "2D Drawings" },
  { value: "image", label: "Images" },
  { value: "manufacturing_doc", label: "Manufacturing Docs" },
  { value: "quality_doc", label: "Quality Docs" },
  { value: "other", label: "Other" },
] as const;

type Props = {
  requestId: string;
  uploadedFileId: string;
  initialAssetCategory: string | null;
};

export default function PromoteUploadedRequestFileButton({
  requestId,
  uploadedFileId,
  initialAssetCategory,
}: Props) {
  const router = useRouter();
  const [assetCategory, setAssetCategory] = useState(
    initialAssetCategory || "other"
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePromote() {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/service-requests/${requestId}/promote-uploaded-file`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uploadedFileId,
            assetCategory,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save file into the vault.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save file into the vault."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={assetCategory}
          onChange={(e) => setAssetCategory(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
          disabled={submitting}
        >
          {FILE_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handlePromote}
          disabled={submitting}
          className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {submitting ? "Saving..." : "Save to vault"}
        </button>
      </div>

      {error ? <div className="text-xs text-red-600">{error}</div> : null}
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type FileActionsProps = {
  fileId: string;
  fileName: string;
  storagePath: string;
  signedUrl: string | null;
  assetCategory: string | null;
};

const CATEGORY_OPTIONS = [
  { value: "cad_3d", label: "CAD 3D" },
  { value: "drawing_2d", label: "2D Drawing" },
  { value: "image", label: "Image" },
  { value: "manufacturing_doc", label: "Manufacturing Doc" },
  { value: "quality_doc", label: "Quality Doc" },
  { value: "other", label: "Other" },
] as const;

const ALLOWED_EXTENSIONS_BY_CATEGORY: Record<string, string[]> = {
  cad_3d: ["step", "stp", "iges", "igs", "stl"],
  drawing_2d: ["pdf"],
  image: ["png", "jpg", "jpeg"],
  manufacturing_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
  quality_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
  other: ["pdf", "png", "jpg", "jpeg", "csv"],
};

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

export default function FileActions({
  fileId,
  fileName,
  storagePath,
  signedUrl,
  assetCategory,
}: FileActionsProps) {
  const supabase = createClient();
  const router = useRouter();

  const initialCategory = assetCategory || "other";
  const fileExtension = getFileExtension(fileName);

  const allowedCategoryOptions = useMemo(() => {
    return CATEGORY_OPTIONS.filter((option) =>
      (ALLOWED_EXTENSIONS_BY_CATEGORY[option.value] || []).includes(
        fileExtension
      )
    );
  }, [fileExtension]);

  const safeInitialCategory = allowedCategoryOptions.some(
    (option) => option.value === initialCategory
  )
    ? initialCategory
    : allowedCategoryOptions[0]?.value || "other";

  const [selectedCategory, setSelectedCategory] = useState(safeInitialCategory);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const categoryChanged = selectedCategory !== safeInitialCategory;
  const canChangeCategory = allowedCategoryOptions.length > 1;

  async function handleSaveCategory() {
    setError("");
    setSuccess("");
    setSavingCategory(true);

    try {
      const { error: updateError } = await supabase
        .from("part_files")
        .update({ asset_category: selectedCategory })
        .eq("id", fileId);

      if (updateError) {
        setError(`Category update failed: ${updateError.message}`);
        return;
      }

      setSuccess("Category updated.");
      router.refresh();
    } catch {
      setError("Something went wrong while updating the category.");
    } finally {
      setSavingCategory(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${fileName}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const { error: storageError } = await supabase.storage
        .from("part-files")
        .remove([storagePath]);

      if (storageError) {
        setError(`Storage delete failed: ${storageError.message}`);
        return;
      }

      const { error: dbError } = await supabase
        .from("part_files")
        .delete()
        .eq("id", fileId);

      if (dbError) {
        setError(`Database delete failed: ${dbError.message}`);
        return;
      }

      router.refresh();
    } catch {
      setError("Something went wrong while deleting the file.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setError("");
            setSuccess("");
          }}
          disabled={!canChangeCategory || savingCategory || deleting}
          className="rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 disabled:opacity-50"
        >
          {allowedCategoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSaveCategory}
          disabled={
            !canChangeCategory || !categoryChanged || savingCategory || deleting
          }
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 transition hover:bg-gray-50 disabled:opacity-50"
        >
          {savingCategory ? "Saving..." : "Save"}
        </button>

        {signedUrl ? (
          <a
            href={signedUrl}
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
          disabled={deleting || savingCategory}
          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>

      {!canChangeCategory ? (
        <p className="text-xs text-gray-500">
          This file type can only belong to one category.
        </p>
      ) : null}

      {success ? <p className="text-xs text-green-700">{success}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
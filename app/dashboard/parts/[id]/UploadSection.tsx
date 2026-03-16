"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type UploadSectionProps = {
  partId: string;
};

const CATEGORY_OPTIONS = [
  { value: "cad_3d", label: "CAD 3D" },
  { value: "drawing_2d", label: "2D Drawing" },
  { value: "image", label: "Image" },
  { value: "manufacturing_doc", label: "Manufacturing Doc" },
  { value: "quality_doc", label: "Quality Doc" },
  { value: "other", label: "Other" },
] as const;

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB hard limit

const ALLOWED_EXTENSIONS_BY_CATEGORY: Record<string, string[]> = {
  cad_3d: ["step", "stp", "iges", "igs", "stl"],
  drawing_2d: ["pdf"],
  image: ["png", "jpg", "jpeg"],
  manufacturing_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
  quality_doc: ["pdf", "doc", "docx", "xls", "xlsx", "csv"],
  other: ["pdf", "png", "jpg", "jpeg", "csv", "txt", "zip"],
};

function getFileExtension(fileName: string) {
  const parts = fileName.split(".");
  if (parts.length < 2) return "";
  return parts.pop()!.toLowerCase();
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadSection({ partId }: UploadSectionProps) {
  const supabase = createClient();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [assetCategory, setAssetCategory] = useState("cad_3d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const allowedExtensions = useMemo(() => {
    return ALLOWED_EXTENSIONS_BY_CATEGORY[assetCategory] || [];
  }, [assetCategory]);

  const acceptedFileText = useMemo(() => {
    return allowedExtensions.map((ext) => `.${ext}`).join(", ");
  }, [allowedExtensions]);

  function validateSelectedFile(selectedFile: File | null, category: string) {
    if (!selectedFile) {
      return "Please choose a file.";
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      return `File is too large. Maximum allowed size is ${formatBytes(
        MAX_FILE_SIZE_BYTES
      )}.`;
    }

    const extension = getFileExtension(selectedFile.name);

    if (!extension) {
      return "File must have a valid extension.";
    }

    const allowed = ALLOWED_EXTENSIONS_BY_CATEGORY[category] || [];

    if (!allowed.includes(extension)) {
      return `Invalid file type for this category. Allowed types: ${allowed
        .map((ext) => `.${ext}`)
        .join(", ")}.`;
    }

    return null;
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateSelectedFile(file, assetCategory);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }

      const selectedFile = file as File;
      const fileExt = getFileExtension(selectedFile.name);
      const safeFileName = sanitizeFileName(selectedFile.name);
      const filePath = `${user.id}/${partId}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("part-files")
        .upload(filePath, selectedFile, {
          upsert: false,
        });

      if (uploadError) {
        setError(`Storage upload failed: ${uploadError.message}`);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("part_files").insert({
        part_id: partId,
        user_id: user.id,
        file_name: selectedFile.name,
        file_type: fileExt,
        asset_category: assetCategory,
        storage_path: filePath,
      });

      if (insertError) {
        setError(`Database insert failed: ${insertError.message}`);
        setLoading(false);
        return;
      }

      setSuccess("File uploaded successfully.");
      setFile(null);
      router.refresh();
    } catch {
      setError("Something went wrong during upload.");
    } finally {
      setLoading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess("");

    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);

    const validationError = validateSelectedFile(selectedFile, assetCategory);

    if (validationError) {
      setError(validationError);
    }
  }

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextCategory = e.target.value;
    setAssetCategory(nextCategory);
    setError("");
    setSuccess("");

    if (file) {
      const validationError = validateSelectedFile(file, nextCategory);
      if (validationError) {
        setError(validationError);
      }
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Upload File</h2>

      <form onSubmit={handleUpload} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">
            Asset Category
          </label>
          <select
            value={assetCategory}
            onChange={handleCategoryChange}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3"
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-900">Upload rules</p>
          <p className="mt-2 text-sm text-gray-600">
            Allowed file types for this category: {acceptedFileText || "None"}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Maximum file size: {formatBytes(MAX_FILE_SIZE_BYTES)}
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Choose File</label>

          <label className="inline-flex cursor-pointer items-center rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50">
            Select File
            <input
              type="file"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <p className="mt-2 text-sm text-gray-600">
            {file
              ? `${file.name} (${formatBytes(file.size)})`
              : "No file selected"}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !file}
          className="rounded-2xl bg-gray-900 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Uploading..." : "Upload File"}
        </button>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-700">{success}</p> : null}
      </form>
    </div>
  );
}
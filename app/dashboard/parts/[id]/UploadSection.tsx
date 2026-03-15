"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type UploadSectionProps = {
  partId: string;
};

export default function UploadSection({ partId }: UploadSectionProps) {
  const supabase = createClient();
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [assetCategory, setAssetCategory] = useState("cad_3d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please choose a file.");
      return;
    }

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const fileExt = file.name.split(".").pop() || "";
    const filePath = `${user.id}/${partId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("part-files")
      .upload(filePath, file);

    if (uploadError) {
      setError(`Storage upload failed: ${uploadError.message}`);
      setLoading(false);
      return;
    }

    const { error: insertError } = await supabase.from("part_files").insert({
      part_id: partId,
      user_id: user.id,
      file_name: file.name,
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
    setLoading(false);
    router.refresh();
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
            onChange={(e) => setAssetCategory(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 px-4 py-3"
          >
            <option value="cad_3d">CAD 3D</option>
            <option value="drawing_2d">2D Drawing</option>
            <option value="image">Image</option>
            <option value="manufacturing_doc">Manufacturing Doc</option>
            <option value="quality_doc">Quality Doc</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Choose File</label>

          <label className="inline-flex cursor-pointer items-center rounded-2xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-900 transition hover:bg-gray-50">
            Select File
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </label>

          <p className="mt-2 text-sm text-gray-600">
            {file ? file.name : "No file selected"}
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
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
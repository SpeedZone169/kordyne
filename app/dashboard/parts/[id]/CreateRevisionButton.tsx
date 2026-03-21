"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SourceFileOption = {
  id: string;
  fileName: string;
  assetCategory: string | null;
  fileType: string | null;
};

type Props = {
  sourcePartId: string;
  currentRevision: string | null;
  sourceFiles: SourceFileOption[];
};

const FILE_CATEGORY_ORDER = [
  "cad_3d",
  "drawing_2d",
  "image",
  "manufacturing_doc",
  "quality_doc",
  "other",
] as const;

const FILE_CATEGORY_LABELS: Record<string, string> = {
  cad_3d: "CAD 3D",
  drawing_2d: "2D Drawings",
  image: "Images",
  manufacturing_doc: "Manufacturing Docs",
  quality_doc: "Quality Docs",
  other: "Other",
};

function groupSourceFiles(files: SourceFileOption[]) {
  const grouped: Record<string, SourceFileOption[]> = {
    cad_3d: [],
    drawing_2d: [],
    image: [],
    manufacturing_doc: [],
    quality_doc: [],
    other: [],
  };

  for (const file of files) {
    const category =
      file.assetCategory && FILE_CATEGORY_LABELS[file.assetCategory]
        ? file.assetCategory
        : "other";

    grouped[category].push(file);
  }

  return grouped;
}

export default function CreateRevisionButton({
  sourcePartId,
  currentRevision,
  sourceFiles,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [newRevision, setNewRevision] = useState("");
  const [revisionNote, setRevisionNote] = useState("");
  const [fileCopyMode, setFileCopyMode] = useState<"none" | "selected">("none");
  const [selectedSourceFileIds, setSelectedSourceFileIds] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const groupedFiles = useMemo(() => groupSourceFiles(sourceFiles), [sourceFiles]);

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setNewRevision("");
    setRevisionNote("");
    setFileCopyMode("none");
    setSelectedSourceFileIds([]);
    setError("");
  }

  function toggleFile(fileId: string) {
    setSelectedSourceFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  }

  function selectAllInCategory(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => Array.from(new Set([...prev, ...fileIds])));
  }

  function clearCategory(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => prev.filter((id) => !fileIds.includes(id)));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (fileCopyMode === "selected" && selectedSourceFileIds.length === 0) {
      setError("Select at least one file to copy, or choose Start with no files.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/parts/create-revision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sourcePartId,
          newRevision,
          revisionNote,
          fileCopyMode,
          selectedSourceFileIds,
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
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Revision
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                This will create a new part record in the same revision family.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
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

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  What changed in this revision?
                </label>
                <textarea
                  value={revisionNote}
                  onChange={(e) => setRevisionNote(e.target.value)}
                  rows={4}
                  placeholder="Example: Updated mounting hole positions and revised manufacturing drawing."
                  className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  disabled={loading}
                />
              </div>

              <div className="rounded-2xl border border-gray-200 p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  File handling
                </h4>
                <p className="mt-1 text-sm text-gray-600">
                  Decide whether the new revision starts empty or copies selected files from the current revision.
                </p>

                <div className="mt-4 space-y-3">
                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
                    <input
                      type="radio"
                      name="fileCopyMode"
                      value="none"
                      checked={fileCopyMode === "none"}
                      onChange={() => setFileCopyMode("none")}
                      disabled={loading}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Start with no files
                      </div>
                      <div className="text-sm text-gray-600">
                        Create the revision and upload or attach files later.
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-4 py-3">
                    <input
                      type="radio"
                      name="fileCopyMode"
                      value="selected"
                      checked={fileCopyMode === "selected"}
                      onChange={() => setFileCopyMode("selected")}
                      disabled={loading}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Copy selected files
                      </div>
                      <div className="text-sm text-gray-600">
                        Duplicate chosen files into the new revision.
                      </div>
                    </div>
                  </label>
                </div>

                {fileCopyMode === "selected" ? (
                  <div className="mt-5 rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h5 className="text-sm font-semibold text-gray-900">
                          Select files to copy
                        </h5>
                        <p className="mt-1 text-sm text-gray-600">
                          Choose only the files that should carry into the new revision.
                        </p>
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedSourceFileIds.length} selected
                      </div>
                    </div>

                    {sourceFiles.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-500">
                        No files are attached to the current revision.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {FILE_CATEGORY_ORDER.map((category) => {
                          const categoryFiles = groupedFiles[category];

                          if (!categoryFiles || categoryFiles.length === 0) {
                            return null;
                          }

                          const categoryFileIds = categoryFiles.map((file) => file.id);

                          return (
                            <div
                              key={category}
                              className="rounded-xl border border-gray-200 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {FILE_CATEGORY_LABELS[category]}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {categoryFiles.length} file
                                    {categoryFiles.length === 1 ? "" : "s"}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => selectAllInCategory(categoryFileIds)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    Select all
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => clearCategory(categoryFileIds)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 space-y-2">
                                {categoryFiles.map((file) => {
                                  const isSelected = selectedSourceFileIds.includes(
                                    file.id
                                  );

                                  return (
                                    <label
                                      key={file.id}
                                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleFile(file.id)}
                                        disabled={loading}
                                        className="mt-0.5 h-4 w-4 rounded border-gray-300"
                                      />

                                      <div className="min-w-0">
                                        <div className="text-sm font-medium text-gray-900">
                                          {file.fileName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {file.fileType || "unknown"}
                                        </div>
                                      </div>
                                    </label>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

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
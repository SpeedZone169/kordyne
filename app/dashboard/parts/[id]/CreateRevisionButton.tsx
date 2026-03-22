"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SourceFileOption = {
  id: string;
  fileName: string;
  assetCategory: string | null;
  fileType: string | null;
  sourceRevision: string | null;
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

type RevisionCategoryGroup = {
  category: string;
  files: SourceFileOption[];
};

type RevisionFileGroup = {
  revision: string;
  isCurrent: boolean;
  files: SourceFileOption[];
  categories: RevisionCategoryGroup[];
};

type RevisionSortKey =
  | { type: "numeric"; value: number }
  | { type: "alphabetic"; value: number }
  | { type: "text"; value: string };

function normalizeCategory(assetCategory: string | null) {
  return assetCategory && FILE_CATEGORY_LABELS[assetCategory]
    ? assetCategory
    : "other";
}

function normalizeRevisionLabel(revision: string | null) {
  return revision?.trim() || "-";
}

function detectRevisionScheme(
  revision: string | null
): "numeric" | "alphabetic" | null {
  const normalized = revision?.trim().toUpperCase();

  if (!normalized) return null;
  if (/^[0-9]+$/.test(normalized)) return "numeric";
  if (/^[A-Z]+$/.test(normalized)) return "alphabetic";

  return null;
}

function alphabeticLabelToIndex(label: string) {
  const normalized = label.trim().toUpperCase();

  if (!/^[A-Z]+$/.test(normalized)) {
    return null;
  }

  let result = 0;

  for (let i = 0; i < normalized.length; i += 1) {
    result = result * 26 + (normalized.charCodeAt(i) - 64);
  }

  return result;
}

function indexToAlphabeticLabel(index: number) {
  if (index < 1) return null;

  let value = index;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function getNextRevisionPreview(currentRevision: string | null) {
  const normalized = currentRevision?.trim();

  if (!normalized) {
    return "Automatically assigned";
  }

  const scheme = detectRevisionScheme(normalized);

  if (scheme === "numeric") {
    return String(Number(normalized) + 1);
  }

  if (scheme === "alphabetic") {
    const currentIndex = alphabeticLabelToIndex(normalized);

    if (!currentIndex) {
      return "Automatically assigned";
    }

    return indexToAlphabeticLabel(currentIndex + 1) || "Automatically assigned";
  }

  return "Automatically assigned";
}

function getRevisionSortKey(revision: string): RevisionSortKey {
  const normalized = normalizeRevisionLabel(revision);
  const scheme = detectRevisionScheme(normalized);

  if (scheme === "numeric") {
    return { type: "numeric", value: Number(normalized) };
  }

  if (scheme === "alphabetic") {
    return {
      type: "alphabetic",
      value: alphabeticLabelToIndex(normalized) ?? 0,
    };
  }

  return { type: "text", value: normalized.toUpperCase() };
}

function compareRevisionLabels(a: string, b: string) {
  const aKey = getRevisionSortKey(a);
  const bKey = getRevisionSortKey(b);

  if (aKey.type === "numeric" && bKey.type === "numeric") {
    return bKey.value - aKey.value;
  }

  if (aKey.type === "alphabetic" && bKey.type === "alphabetic") {
    return bKey.value - aKey.value;
  }

  if (aKey.type === "text" && bKey.type === "text") {
    return bKey.value.localeCompare(aKey.value, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return b.localeCompare(a, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function groupSourceFiles(
  files: SourceFileOption[],
  currentRevision: string | null
): RevisionFileGroup[] {
  const revisionMap = new Map<string, SourceFileOption[]>();

  for (const file of files) {
    const revision = normalizeRevisionLabel(file.sourceRevision);
    const existing = revisionMap.get(revision) || [];
    existing.push(file);
    revisionMap.set(revision, existing);
  }

  const currentRevisionLabel = normalizeRevisionLabel(currentRevision);

  return Array.from(revisionMap.entries())
    .map(([revision, revisionFiles]) => {
      const categories: RevisionCategoryGroup[] = FILE_CATEGORY_ORDER.map(
        (category) => ({
          category,
          files: revisionFiles.filter(
            (file) => normalizeCategory(file.assetCategory) === category
          ),
        })
      ).filter((group) => group.files.length > 0);

      return {
        revision,
        isCurrent: revision === currentRevisionLabel,
        files: revisionFiles,
        categories,
      };
    })
    .sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return compareRevisionLabels(a.revision, b.revision);
    });
}

export default function CreateRevisionButton({
  sourcePartId,
  currentRevision,
  sourceFiles,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [fileCopyMode, setFileCopyMode] = useState<"none" | "selected">("none");
  const [selectedSourceFileIds, setSelectedSourceFileIds] = useState<string[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const revisionGroups = useMemo(
    () => groupSourceFiles(sourceFiles, currentRevision),
    [sourceFiles, currentRevision]
  );

  const nextRevisionPreview = useMemo(
    () => getNextRevisionPreview(currentRevision),
    [currentRevision]
  );

  function closeModal(force = false) {
    if (loading && !force) return;

    setOpen(false);
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

  function selectAllInRevision(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => Array.from(new Set([...prev, ...fileIds])));
  }

  function clearRevision(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => prev.filter((id) => !fileIds.includes(id)));
  }

  function selectAllInCategory(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => Array.from(new Set([...prev, ...fileIds])));
  }

  function clearCategory(fileIds: string[]) {
    setSelectedSourceFileIds((prev) => prev.filter((id) => !fileIds.includes(id)));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const trimmedRevisionNote = revisionNote.trim();

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
          revisionNote: trimmedRevisionNote,
          fileCopyMode,
          selectedSourceFileIds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create revision.");
      }

      closeModal(true);
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
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b border-gray-200 px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Revision
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                The next revision is assigned automatically by the system based on
                this part family&apos;s revision scheme.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
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
                    Next revision
                  </label>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    {nextRevisionPreview}
                  </div>
                </div>
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
                  Decide whether the new revision starts empty or copies selected
                  files from any revision in this part family.
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
                        Copy selected files from revision family
                      </div>
                      <div className="text-sm text-gray-600">
                        Pick files from any revision in the family and copy them
                        into the new revision.
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
                          Files are grouped by revision first, then by category.
                        </p>
                      </div>

                      <div className="text-xs text-gray-500">
                        {selectedSourceFileIds.length} selected
                      </div>
                    </div>

                    {sourceFiles.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-500">
                        No files are attached anywhere in this revision family.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {revisionGroups.map((group) => {
                          const revisionFileIds = group.files.map((file) => file.id);

                          return (
                            <div
                              key={group.revision}
                              className="rounded-xl border border-gray-200 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-sm font-medium text-gray-900">
                                      Rev {group.revision}
                                    </div>
                                    {group.isCurrent ? (
                                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700">
                                        Current
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {group.files.length} file
                                    {group.files.length === 1 ? "" : "s"}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => selectAllInRevision(revisionFileIds)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    disabled={loading}
                                  >
                                    Select all in revision
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => clearRevision(revisionFileIds)}
                                    className="rounded-lg border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                    disabled={loading}
                                  >
                                    Clear revision
                                  </button>
                                </div>
                              </div>

                              <div className="mt-4 space-y-4">
                                {group.categories.map((categoryGroup) => {
                                  const categoryFileIds = categoryGroup.files.map(
                                    (file) => file.id
                                  );

                                  return (
                                    <div
                                      key={`${group.revision}-${categoryGroup.category}`}
                                    >
                                      <div className="mb-2 flex items-center justify-between gap-3">
                                        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-gray-500">
                                          {FILE_CATEGORY_LABELS[
                                            categoryGroup.category
                                          ] || "Other"}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                          <button
                                            type="button"
                                            onClick={() =>
                                              selectAllInCategory(categoryFileIds)
                                            }
                                            className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                            disabled={loading}
                                          >
                                            Select category
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              clearCategory(categoryFileIds)
                                            }
                                            className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
                                            disabled={loading}
                                          >
                                            Clear
                                          </button>
                                        </div>
                                      </div>

                                      <div className="space-y-2">
                                        {categoryGroup.files.map((file) => {
                                          const isSelected =
                                            selectedSourceFileIds.includes(file.id);

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
                  onClick={() => closeModal()}
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
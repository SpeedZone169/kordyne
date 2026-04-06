"use client";

import { useMemo, useState } from "react";
import StlPreview from "./StlPreview";
import ApsStepPreview from "./ApsStepPreview";

type PreviewFile = {
  id: string;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  createdAt: string;
  uploaderName: string | null;
  previewUrl: string | null;
  downloadUrl: string | null;
  previewKind: "image" | "pdf" | "cad" | "other";
};

type Props = {
  files: PreviewFile[];
};

const CATEGORY_ORDER = [
  "cad_3d",
  "drawing_2d",
  "image",
  "manufacturing_doc",
  "quality_doc",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  cad_3d: "CAD 3D",
  drawing_2d: "2D Drawings",
  image: "Images",
  manufacturing_doc: "Manufacturing Docs",
  quality_doc: "Quality Docs",
  other: "Other",
};

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCategoryLabel(category: string | null) {
  if (!category) return CATEGORY_LABELS.other;
  return CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
}

function getTypeBadgeLabel(file: PreviewFile) {
  if (file.previewKind === "image") return "Image preview";
  if (file.previewKind === "pdf") return "PDF preview";
  if (file.previewKind === "cad") return "3D/CAD";
  return "Download only";
}

function getTypeBadgeClass(file: PreviewFile) {
  if (file.previewKind === "image") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (file.previewKind === "pdf") {
    return "bg-rose-100 text-rose-700";
  }

  if (file.previewKind === "cad") {
    return "bg-sky-100 text-sky-700";
  }

  return "bg-slate-100 text-slate-700";
}

function buildGroupedFiles(files: PreviewFile[]) {
  const grouped: Record<string, PreviewFile[]> = {
    cad_3d: [],
    drawing_2d: [],
    image: [],
    manufacturing_doc: [],
    quality_doc: [],
    other: [],
  };

  for (const file of files) {
    const category =
      file.assetCategory && CATEGORY_LABELS[file.assetCategory]
        ? file.assetCategory
        : "other";

    grouped[category].push(file);
  }

  return grouped;
}

function getFileExtension(fileName: string) {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export default function PartFilesViewer({ files }: Props) {
  const groupedFiles = useMemo(() => buildGroupedFiles(files), [files]);

  const initialSelected =
    files.find((file) => file.previewKind !== "other") ?? files[0] ?? null;

  const [selectedFileId, setSelectedFileId] = useState<string | null>(
    initialSelected?.id ?? null,
  );

  const selectedFile =
    files.find((file) => file.id === selectedFileId) ?? initialSelected;

  if (!files.length) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-8 text-sm text-slate-600">
        No files available for preview yet.
      </div>
    );
  }

  const selectedExtension = selectedFile ? getFileExtension(selectedFile.fileName) : "";
  const isStlSelected = selectedExtension === "stl";
  const isStepSelected = selectedExtension === "step" || selectedExtension === "stp";

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
        <div className="mb-4 flex items-center justify-between gap-4 px-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">File rail</h3>
            <p className="mt-1 text-sm text-slate-600">
              Select a file to preview in the same page.
            </p>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
            {files.length} file{files.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="space-y-6">
          {CATEGORY_ORDER.map((category) => {
            const categoryFiles = groupedFiles[category];

            if (!categoryFiles || categoryFiles.length === 0) {
              return null;
            }

            return (
              <div key={category}>
                <div className="mb-3 flex items-center justify-between px-2">
                  <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {CATEGORY_LABELS[category]}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {categoryFiles.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {categoryFiles.map((file) => {
                    const isSelected = selectedFile?.id === file.id;
                    const extension = getFileExtension(file.fileName);
                    const isStl = extension === "stl";
                    const isStep = extension === "step" || extension === "stp";

                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedFileId(file.id)}
                        className={`w-full rounded-[22px] border p-4 text-left transition ${
                          isSelected
                            ? "border-slate-900 bg-white shadow-sm"
                            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium text-slate-950">
                              {file.fileName}
                            </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${getTypeBadgeClass(
                                  file,
                                )}`}
                              >
                                {getTypeBadgeLabel(file)}
                              </span>

                              {isStl ? (
                                <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-[11px] font-medium text-sky-700">
                                  Live STL
                                </span>
                              ) : null}

                              {isStep ? (
                                <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-medium text-violet-700">
                                  Live STEP
                                </span>
                              ) : null}

                              <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                                {getCategoryLabel(file.assetCategory)}
                              </span>
                            </div>

                            <div className="mt-3 text-xs text-slate-500">
                              {file.fileType || "unknown"} ·{" "}
                              {formatBytes(file.fileSizeBytes)}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              Uploaded {formatDateTime(file.createdAt)}
                              {file.uploaderName ? ` by ${file.uploaderName}` : ""}
                            </div>
                          </div>

                          <span className="text-xs font-medium text-slate-500">
                            Preview
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        {selectedFile ? (
          <div className="flex h-full flex-col">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xl font-semibold tracking-tight text-slate-950">
                    {selectedFile.fileName}
                  </h3>

                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTypeBadgeClass(
                      selectedFile,
                    )}`}
                  >
                    {getTypeBadgeLabel(selectedFile)}
                  </span>

                  {isStlSelected ? (
                    <span className="inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700">
                      Live STL viewer
                    </span>
                  ) : null}

                  {isStepSelected ? (
                    <span className="inline-flex rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                      Live STEP viewer
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 text-sm text-slate-600">
                  {selectedFile.fileType || "unknown"} ·{" "}
                  {formatBytes(selectedFile.fileSizeBytes)} ·{" "}
                  {getCategoryLabel(selectedFile.assetCategory)}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {selectedFile.previewUrl ? (
                  <a
                    href={selectedFile.previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Open
                  </a>
                ) : null}

                {selectedFile.downloadUrl ? (
                  <a
                    href={selectedFile.downloadUrl}
                    className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Download
                  </a>
                ) : null}
              </div>
            </div>

            <div className="mt-5 mx-auto w-full max-w-[920px]">
              <div className="min-h-[560px] overflow-hidden rounded-[24px] border border-slate-200 bg-slate-50">
                {selectedFile.previewKind === "image" && selectedFile.previewUrl ? (
                  <div className="flex h-full min-h-[560px] items-center justify-center bg-[radial-gradient(circle_at_top,#f8fafc,#eef2f7)] p-6">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedFile.previewUrl}
                      alt={selectedFile.fileName}
                      className="max-h-[520px] w-auto max-w-full rounded-2xl border border-slate-200 bg-white object-contain shadow-sm"
                    />
                  </div>
                ) : null}

                {selectedFile.previewKind === "pdf" && selectedFile.previewUrl ? (
                  <iframe
                    src={selectedFile.previewUrl}
                    title={selectedFile.fileName}
                    className="h-[560px] w-full bg-white"
                  />
                ) : null}

                {selectedFile.previewKind === "cad" &&
                isStlSelected &&
                selectedFile.previewUrl ? (
                  <StlPreview
                    url={selectedFile.previewUrl}
                    fileName={selectedFile.fileName}
                  />
                ) : null}

                {selectedFile.previewKind === "cad" &&
                isStepSelected ? (
                  <ApsStepPreview
                    fileId={selectedFile.id}
                    fileName={selectedFile.fileName}
                  />
                ) : null}

                {selectedFile.previewKind === "cad" &&
                !isStlSelected &&
                !isStepSelected ? (
                  <div className="flex h-full min-h-[560px] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#eff6ff,#f8fafc_55%,#ffffff)] px-8 text-center">
                    <div className="max-w-xl">
                      <span className="inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-sky-700">
                        3D/CAD surface ready
                      </span>

                      <h4 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                        This CAD file type is queued for the next viewer layer
                      </h4>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        The preview area is already in place. STL is now live, and
                        STEP is handled with APS. Additional CAD formats can be added
                        into the same premium panel later.
                      </p>
                    </div>
                  </div>
                ) : null}

                {selectedFile.previewKind === "other" ? (
                  <div className="flex h-full min-h-[560px] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#f8fafc,#ffffff)] px-8 text-center">
                    <div className="max-w-lg">
                      <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        Download-only file
                      </span>

                      <h4 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                        Preview is not available for this file type yet
                      </h4>

                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        This document can still be opened or downloaded securely from
                        the current page. The preview surface is reserved for native
                        image, PDF, and 3D/CAD experiences.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Uploaded
                </div>
                <div className="mt-2 font-medium text-slate-900">
                  {formatDateTime(selectedFile.createdAt)}
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Uploaded by
                </div>
                <div className="mt-2 font-medium text-slate-900">
                  {selectedFile.uploaderName || "-"}
                </div>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs uppercase tracking-[0.14em] text-slate-500">
                  Category
                </div>
                <div className="mt-2 font-medium text-slate-900">
                  {getCategoryLabel(selectedFile.assetCategory)}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
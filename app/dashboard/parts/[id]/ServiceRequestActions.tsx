"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAD_OUTPUT_TYPES,
  MANUFACTURING_TYPES,
  OPTIMIZATION_GOALS,
  SERVICE_REQUEST_PRIORITIES,
  ServiceRequestType,
} from "@/lib/service-requests";

type RequestFileOption = {
  id: string;
  fileName: string;
  assetCategory: string | null;
  fileType: string | null;
};

type Props = {
  partId: string;
  canRequest: boolean;
  availableFiles: RequestFileOption[];
};

type FormState = {
  title: string;
  notes: string;
  priority: string;
  dueDate: string;
  quantity: string;
  targetProcess: string;
  targetMaterial: string;
  manufacturingType: string;
  cadOutputType: string;
  optimizationGoal: string;
  selectedPartFileIds: string[];
};

const initialFormState: FormState = {
  title: "",
  notes: "",
  priority: "normal",
  dueDate: "",
  quantity: "",
  targetProcess: "",
  targetMaterial: "",
  manufacturingType: "prototype_3d_print",
  cadOutputType: "3d",
  optimizationGoal: "general",
  selectedPartFileIds: [],
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

function ActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      {label}
    </button>
  );
}

function prettyLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupAvailableFiles(files: RequestFileOption[]) {
  const grouped: Record<string, RequestFileOption[]> = {
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

export default function ServiceRequestActions({
  partId,
  canRequest,
  availableFiles,
}: Props) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ServiceRequestType | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedFiles = useMemo(
    () => groupAvailableFiles(availableFiles),
    [availableFiles]
  );

  const modalTitle = useMemo(() => {
    switch (activeType) {
      case "manufacture_part":
        return "Manufacture this part";
      case "cad_creation":
        return "Request CAD creation";
      case "optimization":
        return "Request optimization";
      default:
        return "";
    }
  }, [activeType]);

  function openRequest(type: ServiceRequestType) {
    setError(null);
    setForm(initialFormState);
    setActiveType(type);
  }

  function closeModal() {
    if (submitting) return;
    setActiveType(null);
    setError(null);
  }

  function toggleFile(fileId: string) {
    setForm((prev) => {
      const isSelected = prev.selectedPartFileIds.includes(fileId);

      return {
        ...prev,
        selectedPartFileIds: isSelected
          ? prev.selectedPartFileIds.filter((id) => id !== fileId)
          : [...prev.selectedPartFileIds, fileId],
      };
    });
  }

  function selectAllInCategory(fileIds: string[]) {
    setForm((prev) => ({
      ...prev,
      selectedPartFileIds: Array.from(
        new Set([...prev.selectedPartFileIds, ...fileIds])
      ),
    }));
  }

  function clearCategory(fileIds: string[]) {
    setForm((prev) => ({
      ...prev,
      selectedPartFileIds: prev.selectedPartFileIds.filter(
        (id) => !fileIds.includes(id)
      ),
    }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeType) return;

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        partId,
        requestType: activeType,
        title: form.title.trim() || undefined,
        notes: form.notes.trim() || undefined,
        priority: form.priority,
        dueDate: form.dueDate || null,
        quantity: form.quantity ? Number(form.quantity) : null,
        targetProcess: form.targetProcess.trim() || null,
        targetMaterial: form.targetMaterial.trim() || null,
        manufacturingType:
          activeType === "manufacture_part" ? form.manufacturingType : null,
        cadOutputType: activeType === "cad_creation" ? form.cadOutputType : null,
        optimizationGoal:
          activeType === "optimization" ? form.optimizationGoal : null,
        sourceReferenceType: "existing_part_files",
        selectedPartFileIds: form.selectedPartFileIds,
      };

      const res = await fetch("/api/service-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create request.");
      }

      setActiveType(null);
      setForm(initialFormState);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canRequest) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Create request</h3>
        <p className="mt-2 text-sm text-gray-600">
          You have read-only access for this part and cannot submit service requests.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900">Create request</h3>
        <p className="mt-2 text-sm text-gray-600">
          Start a manufacturing or engineering workflow for this part.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <ActionButton
            label="Manufacture this part"
            onClick={() => openRequest("manufacture_part")}
          />
          <ActionButton
            label="Request CAD creation"
            onClick={() => openRequest("cad_creation")}
          />
          <ActionButton
            label="Request optimization"
            onClick={() => openRequest("optimization")}
          />
        </div>

        <div className="mt-4 text-xs text-gray-500">
          Requests are tracked separately from the part file library.
        </div>
      </section>

      {activeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {modalTitle}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Choose the files relevant to this request. You can add or remove files later before sharing the request externally.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Title
                  </span>
                  <input
                    value={form.title}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                    placeholder="Optional request title"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Priority
                  </span>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, priority: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {SERVICE_REQUEST_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {prettyLabel(priority)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">
                    Due date
                  </span>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  />
                </label>
              </div>

              {activeType === "manufacture_part" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Manufacturing type
                    </span>
                    <select
                      value={form.manufacturingType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          manufacturingType: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    >
                      {MANUFACTURING_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {prettyLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, quantity: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Target process
                    </span>
                    <input
                      value={form.targetProcess}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetProcess: e.target.value,
                        }))
                      }
                      placeholder="Example: SLS, FDM, 5-axis CNC"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Target material
                    </span>
                    <input
                      value={form.targetMaterial}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetMaterial: e.target.value,
                        }))
                      }
                      placeholder="Example: Nylon PA12, Aluminium 6061, carbon fibre composite"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                </div>
              )}

              {activeType === "cad_creation" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Output needed
                    </span>
                    <select
                      value={form.cadOutputType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          cadOutputType: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    >
                      {CAD_OUTPUT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {activeType === "optimization" && (
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Optimization goal
                    </span>
                    <select
                      value={form.optimizationGoal}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          optimizationGoal: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    >
                      {OPTIMIZATION_GOALS.map((goal) => (
                        <option key={goal} value={goal}>
                          {prettyLabel(goal)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Quantity
                    </span>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={form.quantity}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, quantity: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Target process
                    </span>
                    <input
                      value={form.targetProcess}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetProcess: e.target.value,
                        }))
                      }
                      placeholder="Optional process context"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">
                      Target material
                    </span>
                    <input
                      value={form.targetMaterial}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          targetMaterial: e.target.value,
                        }))
                      }
                      placeholder="Optional material context"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      Select part files for this request
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Choose only the files relevant to this request. Nothing is selected automatically.
                    </p>
                  </div>
                  <div className="text-xs text-slate-500">
                    {form.selectedPartFileIds.length} selected
                  </div>
                </div>

                {availableFiles.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    No files are attached to this part yet.
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
                          className="rounded-xl border border-slate-200 p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                {FILE_CATEGORY_LABELS[category]}
                              </div>
                              <div className="text-xs text-slate-500">
                                {categoryFiles.length} file
                                {categoryFiles.length === 1 ? "" : "s"}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => selectAllInCategory(categoryFileIds)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => clearCategory(categoryFileIds)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {categoryFiles.map((file) => {
                              const isSelected = form.selectedPartFileIds.includes(
                                file.id
                              );

                              return (
                                <label
                                  key={file.id}
                                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleFile(file.id)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300"
                                  />

                                  <div className="min-w-0">
                                    <div className="text-sm font-medium text-slate-900">
                                      {file.fileName}
                                    </div>
                                    <div className="text-xs text-slate-500">
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

              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">
                  Notes
                </span>
                <textarea
                  value={form.notes}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={5}
                  placeholder="Add technical context, target use case, constraints, or delivery requirements."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Submit request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
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
  defaultType?: ServiceRequestType | null;
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

const REQUEST_TYPE_CARDS: Array<{
  type: ServiceRequestType;
  title: string;
  description: string;
}> = [
  {
    type: "manufacture_part",
    title: "Manufacture this part",
    description:
      "Create a manufacturing request tied to this exact revision and controlled vault file context.",
  },
  {
    type: "cad_creation",
    title: "Request CAD creation",
    description:
      "Start a CAD workflow from this revision using only files already controlled in the vault.",
  },
  {
    type: "optimization",
    title: "Request optimization",
    description:
      "Create an optimization request linked to this revision, process context, and selected vault files.",
  },
];

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

function RequestTypeCard({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 p-5">
      <div>
        <div className="text-lg font-semibold text-slate-900">{title}</div>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Open request
        </button>
      </div>
    </div>
  );
}

export default function ServiceRequestActions({
  partId,
  canRequest,
  availableFiles,
  defaultType = null,
}: Props) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ServiceRequestType | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);
  const [hasAppliedDefaultType, setHasAppliedDefaultType] = useState(false);

  const groupedFiles = useMemo(
    () => groupAvailableFiles(availableFiles),
    [availableFiles]
  );

  useEffect(() => {
    if (defaultType && !hasAppliedDefaultType) {
      setError(null);
      setCreatedRequestId(null);
      setForm(initialFormState);
      setActiveType(defaultType);
      setHasAppliedDefaultType(true);
    }
  }, [defaultType, hasAppliedDefaultType]);

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
    setCreatedRequestId(null);
    setForm(initialFormState);
    setActiveType(type);
  }

  function closeModal() {
    if (submitting) return;
    setActiveType(null);
    setError(null);
    setCreatedRequestId(null);
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
    setCreatedRequestId(null);

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
        requestMeta: {
          hasVaultAttachments: form.selectedPartFileIds.length > 0,
          hasUploadedAttachments: false,
          uploadedAttachmentCount: 0,
        },
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

      setCreatedRequestId(data.id);
      setActiveType(null);
      setForm(initialFormState);
      router.push(`/dashboard/requests/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create request.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canRequest) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Vault request actions</h3>
        <p className="mt-2 text-sm text-slate-600">
          You have read-only access for this part and cannot submit service
          requests.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
              Vault request actions
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Launch a workflow from this selected revision. Vault requests only
              use files already stored on the part revision.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
            {availableFiles.length} vault file
            {availableFiles.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Manual request uploads are not available in the vault flow. To start
          from uploaded files instead, use the standalone request path.
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-3">
          {REQUEST_TYPE_CARDS.map((card) => (
            <RequestTypeCard
              key={card.type}
              title={card.title}
              description={card.description}
              onClick={() => openRequest(card.type)}
            />
          ))}
        </div>
      </section>

      {activeType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {modalTitle}
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                    Complete the request scope and choose which existing vault
                    files should be attached to this request.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 px-6 py-6">
              <section className="rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Request scope
                </h4>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Title
                    </span>
                    <input
                      value={form.title}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, title: e.target.value }))
                      }
                      placeholder="Optional request title"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Priority
                    </span>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, priority: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    >
                      {SERVICE_REQUEST_PRIORITIES.map((priority) => (
                        <option key={priority} value={priority}>
                          {prettyLabel(priority)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Due date
                    </span>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    />
                  </label>
                </div>

                {activeType === "manufacture_part" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      >
                        {MANUFACTURING_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {prettyLabel(type)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  </div>
                )}

                {activeType === "cad_creation" && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
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
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      >
                        {OPTIMIZATION_GOALS.map((goal) => (
                          <option key={goal} value={goal}>
                            {prettyLabel(goal)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">
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
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                      />
                    </label>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Vault attachments
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Choose only the existing files relevant to this request.
                      Nothing is selected automatically.
                    </p>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {form.selectedPartFileIds.length} selected
                  </div>
                </div>

                {availableFiles.length === 0 ? (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                    No files are attached to this part yet.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {FILE_CATEGORY_ORDER.map((category) => {
                      const categoryFiles = groupedFiles[category];

                      if (!categoryFiles || categoryFiles.length === 0) {
                        return null;
                      }

                      const categoryFileIds = categoryFiles.map((file) => file.id);

                      return (
                        <div
                          key={category}
                          className="rounded-2xl border border-slate-200 p-4"
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
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                onClick={() => clearCategory(categoryFileIds)}
                                className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
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
                                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 transition hover:bg-slate-50"
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
                                    <div className="mt-1 text-xs text-slate-500">
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
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Technical notes
                </h4>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Notes
                  </span>
                  <textarea
                    value={form.notes}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, notes: e.target.value }))
                    }
                    rows={6}
                    placeholder="Add technical context, target use case, constraints, approval notes, or delivery requirements."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </label>
              </section>

              {error ? (
                <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <div>{error}</div>

                  {createdRequestId ? (
                    <a
                      href={`/dashboard/requests/${createdRequestId}`}
                      className="inline-flex rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Open created request
                    </a>
                  ) : null}
                </div>
              ) : null}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
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
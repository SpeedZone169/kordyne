"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAD_OUTPUT_TYPES,
  MANUFACTURING_TYPES,
  OPTIMIZATION_GOALS,
  SERVICE_REQUEST_PRIORITIES,
  ServiceRequestType,
} from "@/lib/service-requests";

type Props = {
  organizationId: string;
  canRequest: boolean;
};

type LocalUploadItem = {
  id: string;
  file: File;
  assetCategory: string;
};

type FormState = {
  title: string;
  requestedItemName: string;
  requestedItemReference: string;
  notes: string;
  priority: string;
  dueDate: string;
  quantity: string;
  targetProcess: string;
  targetMaterial: string;
  manufacturingType: string;
  cadOutputType: string;
  optimizationGoal: string;
};

const initialFormState: FormState = {
  title: "",
  requestedItemName: "",
  requestedItemReference: "",
  notes: "",
  priority: "normal",
  dueDate: "",
  quantity: "",
  targetProcess: "",
  targetMaterial: "",
  manufacturingType: "prototype_3d_print",
  cadOutputType: "3d",
  optimizationGoal: "general",
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
    title: "Standalone manufacture",
    description:
      "Start from request uploads and scope details first, then link or convert into the vault.",
  },
  {
    type: "cad_creation",
    title: "Standalone CAD request",
    description:
      "Create a CAD request before the item exists in the vault and attach supporting files immediately.",
  },
  {
    type: "optimization",
    title: "Standalone optimization",
    description:
      "Create an optimization request first, then connect it to an existing or newly created vault part.",
  },
];

function prettyLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(bytes: number) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export default function StandaloneRequestActions({
  organizationId,
  canRequest,
}: Props) {
  const router = useRouter();
  const [activeType, setActiveType] = useState<ServiceRequestType | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [localUploads, setLocalUploads] = useState<LocalUploadItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdRequestId, setCreatedRequestId] = useState<string | null>(null);

  const modalTitle = useMemo(() => {
    switch (activeType) {
      case "manufacture_part":
        return "Start standalone manufacture request";
      case "cad_creation":
        return "Start standalone CAD request";
      case "optimization":
        return "Start standalone optimization request";
      default:
        return "";
    }
  }, [activeType]);

  function openRequest(type: ServiceRequestType) {
    setError(null);
    setCreatedRequestId(null);
    setForm(initialFormState);
    setLocalUploads([]);
    setActiveType(type);
  }

  function closeModal() {
    if (submitting) return;
    setActiveType(null);
    setError(null);
    setCreatedRequestId(null);
  }

  function addLocalFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const nextItems = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      file,
      assetCategory: "other",
    }));

    setLocalUploads((prev) => [...prev, ...nextItems]);
  }

  function updateLocalUploadCategory(id: string, assetCategory: string) {
    setLocalUploads((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, assetCategory } : item
      )
    );
  }

  function removeLocalUpload(id: string) {
    setLocalUploads((prev) => prev.filter((item) => item.id !== id));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activeType) return;

    if (!form.requestedItemName.trim()) {
      setError("Requested item name is required.");
      return;
    }

    if (localUploads.length === 0) {
      setError(
        "Add at least one file from your computer to start a standalone request."
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setCreatedRequestId(null);

    let requestId: string | null = null;

    try {
      const requestMeta = {
        hasVaultAttachments: false,
        hasUploadedAttachments: true,
        uploadedAttachmentCount: localUploads.length,
      };

      const createRes = await fetch("/api/service-requests/standalone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          requestType: activeType,
          title: form.title.trim() || undefined,
          requestedItemName: form.requestedItemName.trim(),
          requestedItemReference: form.requestedItemReference.trim() || undefined,
          notes: form.notes.trim() || undefined,
          priority: form.priority,
          dueDate: form.dueDate || null,
          quantity: form.quantity ? Number(form.quantity) : null,
          targetProcess: form.targetProcess.trim() || null,
          targetMaterial: form.targetMaterial.trim() || null,
          manufacturingType:
            activeType === "manufacture_part" ? form.manufacturingType : null,
          cadOutputType:
            activeType === "cad_creation" ? form.cadOutputType : null,
          optimizationGoal:
            activeType === "optimization" ? form.optimizationGoal : null,
          requestMeta,
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok) {
        throw new Error(createData?.error || "Failed to create standalone request.");
      }

      requestId = createData.id;
      setCreatedRequestId(requestId);

      const formData = new FormData();

      localUploads.forEach((item) => {
        formData.append("files", item.file);
      });

      formData.append(
        "assetCategories",
        JSON.stringify(localUploads.map((item) => item.assetCategory))
      );

      const uploadRes = await fetch(
        `/api/service-requests/${requestId}/uploaded-files`,
        {
          method: "POST",
          body: formData,
        }
      );

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok) {
        throw new Error(
          uploadData?.error ||
            "The request draft was created, but file uploads failed."
        );
      }

      const submitRes = await fetch(`/api/service-requests/${requestId}/submit`, {
        method: "POST",
      });

      const submitData = await submitRes.json();

      if (!submitRes.ok) {
        throw new Error(
          submitData?.error ||
            "The standalone request was created, but submission failed."
        );
      }

      setActiveType(null);
      setForm(initialFormState);
      setLocalUploads([]);
      router.push(`/dashboard/requests/${requestId}`);
      router.refresh();
    } catch (err) {
      if (requestId) {
        setError(
          err instanceof Error
            ? `${err.message} You can open the created request and continue from there.`
            : "The standalone request was created, but the full flow did not complete."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to create standalone request."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!canRequest) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">
          Start standalone request
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          You have read-only access and cannot create standalone requests.
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h3 className="text-2xl font-semibold tracking-tight text-slate-900">
            Start standalone request
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Start outside the vault when the part is not structured yet. Upload
            files first, define the request, then later link it to an existing
            vault revision or create a new vault part from the request.
          </p>
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
                    This request starts outside the vault. Upload your files
                    first, define the work, and then link or convert the request
                    into the vault afterward.
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
                  Request identity
                </h4>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Requested item name
                    </span>
                    <input
                      value={form.requestedItemName}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          requestedItemName: e.target.value,
                        }))
                      }
                      placeholder="Example: Test fixture bracket"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Requested item reference
                    </span>
                    <input
                      value={form.requestedItemReference}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          requestedItemReference: e.target.value,
                        }))
                      }
                      placeholder="Example: RFQ-247 / Customer ref / Legacy item"
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                    />
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Request title
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
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 p-5">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Request scope
                </h4>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                      Request uploads
                    </h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Add files from your computer. Standalone requests require
                      uploaded files before submission.
                    </p>
                  </div>

                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {localUploads.length} uploaded file
                    {localUploads.length === 1 ? "" : "s"}
                  </div>
                </div>

                <div className="mt-4">
                  <label className="inline-flex cursor-pointer rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
                    Add files from computer
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addLocalFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>

                {localUploads.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    {localUploads.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900">
                            {item.file.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                            <span>{item.file.type || "unknown type"}</span>
                            <span>{formatBytes(item.file.size)}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <select
                            value={item.assetCategory}
                            onChange={(e) =>
                              updateLocalUploadCategory(item.id, e.target.value)
                            }
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                          >
                            {FILE_CATEGORY_ORDER.map((category) => (
                              <option key={category} value={category}>
                                {FILE_CATEGORY_LABELS[category]}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => removeLocalUpload(item.id)}
                            className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                    No request uploads added yet.
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
                    <Link
                      href={`/dashboard/requests/${createdRequestId}`}
                      className="inline-flex rounded-xl border border-red-300 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    >
                      Open created request
                    </Link>
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
                  {submitting ? "Creating..." : "Create standalone request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
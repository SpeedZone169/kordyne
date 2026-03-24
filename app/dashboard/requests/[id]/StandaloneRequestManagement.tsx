"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PartOption = {
  id: string;
  name: string;
  partNumber: string | null;
  revision: string | null;
};

type Props = {
  requestId: string;
  status: string;
  canManage: boolean;
  isLinkedToPart: boolean;
  requestedItemName: string | null;
  requestedItemReference: string | null;
  initialPartName: string;
  partOptions: PartOption[];
};

const OPEN_STATUSES = ["draft", "submitted", "in_review", "awaiting_customer"];

export default function StandaloneRequestManagement({
  requestId,
  status,
  canManage,
  isLinkedToPart,
  requestedItemName,
  requestedItemReference,
  initialPartName,
  partOptions,
}: Props) {
  const router = useRouter();

  const [submittingDraft, setSubmittingDraft] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedPartId, setSelectedPartId] = useState("");
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const [creatingPart, setCreatingPart] = useState(false);
  const [createPartError, setCreatePartError] = useState<string | null>(null);
  const [partName, setPartName] = useState(
    requestedItemName?.trim() || initialPartName || ""
  );
  const [partNumber, setPartNumber] = useState(
    requestedItemReference?.trim() || ""
  );
  const [description, setDescription] = useState("");
  const [processType, setProcessType] = useState("");
  const [material, setMaterial] = useState("");
  const [category, setCategory] = useState("");
  const [partStatus, setPartStatus] = useState("draft");
  const [revisionScheme, setRevisionScheme] = useState("alphabetic");

  const canEdit = canManage && OPEN_STATUSES.includes(status);
  const isDraft = status === "draft";

  async function handleSubmitDraft() {
    setSubmittingDraft(true);
    setSubmitError(null);

    try {
      const res = await fetch(`/api/service-requests/${requestId}/submit`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit request.");
      }

      router.refresh();
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to submit request."
      );
    } finally {
      setSubmittingDraft(false);
    }
  }

  async function handleLinkToPart() {
    if (!selectedPartId) {
      setLinkError("Choose a vault revision first.");
      return;
    }

    setLinking(true);
    setLinkError(null);

    try {
      const res = await fetch(`/api/service-requests/${requestId}/link-to-part`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partId: selectedPartId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to link request to vault revision.");
      }

      router.refresh();
    } catch (err) {
      setLinkError(
        err instanceof Error
          ? err.message
          : "Failed to link request to vault revision."
      );
    } finally {
      setLinking(false);
    }
  }

  async function handleCreatePart() {
    if (!partName.trim()) {
      setCreatePartError("Part name is required.");
      return;
    }

    setCreatingPart(true);
    setCreatePartError(null);

    try {
      const res = await fetch(`/api/service-requests/${requestId}/create-part`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: partName.trim(),
          partNumber: partNumber.trim() || null,
          description: description.trim() || null,
          processType: processType.trim() || null,
          material: material.trim() || null,
          category: category.trim() || null,
          status: partStatus,
          revisionScheme,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to create a new vault part from this request."
        );
      }

      router.refresh();
    } catch (err) {
      setCreatePartError(
        err instanceof Error
          ? err.message
          : "Failed to create a new vault part from this request."
      );
    } finally {
      setCreatingPart(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Standalone request management
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This request started outside the vault. You can submit the draft,
          link it to an existing vault revision, or create a brand-new part from
          the request.
        </p>
      </div>

      {isLinkedToPart ? (
        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          This standalone request is already linked to a vault revision. You can
          now save request uploads into the vault where appropriate.
        </div>
      ) : null}

      {!canEdit ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          This request can no longer be structurally changed from this workspace.
        </div>
      ) : (
        <div className="mt-5 space-y-6">
          {isDraft ? (
            <div className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Draft request
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    Submit the request once the uploads and scope are complete.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitDraft}
                  disabled={submittingDraft}
                  className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {submittingDraft ? "Submitting..." : "Submit request"}
                </button>
              </div>

              {submitError ? (
                <div className="mt-3 text-sm text-red-600">{submitError}</div>
              ) : null}
            </div>
          ) : null}

          {!isLinkedToPart ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Link to existing vault revision
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Connect this request to an existing revision already managed in
                  your vault.
                </p>

                <div className="mt-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Select vault revision
                  </label>
                  <select
                    value={selectedPartId}
                    onChange={(e) => setSelectedPartId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                  >
                    <option value="">Choose a part revision</option>
                    {partOptions.map((part) => (
                      <option key={part.id} value={part.id}>
                        {part.name}
                        {part.partNumber ? ` · ${part.partNumber}` : ""}
                        {part.revision ? ` · Rev ${part.revision}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {linkError ? (
                  <div className="mt-3 text-sm text-red-600">{linkError}</div>
                ) : null}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleLinkToPart}
                    disabled={linking}
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {linking ? "Linking..." : "Link to vault revision"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Create new vault part from request
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create a brand-new part family and first revision from this
                  request, then save selected request uploads into the vault.
                </p>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Part name
                    </span>
                    <input
                      value={partName}
                      onChange={(e) => setPartName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Part number
                    </span>
                    <input
                      value={partNumber}
                      onChange={(e) => setPartNumber(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Revision scheme
                    </span>
                    <select
                      value={revisionScheme}
                      onChange={(e) => setRevisionScheme(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    >
                      <option value="alphabetic">Alphabetic</option>
                      <option value="numeric">Numeric</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Process type
                    </span>
                    <input
                      value={processType}
                      onChange={(e) => setProcessType(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Material
                    </span>
                    <input
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Category
                    </span>
                    <input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Part status
                    </span>
                    <select
                      value={partStatus}
                      onChange={(e) => setPartStatus(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="archived">Archived</option>
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Description
                    </span>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </label>
                </div>

                {createPartError ? (
                  <div className="mt-3 text-sm text-red-600">
                    {createPartError}
                  </div>
                ) : null}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleCreatePart}
                    disabled={creatingPart}
                    className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
                  >
                    {creatingPart ? "Creating..." : "Create new vault part"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {isLinkedToPart ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              The request is now linked into the vault. You can open the linked
              part from the request details above and save request uploads into
              the vault where needed.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
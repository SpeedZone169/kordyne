"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  StlAnnotationCamera,
  StlAnnotationDraft,
  StlViewerAnnotation,
  VectorPoint,
} from "./StlPreview";

export type ReviewMemberOption = {
  userId: string;
  name: string;
  email: string | null;
  role: string;
};

export type ReviewAnnotationMessage = {
  id: string;
  annotationId: string;
  body: string;
  createdAt: string;
  creatorUserId: string;
  creatorName: string;
  creatorEmail: string | null;
  creatorAvatarUrl: string | null;
};

export type ReviewAnnotation = {
  id: string;
  partId: string;
  partFileId: string;
  fileName: string;
  title: string;
  status: "open" | "in_review" | "resolved" | "reopened";
  severity: "info" | "question" | "issue" | "critical";
  category:
    | "design"
    | "manufacturability"
    | "quality"
    | "supplier_question"
    | "internal_note"
    | "other";
  visibility: "internal" | "shared";
  position: VectorPoint;
  normal: VectorPoint | null;
  camera: StlAnnotationCamera | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  creatorUserId: string;
  creatorName: string;
  creatorEmail: string | null;
  creatorAvatarUrl: string | null;
  assignedToUserId: string | null;
  assigneeName: string | null;
  messages: ReviewAnnotationMessage[];
};

type Props = {
  partId: string;
  revisionLabel: string | null;
  latestRevisionLabel: string | null;
  isLatestRevision: boolean;
  annotations: ReviewAnnotation[];
  pendingAnnotation: StlAnnotationDraft | null;
  selectedAnnotationId: string | null;
  memberOptions: ReviewMemberOption[];
  canComment: boolean;
  canManageReview: boolean;
  onCancelPendingAnnotation: () => void;
  onSelectAnnotation: (annotation: ReviewAnnotation) => void;
  onFocusAnnotation: (annotation: ReviewAnnotation) => void;
};

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "reopened", label: "Reopened" },
] as const;

const SEVERITY_OPTIONS = [
  { value: "info", label: "Info" },
  { value: "question", label: "Question" },
  { value: "issue", label: "Issue" },
  { value: "critical", label: "Critical" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "design", label: "Design" },
  { value: "manufacturability", label: "Manufacturability" },
  { value: "quality", label: "Quality" },
  { value: "supplier_question", label: "Supplier question" },
  { value: "internal_note", label: "Internal note" },
  { value: "other", label: "Other" },
] as const;

function formatDateTime(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: ReviewAnnotation["status"]) {
  return STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}

function getCategoryLabel(category: ReviewAnnotation["category"]) {
  return (
    CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category
  );
}

function getStatusClass(status: ReviewAnnotation["status"]) {
  switch (status) {
    case "resolved":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "in_review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "reopened":
      return "border-amber-200 bg-amber-50 text-amber-800";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function getSeverityClass(severity: ReviewAnnotation["severity"]) {
  switch (severity) {
    case "critical":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "issue":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "question":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim().slice(0, 1))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function latestMessagePreview(annotation: ReviewAnnotation) {
  const latestMessage = annotation.messages[annotation.messages.length - 1];
  return latestMessage?.body || "No message yet.";
}

function pointLabel(point: VectorPoint) {
  return `X ${point.x.toFixed(2)}, Y ${point.y.toFixed(2)}, Z ${point.z.toFixed(
    2,
  )}`;
}

export function toViewerAnnotation(
  annotation: ReviewAnnotation,
): StlViewerAnnotation {
  return {
    id: annotation.id,
    fileId: annotation.partFileId,
    fileName: annotation.fileName,
    title: annotation.title,
    status: annotation.status,
    severity: annotation.severity,
    category: annotation.category,
    position: annotation.position,
    normal: annotation.normal,
    camera: annotation.camera,
    creatorName: annotation.creatorName,
    assigneeName: annotation.assigneeName,
    createdAt: annotation.createdAt,
    latestMessagePreview: latestMessagePreview(annotation),
  };
}

export default function PartReviewAnnotationsPanel({
  partId,
  revisionLabel,
  latestRevisionLabel,
  isLatestRevision,
  annotations,
  pendingAnnotation,
  selectedAnnotationId,
  memberOptions,
  canComment,
  canManageReview,
  onCancelPendingAnnotation,
  onSelectAnnotation,
  onFocusAnnotation,
}: Props) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<"open" | "resolved" | "all">(
    "open",
  );
  const [severityFilter, setSeverityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [title, setTitle] = useState("");
  const [messageBody, setMessageBody] = useState("");
  const [severity, setSeverity] =
    useState<ReviewAnnotation["severity"]>("question");
  const [category, setCategory] =
    useState<ReviewAnnotation["category"]>("design");
  const [visibility, setVisibility] =
    useState<ReviewAnnotation["visibility"]>("internal");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedAnnotation = useMemo(
    () =>
      annotations.find((annotation) => annotation.id === selectedAnnotationId) ??
      annotations.find((annotation) => annotation.status !== "resolved") ??
      annotations[0] ??
      null,
    [annotations, selectedAnnotationId],
  );

  const filteredAnnotations = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return annotations.filter((annotation) => {
      if (statusFilter === "open" && annotation.status === "resolved") {
        return false;
      }

      if (statusFilter === "resolved" && annotation.status !== "resolved") {
        return false;
      }

      if (severityFilter !== "all" && annotation.severity !== severityFilter) {
        return false;
      }

      if (categoryFilter !== "all" && annotation.category !== categoryFilter) {
        return false;
      }

      if (!normalizedSearch) return true;

      const haystack = [
        annotation.title,
        annotation.creatorName,
        annotation.assigneeName,
        annotation.fileName,
        ...annotation.messages.map((message) => message.body),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [annotations, categoryFilter, searchQuery, severityFilter, statusFilter]);

  const openCount = annotations.filter(
    (annotation) => annotation.status !== "resolved",
  ).length;
  const resolvedCount = annotations.length - openCount;

  async function handleCreateAnnotation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingAnnotation || isSubmitting) return;

    const trimmedTitle = title.trim();
    const trimmedMessage = messageBody.trim();

    if (!trimmedTitle || !trimmedMessage) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/part-review-annotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partId,
          partFileId: pendingAnnotation.fileId,
          title: trimmedTitle,
          messageBody: trimmedMessage,
          severity,
          category,
          visibility,
          assignedTo: assignedTo || null,
          dueDate: dueDate || null,
          target: pendingAnnotation,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to create annotation.");
      }

      setTitle("");
      setMessageBody("");
      setSeverity("question");
      setCategory("design");
      setVisibility("internal");
      setAssignedTo("");
      setDueDate("");
      onCancelPendingAnnotation();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create annotation.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function patchAnnotation(
    annotation: ReviewAnnotation,
    updates: Record<string, unknown>,
  ) {
    if (isUpdating) return;
    setIsUpdating(true);
    setError(null);

    try {
      const response = await fetch(`/api/part-review-annotations/${annotation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to update annotation.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update annotation.");
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleReply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedAnnotation || !replyBody.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/part-review-annotations/${selectedAnnotation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: replyBody.trim() }),
        },
      );
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Failed to add reply.");
      }
      setReplyBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add reply.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <aside className="rounded-[14px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              Part Review Annotations
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Revision {revisionLabel || "-"} mesh pins, decisions, issues, and
              threaded review context.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <span className="rounded-full bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-700">
              {openCount} open
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
              {resolvedCount} resolved
            </span>
          </div>
        </div>

        {!isLatestRevision ? (
          <div className="mt-3 rounded-[10px] border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
            These annotations belong to revision {revisionLabel || "-"}. Newer
            revision {latestRevisionLabel || "-"} exists, so coordinates are not
            automatically moved forward.
          </div>
        ) : null}
      </div>

      <div className="space-y-4 p-5">
        {pendingAnnotation ? (
          <form
            onSubmit={handleCreateAnnotation}
            className="rounded-[14px] border border-cyan-200 bg-cyan-50/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-800">
                  New model annotation
                </p>
                <p className="mt-1 text-xs text-cyan-900/75">
                  {pendingAnnotation.fileName} - {pointLabel(pendingAnnotation.position)}
                </p>
              </div>
              <button
                type="button"
                onClick={onCancelPendingAnnotation}
                className="rounded-full border border-cyan-200 bg-white px-3 py-1.5 text-xs font-bold text-cyan-800 transition hover:bg-cyan-50"
              >
                Cancel
              </button>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
                placeholder="e.g. Confirm wall thickness near boss"
                className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
              />
            </label>

            <label className="mt-3 block">
              <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                First message
              </span>
              <textarea
                value={messageBody}
                onChange={(event) => setMessageBody(event.target.value)}
                rows={4}
                maxLength={4000}
                placeholder="Add the review question, decision, or issue."
                className="mt-1 w-full resize-none rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
              />
            </label>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  Severity
                </span>
                <select
                  value={severity}
                  onChange={(event) =>
                    setSeverity(event.target.value as ReviewAnnotation["severity"])
                  }
                  className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {SEVERITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  Category
                </span>
                <select
                  value={category}
                  onChange={(event) =>
                    setCategory(event.target.value as ReviewAnnotation["category"])
                  }
                  className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  Assignee
                </span>
                <select
                  value={assignedTo}
                  onChange={(event) => setAssignedTo(event.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {memberOptions.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.name} - {member.role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  Due date
                </span>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-1 w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                <span>Visibility</span>
                <select
                  value={visibility}
                  onChange={(event) =>
                    setVisibility(event.target.value as ReviewAnnotation["visibility"])
                  }
                  className="rounded-[10px] border border-slate-200 bg-white px-2 py-1 text-xs"
                >
                  <option value="internal">Internal</option>
                  <option value="shared">Shared</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={!canComment || isSubmitting || !title.trim() || !messageBody.trim()}
                className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Saving..." : "Save annotation"}
              </button>
            </div>
          </form>
        ) : null}

        {error ? (
          <div className="rounded-[10px] border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="sr-only">Search annotations</span>
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search title, message, assignee, or file..."
              className="w-full rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-cyan-400"
            />
          </label>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "open" | "resolved" | "all")
            }
            className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="open">Open / in review</option>
            <option value="resolved">Resolved</option>
            <option value="all">All statuses</option>
          </select>
          <select
            value={severityFilter}
            onChange={(event) => setSeverityFilter(event.target.value)}
            className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All severities</option>
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2"
          >
            <option value="all">All categories</option>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
          {filteredAnnotations.length > 0 ? (
            filteredAnnotations.map((annotation, index) => {
              const isSelected = selectedAnnotation?.id === annotation.id;

              return (
                <button
                  key={annotation.id}
                  type="button"
                  onClick={() => {
                    onSelectAnnotation(annotation);
                    onFocusAnnotation(annotation);
                  }}
                  className={`w-full rounded-[12px] border p-3 text-left transition ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-50/70"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  } ${annotation.status === "resolved" ? "opacity-75" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-slate-950 px-2 py-0.5 text-[10px] font-black text-white">
                          {index + 1}
                        </span>
                        <span className="truncate text-sm font-black text-slate-950">
                          {annotation.title}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {annotation.fileName} - {pointLabel(annotation.position)}
                      </p>
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
                        {latestMessagePreview(annotation)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getStatusClass(
                          annotation.status,
                        )}`}
                      >
                        {getStatusLabel(annotation.status)}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${getSeverityClass(
                          annotation.severity,
                        )}`}
                      >
                        {annotation.severity}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              No annotations match this view. Use Add annotation in the STL viewer
              to place the first review marker.
            </div>
          )}
        </div>

        {selectedAnnotation ? (
          <section className="rounded-[14px] border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-black text-slate-950">
                    {selectedAnnotation.title}
                  </h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {selectedAnnotation.fileName} - created by{" "}
                    {selectedAnnotation.creatorName} on{" "}
                    {formatDateTime(selectedAnnotation.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onFocusAnnotation(selectedAnnotation)}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-black text-slate-800 transition hover:bg-slate-50"
                >
                  Focus
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${getStatusClass(
                    selectedAnnotation.status,
                  )}`}
                >
                  {getStatusLabel(selectedAnnotation.status)}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-black ${getSeverityClass(
                    selectedAnnotation.severity,
                  )}`}
                >
                  {selectedAnnotation.severity}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                  {getCategoryLabel(selectedAnnotation.category)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-700">
                  {selectedAnnotation.assigneeName || "Unassigned"}
                </span>
              </div>

              {canManageReview ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select
                    value={selectedAnnotation.severity}
                    onChange={(event) =>
                      patchAnnotation(selectedAnnotation, {
                        severity: event.target.value,
                      })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                  >
                    {SEVERITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedAnnotation.category}
                    onChange={(event) =>
                      patchAnnotation(selectedAnnotation, {
                        category: event.target.value,
                      })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedAnnotation.assignedToUserId ?? ""}
                    onChange={(event) =>
                      patchAnnotation(selectedAnnotation, {
                        assignedTo: event.target.value || null,
                      })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((member) => (
                      <option key={member.userId} value={member.userId}>
                        {member.name} - {member.role}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedAnnotation.visibility}
                    onChange={(event) =>
                      patchAnnotation(selectedAnnotation, {
                        visibility: event.target.value,
                      })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="internal">Internal</option>
                    <option value="shared">Shared</option>
                  </select>
                </div>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-2">
                {selectedAnnotation.status !== "in_review" &&
                selectedAnnotation.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() =>
                      patchAnnotation(selectedAnnotation, { status: "in_review" })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 disabled:opacity-50"
                  >
                    Mark in review
                  </button>
                ) : null}

                {selectedAnnotation.status !== "resolved" ? (
                  <button
                    type="button"
                    onClick={() =>
                      patchAnnotation(selectedAnnotation, { status: "resolved" })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 disabled:opacity-50"
                  >
                    Mark resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      patchAnnotation(selectedAnnotation, { status: "reopened" })
                    }
                    disabled={isUpdating}
                    className="rounded-[10px] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-800 disabled:opacity-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-[320px] space-y-3 overflow-y-auto p-4">
              {selectedAnnotation.messages.map((message) => (
                <article key={message.id} className="flex gap-3">
                  {message.creatorAvatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Profile avatars can be remote URLs.
                    <img
                      src={message.creatorAvatarUrl}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border border-slate-200 object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                      {getInitials(message.creatorName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1 rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-slate-900">
                        {message.creatorName}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatDateTime(message.createdAt)}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {message.body}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <form onSubmit={handleReply} className="border-t border-slate-200 p-4">
              <textarea
                value={replyBody}
                onChange={(event) => setReplyBody(event.target.value)}
                disabled={!canComment || isSubmitting}
                rows={3}
                maxLength={4000}
                placeholder="Reply with the decision, answer, or next action..."
                className="w-full resize-none rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs leading-5 text-slate-500">
                  Replies stay tied to this revision, file, marker, and saved
                  camera view.
                </p>
                <button
                  type="submit"
                  disabled={!canComment || isSubmitting || !replyBody.trim()}
                  className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? "Sending..." : "Reply"}
                </button>
              </div>
            </form>
          </section>
        ) : (
          <div className="rounded-[12px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            No part review annotations yet. Open an STL file and choose Add
            annotation to begin a controlled design review thread.
          </div>
        )}
      </div>
    </aside>
  );
}

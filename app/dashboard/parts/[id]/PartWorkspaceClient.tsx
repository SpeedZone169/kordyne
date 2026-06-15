"use client";

import { useMemo, useState } from "react";
import PartFilesViewer, { type PreviewFile } from "./PartFilesViewer";
import PartReviewAnnotationsPanel, {
  toViewerAnnotation,
  type ReviewAnnotation,
  type ReviewMemberOption,
} from "./PartReviewAnnotationsPanel";
import type { StlAnnotationDraft, StlViewerAnnotation } from "./StlPreview";

type PartWorkspaceClientProps = {
  files: PreviewFile[];
  annotations: ReviewAnnotation[];
  partId: string;
  revisionLabel: string | null;
  latestRevisionLabel: string | null;
  isLatestRevision: boolean;
  memberOptions: ReviewMemberOption[];
  canComment: boolean;
  canManageReview: boolean;
  revisionReviewSummaries: {
    partId: string;
    revision: string | null;
    isCurrent: boolean;
    openCount: number;
    resolvedCount: number;
  }[];
};

export default function PartWorkspaceClient({
  files,
  annotations,
  partId,
  revisionLabel,
  latestRevisionLabel,
  isLatestRevision,
  memberOptions,
  canComment,
  canManageReview,
  revisionReviewSummaries,
}: PartWorkspaceClientProps) {
  const [pendingAnnotation, setPendingAnnotation] =
    useState<StlAnnotationDraft | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    annotations.find((annotation) => annotation.status !== "resolved")?.id ??
      annotations[0]?.id ??
      null,
  );
  const [requestedFileId, setRequestedFileId] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    annotationId: string;
    nonce: number;
  } | null>(null);

  const viewerAnnotations = useMemo<StlViewerAnnotation[]>(
    () => annotations.map(toViewerAnnotation),
    [annotations],
  );

  const selectedAnnotation =
    annotations.find((annotation) => annotation.id === selectedAnnotationId) ??
    null;

  function selectAnnotation(annotation: ReviewAnnotation) {
    setSelectedAnnotationId(annotation.id);
    setRequestedFileId(annotation.partFileId);
  }

  function focusAnnotation(annotation: ReviewAnnotation) {
    selectAnnotation(annotation);
    setFocusRequest({
      annotationId: annotation.id,
      nonce: Date.now(),
    });
  }

  function handleViewerSelect(annotation: StlViewerAnnotation) {
    const reviewAnnotation = annotations.find((item) => item.id === annotation.id);
    if (!reviewAnnotation) return;
    selectAnnotation(reviewAnnotation);
  }

  function handleCreateAnnotation(annotation: StlAnnotationDraft) {
    setPendingAnnotation(annotation);
    setRequestedFileId(annotation.fileId);
  }

  const currentRevisionSummary = revisionReviewSummaries.find(
    (summary) => summary.isCurrent,
  );

  return (
    <section
      id="part-workspace"
      className="mt-5 rounded-[12px] border border-slate-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-600">
            Part workspace
          </p>
          <h2 className="mt-1 text-xl font-black text-slate-950">
            3D part review annotations
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Tag STL mesh locations, restore the saved camera view, and keep every
            decision tied to this exact part revision and file.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            Rev {revisionLabel || "-"}
          </div>
          <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700">
            {currentRevisionSummary?.openCount ?? 0} open review item
            {(currentRevisionSummary?.openCount ?? 0) === 1 ? "" : "s"}
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            {files.length} file{files.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      {revisionReviewSummaries.length > 1 ? (
        <div className="mb-4 flex flex-wrap gap-2 rounded-[10px] border border-slate-200 bg-slate-50 p-3">
          {revisionReviewSummaries.map((summary) => (
            <div
              key={summary.partId}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                summary.isCurrent
                  ? "border-slate-900 bg-white text-slate-950"
                  : "border-slate-200 bg-white text-slate-600"
              }`}
            >
              Rev {summary.revision || "-"}: {summary.openCount} open /{" "}
              {summary.resolvedCount} resolved
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_460px]">
        <PartFilesViewer
          files={files}
          annotations={viewerAnnotations}
          pendingAnnotation={pendingAnnotation}
          selectedAnnotationId={selectedAnnotation?.id ?? null}
          requestedFileId={requestedFileId}
          focusRequest={focusRequest}
          onCreateAnnotation={handleCreateAnnotation}
          onCancelPendingAnnotation={() => setPendingAnnotation(null)}
          onSelectAnnotation={handleViewerSelect}
          onManualFileSelect={() => setRequestedFileId(null)}
        />

        <PartReviewAnnotationsPanel
          partId={partId}
          revisionLabel={revisionLabel}
          latestRevisionLabel={latestRevisionLabel}
          isLatestRevision={isLatestRevision}
          annotations={annotations}
          pendingAnnotation={pendingAnnotation}
          selectedAnnotationId={selectedAnnotation?.id ?? null}
          memberOptions={memberOptions}
          canComment={canComment}
          canManageReview={canManageReview}
          onCancelPendingAnnotation={() => setPendingAnnotation(null)}
          onSelectAnnotation={selectAnnotation}
          onFocusAnnotation={focusAnnotation}
        />
      </div>
    </section>
  );
}

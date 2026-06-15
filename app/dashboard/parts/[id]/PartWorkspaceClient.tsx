"use client";

import { useMemo, useState } from "react";
import PartCollaborationPanel, {
  type PartThreadMessage,
} from "./PartCollaborationPanel";
import PartFilesViewer, { type PreviewFile } from "./PartFilesViewer";
import type { PendingStlAnnotation, StlViewerAnnotation } from "./StlPreview";

type PartWorkspaceClientProps = {
  files: PreviewFile[];
  messages: PartThreadMessage[];
  partId: string;
  revisionPartId: string;
  revisionLabel: string | null;
  canComment: boolean;
};

export default function PartWorkspaceClient({
  files,
  messages,
  partId,
  revisionPartId,
  revisionLabel,
  canComment,
}: PartWorkspaceClientProps) {
  const [pendingAnnotation, setPendingAnnotation] =
    useState<PendingStlAnnotation | null>(null);

  const viewerAnnotations = useMemo<StlViewerAnnotation[]>(
    () =>
      messages.flatMap((message) => {
        if (!message.viewerAnnotation) return [];

        return [
          {
            ...message.viewerAnnotation,
            id: message.id,
            messageId: message.id,
            messageBody: message.messageBody,
            senderName: message.senderName,
            createdAt: message.createdAt,
          },
        ];
      }),
    [messages],
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
            Live review and communicator
          </h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Tag STL model features, keep review decisions attached to the
            revision, and discuss the exact point without exposing unrelated
            vault context.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700">
            {files.length} file{files.length === 1 ? "" : "s"}
          </div>
          <div className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-bold text-cyan-700">
            {viewerAnnotations.length} viewer tag
            {viewerAnnotations.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <PartFilesViewer
          files={files}
          annotations={viewerAnnotations}
          onCreateAnnotation={setPendingAnnotation}
        />

        <PartCollaborationPanel
          partId={partId}
          revisionPartId={revisionPartId}
          revisionLabel={revisionLabel}
          messages={messages}
          canComment={canComment}
          pendingAnnotation={pendingAnnotation}
          onClearPendingAnnotation={() => setPendingAnnotation(null)}
        />
      </div>
    </section>
  );
}

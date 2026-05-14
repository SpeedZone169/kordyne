"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type PartThreadMessage = {
  id: string;
  messageBody: string;
  createdAt: string;
  senderName: string;
  senderEmail: string | null;
};

type PartCollaborationPanelProps = {
  partId: string;
  revisionPartId: string;
  revisionLabel: string | null;
  messages: PartThreadMessage[];
  canComment: boolean;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function PartCollaborationPanel({
  partId,
  revisionPartId,
  revisionLabel,
  messages,
  canComment,
}: PartCollaborationPanelProps) {
  const router = useRouter();
  const [messageBody, setMessageBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = messageBody.trim();
    if (!trimmedMessage || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/part-collaboration/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          partId,
          revisionPartId,
          messageBody: trimmedMessage,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to send message.");
      }

      setMessageBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[12px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-800">
              Collaboration
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Revision {revisionLabel || "-"} messages and @email review notes.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
            {messages.length}
          </span>
        </div>
      </div>

      <div className="max-h-[300px] space-y-3 overflow-y-auto p-4">
        {messages.length > 0 ? (
          messages.map((message) => (
            <article
              key={message.id}
              className="rounded-[10px] border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                  {message.senderName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-900">
                      {message.senderName}
                    </p>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                    {message.messageBody}
                  </p>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-[10px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            No messages yet. Keep customer, vendor, internal, and external
            viewer comments scoped to this part revision.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-slate-200 p-4">
        <label className="block">
          <span className="sr-only">Part collaboration message</span>
          <textarea
            value={messageBody}
            onChange={(event) => setMessageBody(event.target.value)}
            disabled={!canComment || isSubmitting}
            rows={3}
            placeholder="@person@example.com add a note, review result, upload request, or approval question"
            className="w-full resize-none rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {error ? (
          <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
        ) : null}

        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-500">
            Mentions notify by email, but vault access stays permissioned.
          </p>
          <button
            type="submit"
            disabled={!canComment || isSubmitting || !messageBody.trim()}
            className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? "Sending..." : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}

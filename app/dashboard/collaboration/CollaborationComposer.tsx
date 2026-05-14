"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  providerPackageId: string | null;
};

export default function CollaborationComposer({ providerPackageId }: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function submitMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!providerPackageId) {
      setError("Select a provider thread first.");
      return;
    }

    if (!message.trim()) {
      setError("Write a message before sending.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/collaboration/messages", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerPackageId,
          messageBody: message,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        notifiedMentions?: number;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to send message.");
      }

      setMessage("");
      setSuccess(
        payload.notifiedMentions
          ? `Message sent. ${payload.notifiedMentions} mention notification sent.`
          : "Message sent.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submitMessage} className="rounded-[12px] border border-slate-200 bg-white p-3 shadow-sm">
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Write a comment, paste results, or mention @name@company.com"
        rows={4}
        className="w-full resize-none rounded-[10px] border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-slate-400"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs leading-5 text-slate-500">
          Mentions notify by email. Access is still controlled by the thread and vault permissions.
        </p>

        <button
          type="submit"
          disabled={submitting || !providerPackageId}
          className="rounded-[10px] bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-emerald-700">{success}</p> : null}
    </form>
  );
}

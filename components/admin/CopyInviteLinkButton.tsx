"use client";

import { useState } from "react";

type CopyInviteLinkButtonProps = {
  inviteUrl: string;
};

export default function CopyInviteLinkButton({
  inviteUrl,
}: CopyInviteLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function handleCopy() {
    try {
      setError("");
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Unable to copy link.");
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleCopy}
        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-zinc-50"
      >
        {copied ? "Copied" : "Copy invite link"}
      </button>

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AddCapabilityFormProps = {
  organizationId: string;
};

const SERVICE_DOMAINS = [
  { value: "additive", label: "Additive" },
  { value: "cnc", label: "CNC" },
  { value: "cad", label: "CAD" },
  { value: "scanning", label: "Scanning" },
  { value: "composites", label: "Composites" },
  { value: "sheet_metal", label: "Sheet Metal" },
  { value: "qa", label: "QA" },
  { value: "finishing", label: "Finishing" },
  { value: "assembly", label: "Assembly" },
  { value: "general", label: "General" },
];

function fieldClasses() {
  return "w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/25 focus:ring-4 focus:ring-[#0b1633]/5";
}

function normalizeCodeInput(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function AddCapabilityForm({
  organizationId,
}: AddCapabilityFormProps) {
  const router = useRouter();

  const defaultServiceDomain = useMemo(
    () => SERVICE_DOMAINS[0]?.value ?? "additive",
    [],
  );

  const [serviceDomain, setServiceDomain] = useState(defaultServiceDomain);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/internal-manufacturing/capabilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          serviceDomain,
          code,
          name,
          description,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create capability.");
      }

      setServiceDomain(defaultServiceDomain);
      setCode("");
      setName("");
      setDescription("");
      setSuccessMessage("Capability created successfully.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create capability.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-[20px] font-semibold tracking-tight text-[#0b1633]">
          Add capability
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Define a process or material capability that your internal resources can
          perform.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Capability name
          </label>
          <input
            className={fieldClasses()}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="SLS PA12"
            maxLength={120}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Capability code
            </label>
            <input
              className={fieldClasses()}
              value={code}
              onChange={(event) => setCode(normalizeCodeInput(event.target.value))}
              placeholder="sls_pa12"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Service domain
            </label>
            <select
              className={fieldClasses()}
              value={serviceDomain}
              onChange={(event) => setServiceDomain(event.target.value)}
            >
              {SERVICE_DOMAINS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Description
          </label>
          <textarea
            className={`${fieldClasses()} min-h-[112px] resize-y`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Optional description of materials, process notes, or the intended internal use of this capability."
            maxLength={2000}
          />
        </div>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4 pt-2">
          <p className="text-sm text-slate-500">
            Codes are normalized automatically for consistent mapping.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add capability"}
          </button>
        </div>
      </form>
    </div>
  );
}
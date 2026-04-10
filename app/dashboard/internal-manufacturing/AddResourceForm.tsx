"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type AddResourceFormProps = {
  organizationId: string;
};

const RESOURCE_TYPES = [
  { value: "printer", label: "Printer" },
  { value: "cnc_machine", label: "CNC Machine" },
  { value: "cad_seat", label: "CAD Seat" },
  { value: "scanner", label: "Scanner" },
  { value: "sheet_metal_machine", label: "Sheet Metal Machine" },
  { value: "composites_cell", label: "Composites Cell" },
  { value: "inspection_station", label: "Inspection Station" },
  { value: "finishing_station", label: "Finishing Station" },
  { value: "oven", label: "Oven" },
  { value: "manual_cell", label: "Manual Cell" },
  { value: "operator", label: "Operator" },
  { value: "work_center", label: "Work Center" },
];

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

export default function AddResourceForm({ organizationId }: AddResourceFormProps) {
  const router = useRouter();

  const defaultResourceType = useMemo(() => RESOURCE_TYPES[0]?.value ?? "printer", []);
  const defaultServiceDomain = useMemo(() => SERVICE_DOMAINS[0]?.value ?? "additive", []);

  const [name, setName] = useState("");
  const [resourceType, setResourceType] = useState(defaultResourceType);
  const [serviceDomain, setServiceDomain] = useState(defaultServiceDomain);
  const [locationLabel, setLocationLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/internal-manufacturing/resources", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          organizationId,
          name,
          resourceType,
          serviceDomain,
          locationLabel,
          notes,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create resource.");
      }

      setName("");
      setResourceType(defaultResourceType);
      setServiceDomain(defaultServiceDomain);
      setLocationLabel("");
      setNotes("");
      setSuccessMessage("Resource created successfully.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create resource.";
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="text-[20px] font-semibold tracking-tight text-[#0b1633]">
          Add resource
        </h3>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          Create an internal machine, work cell, operator seat, or service
          capacity record for customer-owned production.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Resource name
          </label>
          <input
            className={fieldClasses()}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Internal SLS Printer 02"
            maxLength={120}
            required
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Resource type
            </label>
            <select
              className={fieldClasses()}
              value={resourceType}
              onChange={(event) => setResourceType(event.target.value)}
            >
              {RESOURCE_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
            Location
          </label>
          <input
            className={fieldClasses()}
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
            placeholder="Workshop A · Bay 2"
            maxLength={120}
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Notes
          </label>
          <textarea
            className={`${fieldClasses()} min-h-[112px] resize-y`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional setup notes, ownership, operating constraints, or internal remarks."
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
            New resources start as active manual resources with idle status.
          </p>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Adding..." : "Add resource"}
          </button>
        </div>
      </form>
    </div>
  );
}
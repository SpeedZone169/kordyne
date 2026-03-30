"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProviderDashboardData } from "../types";

type Props = {
  data: ProviderDashboardData;
};

const PROCESS_OPTIONS = [
  { value: "cnc_machining", label: "CNC machining" },
  { value: "3d_printing", label: "3D printing" },
  { value: "sheet_metal", label: "Sheet metal" },
  { value: "composite_manufacturing", label: "Composite manufacturing" },
  { value: "injection_moulding", label: "Injection moulding" },
  { value: "3d_scanning", label: "3D scanning" },
  { value: "ct_scanning", label: "CT scanning" },
  { value: "cad_creation", label: "CAD creation" },
] as const;

function getProcessLabel(value: string) {
  return PROCESS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function Client({ data }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const organization = data.organization;
  const canEdit =
    organization &&
    ["admin", "engineer"].includes(organization.memberRole || "");

  const [processFamily, setProcessFamily] = useState<string>("cnc_machining");
  const [processName, setProcessName] = useState("");
  const [materialFamily, setMaterialFamily] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [machineType, setMachineType] = useState("");
  const [certification, setCertification] = useState("");
  const [minQuantity, setMinQuantity] = useState("");
  const [maxQuantity, setMaxQuantity] = useState("");
  const [leadTimeNotes, setLeadTimeNotes] = useState("");

  const [search, setSearch] = useState("");
  const [familyFilter, setFamilyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [capabilitySaving, setCapabilitySaving] = useState(false);
  const [capabilityError, setCapabilityError] = useState<string | null>(null);
  const [capabilitySuccess, setCapabilitySuccess] = useState<string | null>(null);
  const [capabilityBusyId, setCapabilityBusyId] = useState<string | null>(null);

  const processFamilies = useMemo(
    () =>
      [...new Set(data.capabilities.map((cap) => cap.processFamily).filter(Boolean))].sort(),
    [data.capabilities],
  );

  const filteredCapabilities = useMemo(() => {
    return [...data.capabilities]
      .filter((capability) => {
        if (familyFilter !== "all" && capability.processFamily !== familyFilter) {
          return false;
        }

        if (statusFilter === "active" && !capability.active) {
          return false;
        }

        if (statusFilter === "inactive" && capability.active) {
          return false;
        }

        const haystack = [
          capability.processName,
          capability.processFamily,
          capability.materialFamily,
          capability.materialName,
          capability.machineType,
          capability.certification,
          capability.leadTimeNotes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search.trim().toLowerCase());
      })
      .sort((a, b) => {
        if (a.active && !b.active) return -1;
        if (!a.active && b.active) return 1;
        return a.processName.localeCompare(b.processName);
      });
  }, [data.capabilities, familyFilter, search, statusFilter]);

  const inactiveCount = useMemo(
    () => data.capabilities.filter((capability) => !capability.active).length,
    [data.capabilities],
  );

  const leadTimeNotesCount = useMemo(
    () =>
      data.capabilities.filter((capability) =>
        Boolean(capability.leadTimeNotes?.trim()),
      ).length,
    [data.capabilities],
  );

  async function handleAddCapability(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!organization || !canEdit) return;

    if (!processName.trim()) {
      setCapabilityError("Capability name is required.");
      return;
    }

    setCapabilitySaving(true);
    setCapabilityError(null);
    setCapabilitySuccess(null);

    try {
      const { error } = await supabase.from("provider_capabilities").insert({
        provider_org_id: organization.id,
        process_family: processFamily,
        process_name: processName.trim(),
        material_family: materialFamily.trim() || null,
        material_name: materialName.trim() || null,
        machine_type: machineType.trim() || null,
        certification: certification.trim() || null,
        min_quantity: minQuantity ? Number(minQuantity) : null,
        max_quantity: maxQuantity ? Number(maxQuantity) : null,
        lead_time_notes: leadTimeNotes.trim() || null,
        active: true,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        throw new Error(error.message);
      }

      setCapabilitySuccess("Capability added.");
      setProcessFamily("cnc_machining");
      setProcessName("");
      setMaterialFamily("");
      setMaterialName("");
      setMachineType("");
      setCertification("");
      setMinQuantity("");
      setMaxQuantity("");
      setLeadTimeNotes("");

      router.refresh();
    } catch (error) {
      setCapabilityError(
        error instanceof Error ? error.message : "Failed to add capability.",
      );
    } finally {
      setCapabilitySaving(false);
    }
  }

  async function toggleCapability(capabilityId: string, nextActive: boolean) {
    if (!canEdit) return;

    setCapabilityBusyId(capabilityId);
    setCapabilityError(null);
    setCapabilitySuccess(null);

    try {
      const { error } = await supabase
        .from("provider_capabilities")
        .update({
          active: nextActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", capabilityId);

      if (error) {
        throw new Error(error.message);
      }

      router.refresh();
    } catch (error) {
      setCapabilityError(
        error instanceof Error ? error.message : "Failed to update capability.",
      );
    } finally {
      setCapabilityBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Capability register
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Capabilities and production fit
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Structure your processes, machines, materials, quantity ranges, and lead
              time notes. This becomes the backbone for provider routing now and schedule
              mapping next.
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Capability overview
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px] border border-zinc-200 bg-white p-4">
                <div className="text-sm text-slate-500">Active</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {data.stats.activeCapabilityCount}
                </div>
              </div>
              <div className="rounded-[20px] border border-zinc-200 bg-white p-4">
                <div className="text-sm text-slate-500">Inactive</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {inactiveCount}
                </div>
              </div>
              <div className="rounded-[20px] border border-zinc-200 bg-white p-4">
                <div className="text-sm text-slate-500">Families</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {processFamilies.length}
                </div>
              </div>
              <div className="rounded-[20px] border border-zinc-200 bg-white p-4">
                <div className="text-sm text-slate-500">With lead time notes</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">
                  {leadTimeNotesCount}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-semibold tracking-tight text-slate-950">
            Add capability
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Keep this structured. Focus on service category, machine fit, material range,
            and practical lead time detail. This will later feed scheduling lanes and
            resource mapping.
          </p>

          <form onSubmit={handleAddCapability} className="mt-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Service category
              </label>
              <select
                value={processFamily}
                onChange={(event) => setProcessFamily(event.target.value)}
                disabled={!canEdit}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              >
                {PROCESS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Capability name
              </label>
              <input
                value={processName}
                onChange={(event) => setProcessName(event.target.value)}
                disabled={!canEdit}
                placeholder="5-axis CNC, SLA printing, CT scanning, CAD creation..."
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Material family
                </label>
                <input
                  value={materialFamily}
                  onChange={(event) => setMaterialFamily(event.target.value)}
                  disabled={!canEdit}
                  placeholder="Aluminium, polymer, composite..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Material name
                </label>
                <input
                  value={materialName}
                  onChange={(event) => setMaterialName(event.target.value)}
                  disabled={!canEdit}
                  placeholder="7075, PA12, carbon fibre..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Machine / equipment
                </label>
                <input
                  value={machineType}
                  onChange={(event) => setMachineType(event.target.value)}
                  disabled={!canEdit}
                  placeholder="Roeders 5-axis, Formlabs Form 4L..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Certification
                </label>
                <input
                  value={certification}
                  onChange={(event) => setCertification(event.target.value)}
                  disabled={!canEdit}
                  placeholder="ISO 9001, internal QA, N/A..."
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Min quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={minQuantity}
                  onChange={(event) => setMinQuantity(event.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Max quantity
                </label>
                <input
                  type="number"
                  min="0"
                  value={maxQuantity}
                  onChange={(event) => setMaxQuantity(event.target.value)}
                  disabled={!canEdit}
                  className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                Lead time notes
              </label>
              <textarea
                value={leadTimeNotes}
                onChange={(event) => setLeadTimeNotes(event.target.value)}
                disabled={!canEdit}
                rows={4}
                placeholder="Typical turnaround, setup considerations, shift capacity, or throughput notes."
                className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
              />
            </div>

            {capabilityError ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {capabilityError}
              </div>
            ) : null}

            {capabilitySuccess ? (
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {capabilitySuccess}
              </div>
            ) : null}

            {canEdit ? (
              <button
                type="submit"
                disabled={capabilitySaving}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {capabilitySaving ? "Adding..." : "Add capability"}
              </button>
            ) : null}
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Capability filtering
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  Search and filter
                </h3>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search capability, machine, material..."
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />

              <select
                value={familyFilter}
                onChange={(event) => setFamilyFilter(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="all">All families</option>
                {processFamilies.map((family) => (
                  <option key={family} value={family}>
                    {getProcessLabel(family)}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="all">All statuses</option>
                <option value="active">Active only</option>
                <option value="inactive">Inactive only</option>
              </select>
            </div>
          </div>

          {filteredCapabilities.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-white p-10 text-center text-sm text-slate-600 shadow-sm">
              No capabilities match your current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCapabilities.map((capability) => (
                <div
                  key={capability.id}
                  className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-slate-950">
                          {capability.processName}
                        </h4>

                        <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                          {getProcessLabel(capability.processFamily)}
                        </span>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            capability.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {capability.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-sm text-slate-600">
                        <p>Machine / equipment: {capability.machineType || "—"}</p>
                        <p>Material family: {capability.materialFamily || "—"}</p>
                        <p>Material name: {capability.materialName || "—"}</p>
                        <p>Certification: {capability.certification || "—"}</p>
                        <p>
                          Quantity range: {capability.minQuantity ?? "—"} to{" "}
                          {capability.maxQuantity ?? "—"}
                        </p>
                        <p>Lead time notes: {capability.leadTimeNotes || "—"}</p>
                      </div>
                    </div>

                    {canEdit ? (
                      <button
                        type="button"
                        disabled={capabilityBusyId === capability.id}
                        onClick={() =>
                          toggleCapability(capability.id, !capability.active)
                        }
                        className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {capabilityBusyId === capability.id
                          ? "Saving..."
                          : capability.active
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { ProviderCapabilityRow } from "../types";
import type {
ProviderCapabilitiesData,
ProviderCapabilitiesWorkCenter,
} from "./types";
type Props = {
data: ProviderCapabilitiesData;
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
function formatCenterTypeLabel(value: string) {
return value
.split("_")
.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
.join(" ");
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
[
...new Set(
data.capabilities
.map((cap) => cap.processFamily)
.filter((value) => Boolean(value)),
),
].sort(),
[data.capabilities],
);
const capabilityCoverageById = useMemo(() => {
const map = new Map<string, number>();
for (const workCenter of data.workCenters) {
for (const capability of workCenter.mappedCapabilities) {
map.set(capability.id, (map.get(capability.id) ?? 0) + 1);
}
}
return map;
}, [data.workCenters]);
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
if (statusFilter === "unmapped") {
return (capabilityCoverageById.get(capability.id) ?? 0) === 0;
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
}, [capabilityCoverageById, data.capabilities, familyFilter, search, statusFilter]);
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
<section className="rounded-[34px] border border-zinc-200 bg-white p-8
shadow-sm">
<div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-
500">
Capability and equipment setup
</p>
<h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950
lg:text-5xl">
Capabilities, work centers, and resource fit
</h2>
<p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
Define what your factory can do, what equipment exists, and which
capabilities are mapped to real scheduling lanes. This page is your
setup surface. Scheduling happens separately in the Schedule tab.
</p>
</div>
<div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-
500">
Coverage overview
</p>
<div className="mt-5 grid gap-3 sm:grid-cols-2">
<MetricCard label="Active capabilities"
value={data.stats.activeCapabilityCount} />
<MetricCard label="Inactive capabilities"
value={data.stats.inactiveCapabilityCount} />
<MetricCard label="Work centers" value={data.stats.workCenterCount} />
<MetricCard label="Mapped work centers"
value={data.stats.mappedWorkCenterCount} />
</div>
</div>
</div>
</section>
<section className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
<div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-
sm">
<h3 className="text-2xl font-semibold tracking-tight text-slate-950">
Add capability
</h3>
<p className="mt-3 text-sm leading-6 text-slate-600">
Keep this structured. Focus on service category, machine fit, material
range, and practical lead time detail. Mapped capabilities can then be
connected to real work centers below.
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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

className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-50"
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
placeholder="Typical turnaround, setup considerations, shift capacity, or
throughput notes."
className="w-full rounded-[24px] border border-zinc-300 bg-white px-4 py-
3 text-sm text-slate-950 outline-none disabled:cursor-not-allowed disabled:bg-zinc-
50"
/>
</div>
{capabilityError ? (
<div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-
3 text-sm text-rose-700">
{capabilityError}
</div>
) : null}
{capabilitySuccess ? (
<div className="rounded-[18px] border border-emerald-200 bg-emerald-50
px-4 py-3 text-sm text-emerald-700">
{capabilitySuccess}
</div>
) : null}
{canEdit ? (
<button
type="submit"
disabled={capabilitySaving}
className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium
text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-
60"
>
{capabilitySaving ? "Adding..." : "Add capability"}

</button>
) : null}
</form>
</div>
<div className="space-y-6">
<div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-
sm">
<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-
between">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-
slate-500">
Capability filtering
</p>
<h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
Search and review
</h3>
</div>
</div>
<div className="mt-6 grid gap-4 md:grid-cols-3">
<input
value={search}
onChange={(event) => setSearch(event.target.value)}
placeholder="Search capability, machine, material..."
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none"
/>
<select
value={familyFilter}
onChange={(event) => setFamilyFilter(event.target.value)}
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none"
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
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none"
>
<option value="all">All statuses</option>
<option value="active">Active only</option>
<option value="inactive">Inactive only</option>
<option value="unmapped">Unmapped active only</option>

</select>
</div>
</div>
{filteredCapabilities.length === 0 ? (
<div className="rounded-[28px] border border-dashed border-zinc-300 bg-
white p-10 text-center text-sm text-slate-600 shadow-sm">
No capabilities match your current filters.
</div>
) : (
<div className="space-y-4">
{filteredCapabilities.map((capability) => (
<CapabilityCard
key={capability.id}
capability={capability}
mappedCenterCount={capabilityCoverageById.get(capability.id) ?? 0}
canEdit={Boolean(canEdit)}
busy={capabilityBusyId === capability.id}
onToggle={toggleCapability}
/>
))}
</div>
)}
</div>
</section>
<section className="rounded-[32px] border border-zinc-200 bg-white p-8
shadow-sm">
<div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
<div>
<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-
500">
Work centers and equipment
</p>
<h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
Create scheduling lanes and map resource coverage
</h3>
<p className="mt-3 text-sm leading-6 text-slate-600">
These are the real resources your schedule will use. Add machines,
cells, design stations, and inspection lanes, then connect them to
the active capabilities they can actually execute.
</p>
<div className="mt-6 grid gap-3 sm:grid-cols-2">
<MetricCard label="Work centers" value={data.stats.workCenterCount} />
<MetricCard label="Active work centers"
value={data.stats.activeWorkCenterCount} />
<MetricCard label="Mapped work centers"
value={data.stats.mappedWorkCenterCount} />
<MetricCard label="Unmapped active capabilities"
value={data.stats.unmappedCapabilityCount} />
</div>
{data.stats.unmappedCapabilityCount > 0 ? (

<div className="mt-6 rounded-[20px] border border-amber-200 bg-amber-50
px-4 py-4 text-sm text-amber-800">
You currently have {data.stats.unmappedCapabilityCount} active
capability
{data.stats.unmappedCapabilityCount === 1 ? "" : "ies"} without a
mapped work center. These will be harder to schedule cleanly.
</div>
) : null}
{organization ? (
<div className="mt-6">
<CreateWorkCenterForm providerOrgId={organization.id} />
</div>
) : null}
</div>
<div className="space-y-4">
{data.workCenters.length === 0 ? (
<div className="rounded-[24px] border border-dashed border-zinc-300 bg-
[#fafaf9] p-6 text-sm text-slate-600">
No work centers added yet. Start by creating a machine, work cell,
design station, or inspection lane.
</div>
) : (
data.workCenters.map((workCenter) => (
<WorkCenterCapabilityCard
key={workCenter.id}
workCenter={workCenter}
capabilities={data.capabilities}
/>
))
)}
</div>
</div>
</section>
</div>
);
}
function MetricCard({ label, value }: { label: string; value: number }) {
return (
<div className="rounded-[20px] border border-zinc-200 bg-white p-4">
<div className="text-sm text-slate-500">{label}</div>
<div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
</div>
);
}
function CapabilityCard({
capability,
mappedCenterCount,
canEdit,
busy,
onToggle,

}: {
capability: ProviderCapabilityRow;
mappedCenterCount: number;
canEdit: boolean;
busy: boolean;
onToggle: (capabilityId: string, nextActive: boolean) => Promise<void>;
}) {
return (
<div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-
sm">
<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
<div>
<div className="flex flex-wrap items-center gap-2">
<h4 className="text-lg font-semibold text-slate-950">
{capability.processName}
</h4>
<span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1
text-xs font-medium text-slate-700">
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
<span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1
text-xs font-medium text-slate-700">
{mappedCenterCount} mapped center{mappedCenterCount === 1 ? "" : "s"}
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

disabled={busy}
onClick={() => onToggle(capability.id, !capability.active)}
className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm
font-medium text-slate-900 transition hover:bg-zinc-50 disabled:cursor-not-allowed
disabled:opacity-60"
>
{busy
? "Saving..."
: capability.active
? "Deactivate"
: "Reactivate"}
</button>
) : null}
</div>
</div>
);
}
function CreateWorkCenterForm({ providerOrgId }: { providerOrgId: string }) {
const router = useRouter();
const [name, setName] = useState("");
const [code, setCode] = useState("");
const [centerType, setCenterType] = useState("machine");
const [description, setDescription] = useState("");
const [locationLabel, setLocationLabel] = useState("");
const [active, setActive] = useState(true);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
event.preventDefault();
setSaving(true);
setError(null);
setSuccess(null);
try {
const response = await fetch("/api/provider/work-centers", {
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
providerOrgId,
name,
code,
centerType,
description,
locationLabel,
active,
}),
});

const payload = await response.json();
if (!response.ok) {
throw new Error(payload.error || "Failed to create work center.");
}
setSuccess("Work center created.");
setName("");
setCode("");
setCenterType("machine");
setDescription("");
setLocationLabel("");
setActive(true);
router.refresh();
} catch (err) {
setError(
err instanceof Error ? err.message : "Failed to create work center.",
);
} finally {
setSaving(false);
}
}
return (
<form
onSubmit={handleSubmit}
className="space-y-4 rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6"
>
<div className="grid gap-4 md:grid-cols-2">
<div className="space-y-2">
<label className="text-sm font-medium text-slate-700">Name</label>
<input
value={name}
onChange={(event) => setName(event.target.value)}
placeholder="Haas UMC-750"
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-
sm text-slate-950 outline-none"
/>
</div>
<div className="space-y-2">
<label className="text-sm font-medium text-slate-700">Code</label>
<input
value={code}
onChange={(event) => setCode(event.target.value)}
placeholder="CNC-01"
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-
sm text-slate-950 outline-none"
/>
</div>
</div>
<div className="grid gap-4 md:grid-cols-2">
<div className="space-y-2">

<label className="text-sm font-medium text-slate-700">Center type</label>
<select
value={centerType}
onChange={(event) => setCenterType(event.target.value)}
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-
sm text-slate-950 outline-none"
>
<option value="machine">Machine</option>
<option value="work_cell">Work cell</option>
<option value="manual_station">Manual station</option>
<option value="inspection_station">Inspection station</option>
<option value="design_station">Design station</option>
</select>
</div>
<div className="space-y-2">
<label className="text-sm font-medium text-slate-700">Location</label>
<input
value={locationLabel}
onChange={(event) => setLocationLabel(event.target.value)}
placeholder="Bay A / Room 2"
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-
sm text-slate-950 outline-none"
/>
</div>
</div>
<div className="space-y-2">
<label className="text-sm font-medium text-slate-700">Description</label>
<textarea
value={description}
onChange={(event) => setDescription(event.target.value)}
rows={3}
placeholder="5-axis milling center for precision aluminium and prototype parts."
className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3
text-sm text-slate-950 outline-none"
/>
</div>
<label className="inline-flex items-center gap-3 text-sm text-slate-700">
<input
type="checkbox"
checked={active}
onChange={(event) => setActive(event.target.checked)}
className="h-4 w-4 rounded border-zinc-300"
/>
Active work center
</label>
{error ? (
<div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3
text-sm text-rose-700">
{error}
</div>

) : null}
{success ? (
<div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4
py-3 text-sm text-emerald-700">
{success}
</div>
) : null}
<button
type="submit"
disabled={saving}
className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-
white transition hover:opacity-90 disabled:opacity-60"
>
{saving ? "Creating..." : "Create work center"}
</button>
</form>
);
}
function WorkCenterCapabilityCard({
workCenter,
capabilities,
}: {
workCenter: ProviderCapabilitiesWorkCenter;
capabilities: ProviderCapabilityRow[];
}) {
const router = useRouter();
const activeCapabilities = capabilities.filter((capability) => capability.active);
const unmappedCapabilities = activeCapabilities.filter(
(capability) =>
!workCenter.mappedCapabilities.some((mapped) => mapped.id === capability.id),
);
const [selectedCapabilityId, setSelectedCapabilityId] = useState(
unmappedCapabilities[0]?.id ?? "",
);
const [saving, setSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
useEffect(() => {
if (!unmappedCapabilities.some((capability) => capability.id ===
selectedCapabilityId)) {
setSelectedCapabilityId(unmappedCapabilities[0]?.id ?? "");
}
}, [selectedCapabilityId, unmappedCapabilities]);
async function addMapping() {
if (!selectedCapabilityId) return;
setSaving(true);

setError(null);
try {
const response = await fetch(
`/api/provider/work-centers/${workCenter.id}/capabilities`,
{
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
providerCapabilityId: selectedCapabilityId,
}),
},
);
const payload = await response.json();
if (!response.ok) {
throw new Error(payload.error || "Failed to add capability mapping.");
}
router.refresh();
} catch (err) {
setError(
err instanceof Error ? err.message : "Failed to add capability mapping.",
);
} finally {
setSaving(false);
}
}
async function removeMapping(capabilityId: string) {
setSaving(true);
setError(null);
try {
const response = await fetch(
`/api/provider/work-centers/${workCenter.id}/capabilities/${capabilityId}`,
{
method: "DELETE",
},
);
const payload = await response.json();
if (!response.ok) {
throw new Error(payload.error || "Failed to remove capability mapping.");
}
router.refresh();
} catch (err) {
setError(
err instanceof Error ? err.message : "Failed to remove capability mapping.",

);
} finally {
setSaving(false);
}
}
return (
<div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
<div>
<div className="text-lg font-semibold text-slate-
950">{workCenter.name}</div>
<div className="mt-1 text-sm text-slate-500">
{workCenter.code ? `${workCenter.code} · ` : ""}
{formatCenterTypeLabel(workCenter.centerType)}
</div>
{workCenter.locationLabel ? (
<div className="mt-1 text-sm text-slate-
500">{workCenter.locationLabel}</div>
) : null}
{workCenter.description ? (
<div className="mt-2 text-sm leading-6 text-slate-600">
{workCenter.description}
</div>
) : null}
</div>
<span
className={`rounded-full px-3 py-1 text-xs font-medium ${
workCenter.active
? "bg-emerald-100 text-emerald-700"
: "bg-zinc-200 text-zinc-700"
}`}
>
{workCenter.active ? "Active" : "Inactive"}
</span>
</div>
<div className="mt-5">
<div className="text-sm font-medium text-slate-700">Mapped
capabilities</div>
<div className="mt-3 flex flex-wrap gap-2">
{workCenter.mappedCapabilities.length === 0 ? (
<span className="text-sm text-slate-500">No mapped capabilities
yet.</span>
) : (
workCenter.mappedCapabilities.map((capability) => (
<button
key={capability.id}
type="button"
onClick={() => removeMapping(capability.id)}
disabled={saving}
className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs
font-medium text-slate-700 transition hover:bg-zinc-50 disabled:opacity-60"

title="Remove mapping"
>
{capability.processName} ×
</button>
))
)}
</div>
</div>
<div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
<select
value={selectedCapabilityId}
onChange={(event) => setSelectedCapabilityId(event.target.value)}
disabled={saving || unmappedCapabilities.length === 0}
className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-
sm text-slate-950 outline-none disabled:bg-zinc-50"
>
{unmappedCapabilities.length === 0 ? (
<option value="">All active capabilities already mapped</option>
) : (
unmappedCapabilities.map((capability) => (
<option key={capability.id} value={capability.id}>
{capability.processName}
</option>
))
)}
</select>
<button
type="button"
onClick={addMapping}
disabled={saving || !selectedCapabilityId}
className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-
white transition hover:opacity-90 disabled:opacity-60"
>
{saving ? "Saving..." : "Add mapping"}
</button>
</div>
{error ? (
<div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4
py-3 text-sm text-rose-700">
{error}
</div>
) : null}
</div>
);
}

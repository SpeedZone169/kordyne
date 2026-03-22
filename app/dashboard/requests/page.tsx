import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServiceRequestActions from "../parts/[id]/ServiceRequestActions";
import {
  STATUS_BADGE_CLASSES,
  getManufacturingTypeLabel,
  getPriorityLabel,
  getServiceRequestStatusLabel,
  getServiceRequestTypeLabel,
  SERVICE_REQUEST_STATUSES,
  SERVICE_REQUEST_TYPES,
} from "@/lib/service-requests";

type RequestsPageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    type?: string;
    mine?: string;
    part?: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
  role: string | null;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type PartFileRow = {
  id: string;
  file_name: string;
  asset_category: string | null;
  file_type: string | null;
};

type RequestPartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
};

type ServiceRequestFileRow = {
  id: string;
};

type ServiceRequestRow = {
  id: string;
  organization_id: string;
  part_id: string | null;
  requested_by_user_id: string;
  title: string | null;
  request_type: string;
  status: string;
  priority: string | null;
  notes: string | null;
  due_date: string | null;
  manufacturing_type: string | null;
  source_reference_type: string | null;
  created_at: string;
  parts: RequestPartRow | RequestPartRow[] | null;
  service_request_files: ServiceRequestFileRow[] | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getSourceReferenceLabel(value: string | null) {
  switch (value) {
    case "existing_part_files":
      return "Vault files";
    case "uploaded_files":
      return "Request uploads";
    case "external_reference":
      return "External reference";
    default:
      return "Unspecified";
  }
}

function getPriorityBadgeClass(priority: string | null) {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-amber-100 text-amber-800";
    case "normal":
      return "bg-blue-100 text-blue-800";
    case "low":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getRoleBadgeClass(role: string | null) {
  switch (role) {
    case "admin":
      return "bg-gray-900 text-white";
    case "engineer":
      return "bg-blue-100 text-blue-800";
    case "viewer":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default async function RequestsPage({
  searchParams,
}: RequestsPageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const queryText = resolvedSearchParams.q?.trim() || "";
  const statusFilter = resolvedSearchParams.status?.trim() || "";
  const typeFilter = resolvedSearchParams.type?.trim() || "";
  const selectedPartId = resolvedSearchParams.part?.trim() || "";
  const mineFilter = resolvedSearchParams.mine === "true";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const membershipRows = (memberships as MembershipRow[] | null) ?? [];
  const organizationIds = membershipRows.map((m) => m.organization_id);
  const orgRole = membershipRows[0]?.role || null;
  const canRequest = orgRole === "admin" || orgRole === "engineer";

  if (organizationIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">
          Service Requests
        </h1>
        <p className="text-sm text-slate-600">
          You are not a member of any organization.
        </p>
      </div>
    );
  }

  const { data: orgParts } = await supabase
    .from("parts")
    .select("id, name, part_number, revision, status, updated_at, created_at")
    .in("organization_id", organizationIds)
    .order("updated_at", { ascending: false });

  const partOptions = (orgParts as PartRow[] | null) ?? [];

  const selectedPart = selectedPartId
    ? partOptions.find((part) => part.id === selectedPartId) || null
    : null;

  const { data: selectedPartFiles } =
    selectedPartId && selectedPart
      ? await supabase
          .from("part_files")
          .select("id, file_name, asset_category, file_type")
          .eq("part_id", selectedPartId)
          .order("created_at", { ascending: false })
      : { data: [] as PartFileRow[] };

  let query = supabase
    .from("service_requests")
    .select(
      `
      id,
      organization_id,
      part_id,
      requested_by_user_id,
      title,
      request_type,
      status,
      priority,
      notes,
      due_date,
      manufacturing_type,
      source_reference_type,
      created_at,
      parts (
        id,
        name,
        part_number,
        revision
      ),
      service_request_files (
        id
      )
    `
    )
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });

  if (queryText) {
    query = query.or(`title.ilike.%${queryText}%,notes.ilike.%${queryText}%`);
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (typeFilter) {
    query = query.eq("request_type", typeFilter);
  }

  if (mineFilter) {
    query = query.eq("requested_by_user_id", user.id);
  }

  const { data: requests, error } = await query;
  const requestRows = (requests as ServiceRequestRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Service Requests
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Manage manufacturing, CAD, and optimization requests across your
            organization. Requests remain tied to exact part revisions when they
            originate from the vault.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadgeClass(
                orgRole
              )}`}
            >
              {orgRole || "unknown"}
            </span>

            {!canRequest ? (
              <span className="text-sm text-slate-500">
                Read-only access. Viewers can monitor requests but cannot create
                them.
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/parts"
            className="inline-flex rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            Open Parts Vault
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Create service request
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Start a manufacturing, CAD, or optimization request from a chosen
              part revision in the vault. This keeps the request tied to exact
              revision context and lets you explicitly select which vault files
              should be attached.
            </p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Select part revision
            </label>
            <select
              name="part"
              defaultValue={selectedPartId}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
              disabled={!canRequest}
            >
              <option value="">Choose a part revision</option>
              {partOptions.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name}
                  {part.part_number ? ` · ${part.part_number}` : ""}
                  {part.revision ? ` · Rev ${part.revision}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={!canRequest}
              className="inline-flex rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              Load part
            </button>

            <Link
              href="/dashboard/requests"
              className="inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </div>
        </form>

        {selectedPart ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-medium text-slate-900">
                    {selectedPart.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                    <span>Part Number {selectedPart.part_number || "—"}</span>
                    <span>Revision {selectedPart.revision || "—"}</span>
                    <span>Status {selectedPart.status || "—"}</span>
                    <span>
                      Updated{" "}
                      {formatDateTime(
                        selectedPart.updated_at || selectedPart.created_at
                      )}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/dashboard/parts/${selectedPart.id}`}
                  className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-white"
                >
                  Open part revision
                </Link>
              </div>
            </div>

            {canRequest ? (
              <ServiceRequestActions
                partId={selectedPart.id}
                canRequest={canRequest}
                availableFiles={((selectedPartFiles as PartFileRow[] | null) ?? []).map(
                  (file) => ({
                    id: file.id,
                    fileName: file.file_name,
                    assetCategory: file.asset_category,
                    fileType: file.file_type,
                  })
                )}
              />
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                You can view service requests, but only engineers and admins can
                create new ones.
              </div>
            )}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            Select a part revision above to start a manufacturing, CAD, or
            optimization request from the vault.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Request queue
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Review current service requests across the organization.
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-4">
          <input type="hidden" name="part" value={selectedPartId} />

          <div className="md:col-span-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Search
            </label>
            <input
              type="text"
              name="q"
              defaultValue={queryText}
              placeholder="Search by request title or notes"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Status
            </label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All statuses</option>
              {SERVICE_REQUEST_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {getServiceRequestStatusLabel(status)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              name="type"
              defaultValue={typeFilter}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All types</option>
              {SERVICE_REQUEST_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getServiceRequestTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Scope
            </label>
            <select
              name="mine"
              defaultValue={mineFilter ? "true" : ""}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
            >
              <option value="">All requests</option>
              <option value="true">Requested by me</option>
            </select>
          </div>

          <div className="flex items-end gap-3">
            <button
              type="submit"
              className="inline-flex rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Apply
            </button>

            <Link
              href={selectedPartId ? `/dashboard/requests?part=${selectedPartId}` : "/dashboard/requests"}
              className="inline-flex rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Clear
            </Link>
          </div>
        </form>

        {error ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Failed to load requests.
          </div>
        ) : requestRows.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
            No requests found for the current filters.
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {requestRows.map((request) => {
              const part = Array.isArray(request.parts)
                ? request.parts[0]
                : request.parts;

              const attachmentCount = Array.isArray(request.service_request_files)
                ? request.service_request_files.length
                : 0;

              const statusKey =
                request.status as keyof typeof STATUS_BADGE_CLASSES;

              const requestTypeLabel = getServiceRequestTypeLabel(
                request.request_type as
                  | "manufacture_part"
                  | "cad_creation"
                  | "optimization"
              );

              return (
                <Link
                  key={request.id}
                  href={`/dashboard/requests/${request.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {request.title || requestTypeLabel}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            STATUS_BADGE_CLASSES[statusKey] ??
                            "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {getServiceRequestStatusLabel(
                            request.status as
                              | "submitted"
                              | "in_review"
                              | "awaiting_customer"
                              | "approved"
                              | "in_progress"
                              | "completed"
                              | "rejected"
                              | "cancelled"
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {requestTypeLabel}
                        </span>

                        {request.request_type === "manufacture_part" ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            {getManufacturingTypeLabel(
                              request.manufacturing_type
                            )}
                          </span>
                        ) : null}

                        <span
                          className={`rounded-full px-2.5 py-1 font-medium ${getPriorityBadgeClass(
                            request.priority
                          )}`}
                        >
                          {request.priority
                            ? getPriorityLabel(
                                request.priority as
                                  | "low"
                                  | "normal"
                                  | "high"
                                  | "urgent"
                              )
                            : "No priority"}
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {attachmentCount} attached
                        </span>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {getSourceReferenceLabel(
                            request.source_reference_type
                          )}
                        </span>

                        {request.due_date ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1">
                            Due {formatDate(request.due_date)}
                          </span>
                        ) : null}
                      </div>

                      {part ? (
                        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700">
                          <div className="font-medium text-slate-900">
                            {part.name}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                            <span>Part Number {part.part_number || "—"}</span>
                            <span>Revision {part.revision || "—"}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
                          No linked part revision
                        </div>
                      )}

                      {request.notes ? (
                        <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                          {request.notes}
                        </p>
                      ) : null}
                    </div>

                    <div className="shrink-0 text-xs text-slate-500 lg:text-right">
                      <div>Created {formatDate(request.created_at)}</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
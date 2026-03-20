import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_BADGE_CLASSES,
  getManufacturingTypeLabel,
  getPriorityLabel,
  getServiceRequestStatusLabel,
  getServiceRequestTypeLabel,
} from "@/lib/service-requests";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default async function RequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  const organizationIds = memberships?.map((m) => m.organization_id) ?? [];

  if (organizationIds.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
        <p className="text-sm text-slate-600">You are not a member of any organization.</p>
      </div>
    );
  }

  const { data: requests, error } = await supabase
    .from("service_requests")
    .select(
      `
      id,
      title,
      request_type,
      status,
      priority,
      manufacturing_type,
      created_at,
      due_date,
      parts (
        id,
        name,
        part_number
      )
    `
    )
    .in("organization_id", organizationIds)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Requests</h1>
        <p className="mt-2 text-sm text-slate-600">
          View and track manufacturing, CAD, and optimization requests across your organization.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load requests.
        </div>
      ) : !requests || requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-sm text-slate-600">
          No requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const part = Array.isArray(request.parts) ? request.parts[0] : request.parts;

            return (
              <Link
                key={request.id}
                href={`/dashboard/requests/${request.id}`}
                className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">
                        {request.title || getServiceRequestTypeLabel(request.request_type)}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_BADGE_CLASSES[
  request.status as keyof typeof STATUS_BADGE_CLASSES
] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {getServiceRequestStatusLabel(request.status)}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {getServiceRequestTypeLabel(request.request_type)}
                      </span>

                      {request.request_type === "manufacture_part" ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          {getManufacturingTypeLabel(request.manufacturing_type)}
                        </span>
                      ) : null}

                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {getPriorityLabel(request.priority)}
                      </span>

                      {request.due_date ? (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">
                          Due {formatDate(request.due_date)}
                        </span>
                      ) : null}
                    </div>

                    {part ? (
                      <div className="mt-3 text-sm text-slate-600">
                        Part: {part.name}
                        {part.part_number ? ` · ${part.part_number}` : ""}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-500 md:text-right">
                    Created {formatDate(request.created_at)}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
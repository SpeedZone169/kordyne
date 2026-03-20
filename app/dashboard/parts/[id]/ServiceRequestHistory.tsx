import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_BADGE_CLASSES,
  getManufacturingTypeLabel,
  getPriorityLabel,
  getServiceRequestStatusLabel,
  getServiceRequestTypeLabel,
} from "@/lib/service-requests";

type Props = {
  partId: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

export default async function ServiceRequestHistory({ partId }: Props) {
  const supabase = await createClient();

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
      quantity,
      due_date,
      created_at,
      updated_at
    `
    )
    .eq("part_id", partId)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-full">
        <h3 className="text-lg font-semibold text-gray-900">Request history</h3>
        <p className="mt-3 text-sm text-red-600">Failed to load requests.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm h-full">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Request history</h3>
        <p className="mt-2 text-sm text-gray-600">
          Requests linked to this part and their current status.
        </p>
      </div>

      {!requests || requests.length === 0 ? (
        <div className="mt-5 rounded-xl border border-dashed border-gray-300 p-6 text-sm text-gray-600">
          No service requests have been created for this part yet.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/dashboard/requests/${request.id}`}
              className="block rounded-2xl border border-gray-200 p-4 transition hover:border-gray-300 hover:bg-gray-50"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-medium text-gray-900">
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

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                    <span className="rounded-full bg-gray-100 px-2.5 py-1">
                      {getServiceRequestTypeLabel(request.request_type)}
                    </span>

                    {request.request_type === "manufacture_part" ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1">
                        {getManufacturingTypeLabel(request.manufacturing_type)}
                      </span>
                    ) : null}

                    <span className="rounded-full bg-gray-100 px-2.5 py-1">
                      {getPriorityLabel(request.priority)}
                    </span>

                    {request.quantity ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1">
                        Qty {request.quantity}
                      </span>
                    ) : null}

                    {request.due_date ? (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1">
                        Due {formatDate(request.due_date)}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-sm text-gray-500 md:text-right">
                  <div>Created {formatDate(request.created_at)}</div>
                  <div className="mt-1">Updated {formatDate(request.updated_at)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
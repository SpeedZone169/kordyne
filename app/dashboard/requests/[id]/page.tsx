import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STATUS_BADGE_CLASSES,
  getManufacturingTypeLabel,
  getPriorityLabel,
  getServiceRequestStatusLabel,
  getServiceRequestTypeLabel,
} from "@/lib/service-requests";

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 md:grid-cols-[180px_1fr]">
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="text-sm text-slate-900">{value || "—"}</div>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: request, error } = await supabase
    .from("service_requests")
    .select(
      `
      id,
      organization_id,
      title,
      request_type,
      status,
      priority,
      notes,
      due_date,
      quantity,
      target_process,
      target_material,
      manufacturing_type,
      cad_output_type,
      optimization_goal,
      source_reference_type,
      quote_model,
      quote_notes,
      quoted_price_cents,
      quoted_currency,
      quoted_credit_amount,
      created_at,
      updated_at,
      approved_at,
      completed_at,
      parts (
        id,
        name,
        part_number,
        revision
      )
    `
    )
    .eq("id", params.id)
    .single();

  if (error || !request) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", request.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const part = Array.isArray(request.parts) ? request.parts[0] : request.parts;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard/requests"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Back to requests
          </Link>

          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            {request.title || getServiceRequestTypeLabel(request.request_type)}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                STATUS_BADGE_CLASSES[
  request.status as keyof typeof STATUS_BADGE_CLASSES
] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {getServiceRequestStatusLabel(request.status)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {getServiceRequestTypeLabel(request.request_type)}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {getPriorityLabel(request.priority)}
            </span>
            {request.request_type === "manufacture_part" ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {getManufacturingTypeLabel(request.manufacturing_type)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Request details</h2>

        <div className="mt-5 space-y-4">
          <DetailRow
            label="Part"
            value={
              part ? (
                <Link
                  href={`/dashboard/parts/${part.id}`}
                  className="text-slate-900 underline underline-offset-2"
                >
                  {part.name}
                  {part.part_number ? ` · ${part.part_number}` : ""}
                  {part.revision ? ` · Rev ${part.revision}` : ""}
                </Link>
              ) : (
                "—"
              )
            }
          />

          <DetailRow label="Created" value={formatDateTime(request.created_at)} />
          <DetailRow label="Last updated" value={formatDateTime(request.updated_at)} />
          <DetailRow label="Due date" value={request.due_date || "—"} />
          <DetailRow label="Quantity" value={request.quantity?.toString() || "—"} />
          <DetailRow label="Target process" value={request.target_process || "—"} />
          <DetailRow label="Target material" value={request.target_material || "—"} />
          <DetailRow label="Source reference" value={request.source_reference_type || "—"} />
          <DetailRow
            label="CAD output type"
            value={request.cad_output_type ? request.cad_output_type.toUpperCase() : "—"}
          />
          <DetailRow
            label="Optimization goal"
            value={request.optimization_goal || "—"}
          />
          <DetailRow label="Notes" value={request.notes || "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Commercial summary</h2>

        <div className="mt-5 space-y-4">
          <DetailRow label="Quote model" value={request.quote_model || "none"} />
          <DetailRow
            label="Quoted price"
            value={
              request.quoted_price_cents != null
                ? `${(request.quoted_price_cents / 100).toFixed(2)} ${request.quoted_currency || ""}`.trim()
                : "—"
            }
          />
          <DetailRow
            label="Quoted credits"
            value={request.quoted_credit_amount?.toString() || "—"}
          />
          <DetailRow label="Quote notes" value={request.quote_notes || "—"} />
          <DetailRow label="Approved at" value={formatDateTime(request.approved_at)} />
          <DetailRow label="Completed at" value={formatDateTime(request.completed_at)} />
        </div>
      </section>
    </div>
  );
}
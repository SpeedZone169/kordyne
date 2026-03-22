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
import type { ReactNode } from "react";

type RequestDetailPageProps = {
  params: Promise<{ id: string }>;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status?: string | null;
};

type RequesterProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
};

type AttachedPartFileRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  asset_category: string | null;
  storage_path: string;
  created_at: string;
};

type ServiceRequestFileRow = {
  id: string;
  is_primary: boolean | null;
  created_at: string;
  part_files: AttachedPartFileRow | AttachedPartFileRow[] | null;
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
  quantity: number | null;
  target_process: string | null;
  target_material: string | null;
  manufacturing_type: string | null;
  cad_output_type: string | null;
  optimization_goal: string | null;
  source_reference_type: string | null;
  quote_model: string | null;
  quote_notes: string | null;
  quoted_price_cents: number | null;
  quoted_currency: string | null;
  quoted_credit_amount: number | null;
  created_at: string;
  updated_at: string | null;
  approved_at: string | null;
  completed_at: string | null;
  parts: PartRow | PartRow[] | null;
  service_request_files: ServiceRequestFileRow[] | null;
};

type AttachmentViewModel = {
  requestAttachmentId: string;
  isPrimary: boolean;
  attachedAt: string;
  file: AttachedPartFileRow;
  signedUrl: string | null;
};

const FILE_CATEGORY_LABELS: Record<string, string> = {
  cad_3d: "CAD 3D",
  drawing_2d: "2D Drawings",
  image: "Images",
  manufacturing_doc: "Manufacturing Docs",
  quality_doc: "Quality Docs",
  other: "Other",
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

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDisplayName(profile: RequesterProfileRow | null | undefined) {
  if (!profile) return "—";
  return profile.full_name || profile.email || "—";
}

function getAssetCategoryLabel(value: string | null) {
  if (!value) return "Other";
  return FILE_CATEGORY_LABELS[value] || "Other";
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="grid gap-1 md:grid-cols-[180px_1fr]">
      <div className="text-sm font-medium text-slate-600">{label}</div>
      <div className="text-sm text-slate-900">{value || "—"}</div>
    </div>
  );
}

export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { id } = await params;
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
      part_id,
      requested_by_user_id,
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
        revision,
        status
      ),
      service_request_files (
        id,
        is_primary,
        created_at,
        part_files (
          id,
          file_name,
          file_type,
          file_size_bytes,
          asset_category,
          storage_path,
          created_at
        )
      )
    `
    )
    .eq("id", id)
    .single();

  if (error || !request) {
    notFound();
  }

  const typedRequest = request as ServiceRequestRow;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", typedRequest.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    notFound();
  }

  const { data: requesterProfile } = await supabase
    .from("profiles")
    .select("user_id, full_name, email")
    .eq("user_id", typedRequest.requested_by_user_id)
    .maybeSingle();

  const part = Array.isArray(typedRequest.parts)
    ? typedRequest.parts[0]
    : typedRequest.parts;

  const rawAttachments = Array.isArray(typedRequest.service_request_files)
    ? typedRequest.service_request_files
    : [];

  const attachments: AttachmentViewModel[] = (
    await Promise.all(
      rawAttachments.map(async (attachment) => {
        const partFile = Array.isArray(attachment.part_files)
          ? attachment.part_files[0]
          : attachment.part_files;

        if (!partFile) {
          return null;
        }

        const { data } = await supabase.storage
          .from("part-files")
          .createSignedUrl(partFile.storage_path, 60 * 10, {
            download: partFile.file_name,
          });

        return {
          requestAttachmentId: attachment.id,
          isPrimary: Boolean(attachment.is_primary),
          attachedAt: attachment.created_at,
          file: partFile,
          signedUrl: data?.signedUrl || null,
        };
      })
    )
  ).filter(Boolean) as AttachmentViewModel[];

  const statusKey =
    typedRequest.status as keyof typeof STATUS_BADGE_CLASSES;

  const requestTypeLabel = getServiceRequestTypeLabel(
    typedRequest.request_type as
      | "manufacture_part"
      | "cad_creation"
      | "optimization"
  );

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
            {typedRequest.title || requestTypeLabel}
          </h1>

          <div className="mt-3 flex flex-wrap gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                STATUS_BADGE_CLASSES[statusKey] ?? "bg-slate-100 text-slate-700"
              }`}
            >
              {getServiceRequestStatusLabel(
                typedRequest.status as
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

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {requestTypeLabel}
            </span>

            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {typedRequest.priority
                ? getPriorityLabel(
                    typedRequest.priority as
                      | "low"
                      | "normal"
                      | "high"
                      | "urgent"
                  )
                : "No priority"}
            </span>

            {typedRequest.request_type === "manufacture_part" ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                {getManufacturingTypeLabel(typedRequest.manufacturing_type)}
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

          <DetailRow
            label="Requested by"
            value={getDisplayName(requesterProfile as RequesterProfileRow | null)}
          />

          <DetailRow label="Created" value={formatDateTime(typedRequest.created_at)} />
          <DetailRow
            label="Last updated"
            value={formatDateTime(typedRequest.updated_at)}
          />
          <DetailRow label="Due date" value={formatDate(typedRequest.due_date)} />
          <DetailRow
            label="Quantity"
            value={typedRequest.quantity?.toString() || "—"}
          />
          <DetailRow
            label="Target process"
            value={typedRequest.target_process || "—"}
          />
          <DetailRow
            label="Target material"
            value={typedRequest.target_material || "—"}
          />
          <DetailRow
            label="Source reference"
            value={typedRequest.source_reference_type || "—"}
          />
          <DetailRow
            label="CAD output type"
            value={
              typedRequest.cad_output_type
                ? typedRequest.cad_output_type.toUpperCase()
                : "—"
            }
          />
          <DetailRow
            label="Optimization goal"
            value={typedRequest.optimization_goal || "—"}
          />
          <DetailRow label="Notes" value={typedRequest.notes || "—"} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Attached request files
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              These files were explicitly attached to this request. This keeps
              request context controlled and separate from any later provider
              sharing workflow.
            </p>
          </div>

          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {attachments.length} attached
          </div>
        </div>

        {attachments.length > 0 ? (
          <div className="mt-5 space-y-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.requestAttachmentId}
                className="flex flex-col gap-4 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-slate-900">
                      {attachment.file.file_name}
                    </p>

                    {attachment.isPrimary ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
                        Primary
                      </span>
                    ) : null}

                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                      {getAssetCategoryLabel(attachment.file.asset_category)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span>{attachment.file.file_type || "unknown type"}</span>
                    <span>{formatBytes(attachment.file.file_size_bytes)}</span>
                    <span>
                      Attached {formatDateTime(attachment.attachedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {attachment.signedUrl ? (
                    <Link
                      href={attachment.signedUrl}
                      className="inline-flex rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Download
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">
                      Download unavailable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
            No files were explicitly attached to this request.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Commercial summary
        </h2>

        <div className="mt-5 space-y-4">
          <DetailRow label="Quote model" value={typedRequest.quote_model || "none"} />
          <DetailRow
            label="Quoted price"
            value={
              typedRequest.quoted_price_cents != null
                ? `${(typedRequest.quoted_price_cents / 100).toFixed(2)} ${
                    typedRequest.quoted_currency || ""
                  }`.trim()
                : "—"
            }
          />
          <DetailRow
            label="Quoted credits"
            value={typedRequest.quoted_credit_amount?.toString() || "—"}
          />
          <DetailRow
            label="Quote notes"
            value={typedRequest.quote_notes || "—"}
          />
          <DetailRow
            label="Approved at"
            value={formatDateTime(typedRequest.approved_at)}
          />
          <DetailRow
            label="Completed at"
            value={formatDateTime(typedRequest.completed_at)}
          />
        </div>
      </section>
    </div>
  );
}
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type RequestRow = {
  id: string;
  organization_id: string;
  part_id: string | null;
  requested_by_user_id: string;
  request_type: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  title: string | null;
  priority: string;
  due_date: string | null;
  quantity: number | null;
  target_process: string | null;
  target_material: string | null;
  manufacturing_type: string | null;
  cad_output_type: string | null;
  optimization_goal: string | null;
  source_reference_type: string;
  quote_model: string;
  request_origin: string;
  requested_item_name: string | null;
  requested_item_reference: string | null;
  linked_to_part_at: string | null;
};

type QuoteRoundRow = {
  id: string;
  service_request_id: string;
  round_number: number;
  mode: string;
  status: string;
  response_deadline: string | null;
  target_due_date: string | null;
  requested_quantity: number | null;
  currency_code: string;
  customer_notes: string | null;
  selected_provider_package_id: string | null;
  published_at: string | null;
  awarded_at: string | null;
  closed_at: string | null;
  created_at: string;
};

type OrganizationRow = {
  id: string;
  name: string;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default async function AdminRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePlatformOwner();
  const { id } = await params;

  const supabase = createAdminClient();

  const [
    { data: request, error: requestError },
    { data: organizations, error: organizationsError },
    { data: quoteRounds, error: quoteRoundsError },
  ] = await Promise.all([
    supabase
      .from("service_requests")
      .select(
        `
          id,
          organization_id,
          part_id,
          requested_by_user_id,
          request_type,
          status,
          notes,
          created_at,
          updated_at,
          title,
          priority,
          due_date,
          quantity,
          target_process,
          target_material,
          manufacturing_type,
          cad_output_type,
          optimization_goal,
          source_reference_type,
          quote_model,
          request_origin,
          requested_item_name,
          requested_item_reference,
          linked_to_part_at
        `
      )
      .eq("id", id)
      .maybeSingle(),
    supabase.from("organizations").select("id, name"),
    supabase
      .from("provider_quote_rounds")
      .select(
        `
          id,
          service_request_id,
          round_number,
          mode,
          status,
          response_deadline,
          target_due_date,
          requested_quantity,
          currency_code,
          customer_notes,
          selected_provider_package_id,
          published_at,
          awarded_at,
          closed_at,
          created_at
        `
      )
      .eq("service_request_id", id)
      .order("round_number", { ascending: false }),
  ]);

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (quoteRoundsError) {
    throw new Error(quoteRoundsError.message);
  }

  if (!request) {
    throw new Error("Request not found");
  }

  const orgMap = new Map<string, string>();
  for (const org of (organizations ?? []) as OrganizationRow[]) {
    orgMap.set(org.id, org.name);
  }

  const requestRow = request as RequestRow;
  const rounds = (quoteRounds ?? []) as QuoteRoundRow[];

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="border-b border-zinc-200 px-8 py-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Request detail
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
            {requestRow.title || requestRow.requested_item_name || "Untitled request"}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Internal oversight page for request lifecycle, provider routing,
            quote round state, and later award and settlement controls.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href={`/dashboard/requests/${requestRow.id}`}
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open customer request page
            </Link>
            <Link
              href={`/dashboard/requests/${requestRow.id}/providers`}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Provider routing
            </Link>
            <Link
              href={`/dashboard/requests/${requestRow.id}/quotes`}
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Quote comparison
            </Link>
          </div>
        </div>

        <div className="grid gap-8 px-8 py-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Request summary
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p>
                  Organization:{" "}
                  {orgMap.get(requestRow.organization_id) ?? requestRow.organization_id}
                </p>
                <p>Status: {requestRow.status}</p>
                <p>Priority: {requestRow.priority}</p>
                <p>Request type: {requestRow.request_type}</p>
                <p>Origin: {requestRow.request_origin}</p>
                <p>Due date: {formatDate(requestRow.due_date)}</p>
                <p>Quantity: {requestRow.quantity ?? "—"}</p>
                <p>Part id: {requestRow.part_id || "—"}</p>
                <p>Linked to part at: {formatDateTime(requestRow.linked_to_part_at)}</p>
                <p>Source reference type: {requestRow.source_reference_type}</p>
                <p>Quote model: {requestRow.quote_model}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Manufacturing details
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p>Manufacturing type: {requestRow.manufacturing_type || "—"}</p>
                <p>Target process: {requestRow.target_process || "—"}</p>
                <p>Target material: {requestRow.target_material || "—"}</p>
                <p>CAD output type: {requestRow.cad_output_type || "—"}</p>
                <p>Optimization goal: {requestRow.optimization_goal || "—"}</p>
                <p>Requested item name: {requestRow.requested_item_name || "—"}</p>
                <p>
                  Requested item reference:{" "}
                  {requestRow.requested_item_reference || "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Notes
              </p>
              <p className="mt-4 text-sm leading-6 text-slate-600">
                {requestRow.notes || "No notes on this request."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Lifecycle
              </p>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <p>Created: {formatDateTime(requestRow.created_at)}</p>
                <p>Updated: {formatDateTime(requestRow.updated_at)}</p>
                <p>Requested by user: {requestRow.requested_by_user_id}</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-zinc-200 bg-[#fafaf9] p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Quote rounds
              </p>

              {rounds.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {rounds.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-[24px] border border-zinc-200 bg-white p-4"
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        Round {round.round_number}
                      </p>
                      <div className="mt-3 grid gap-2 text-sm text-slate-600">
                        <p>Mode: {round.mode}</p>
                        <p>Status: {round.status}</p>
                        <p>Response deadline: {formatDateTime(round.response_deadline)}</p>
                        <p>Target due date: {formatDate(round.target_due_date)}</p>
                        <p>Requested quantity: {round.requested_quantity ?? "—"}</p>
                        <p>Currency: {round.currency_code}</p>
                        <p>Published: {formatDateTime(round.published_at)}</p>
                        <p>Awarded: {formatDateTime(round.awarded_at)}</p>
                        <p>Closed: {formatDateTime(round.closed_at)}</p>
                        <p>
                          Selected provider package:{" "}
                          {round.selected_provider_package_id || "—"}
                        </p>
                      </div>

                      {round.customer_notes ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {round.customer_notes}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">
                  No provider quote rounds yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
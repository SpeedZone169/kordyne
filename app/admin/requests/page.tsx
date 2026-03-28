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
  source_reference_type: string;
  quote_model: string;
  request_origin: string;
  requested_item_name: string | null;
  requested_item_reference: string | null;
};

type QuoteRoundRow = {
  id: string;
  service_request_id: string;
  round_number: number;
  mode: string;
  status: string;
  target_due_date: string | null;
  requested_quantity: number | null;
  selected_provider_package_id: string | null;
  created_at: string;
  awarded_at: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

function formatDate(value: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    origin?: string;
    routing?: string;
  }>;
}) {
  await requirePlatformOwner();
  const { q = "", status = "all", origin = "all", routing = "all" } =
    await searchParams;

  const supabase = createAdminClient();

  const [
    { data: requests, error: requestsError },
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
          source_reference_type,
          quote_model,
          request_origin,
          requested_item_name,
          requested_item_reference
        `
      )
      .order("created_at", { ascending: false })
      .limit(250),
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
          target_due_date,
          requested_quantity,
          selected_provider_package_id,
          created_at,
          awarded_at
        `
      )
      .order("created_at", { ascending: false }),
  ]);

  if (requestsError) {
    throw new Error(requestsError.message);
  }

  if (organizationsError) {
    throw new Error(organizationsError.message);
  }

  if (quoteRoundsError) {
    throw new Error(quoteRoundsError.message);
  }

  const orgMap = new Map<string, string>();
  for (const org of (organizations ?? []) as OrganizationRow[]) {
    orgMap.set(org.id, org.name);
  }

  const latestRoundByRequestId = new Map<string, QuoteRoundRow>();
  for (const round of (quoteRounds ?? []) as QuoteRoundRow[]) {
    if (!latestRoundByRequestId.has(round.service_request_id)) {
      latestRoundByRequestId.set(round.service_request_id, round);
    }
  }

  const baseRows = ((requests ?? []) as RequestRow[]).map((request) => {
    const latestRound = latestRoundByRequestId.get(request.id);

    return {
      ...request,
      organization_name:
        orgMap.get(request.organization_id) ?? request.organization_id,
      latest_round: latestRound ?? null,
    };
  });

  const normalizedQ = q.trim().toLowerCase();

  const rows = baseRows.filter((row) => {
    const matchesQ =
      !normalizedQ ||
      [
        row.title,
        row.requested_item_name,
        row.requested_item_reference,
        row.notes,
        row.organization_name,
        row.request_type,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQ));

    const matchesStatus = status === "all" || row.status === status;
    const matchesOrigin = origin === "all" || row.request_origin === origin;

    const hasRound = !!row.latest_round;
    const isAwarded = !!row.latest_round?.awarded_at;

    const matchesRouting =
      routing === "all" ||
      (routing === "unrouted" && !hasRound) ||
      (routing === "routed" && hasRound) ||
      (routing === "awarded" && isAwarded);

    return matchesQ && matchesStatus && matchesOrigin && matchesRouting;
  });

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Requests
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Request management
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Search and filter service requests across Kordyne, review routing state,
          and open the internal oversight page for any request.
        </p>

        <form className="mt-6 grid gap-4 lg:grid-cols-[1.5fr_180px_180px_180px_auto]">
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search title, org, notes, request type..."
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All statuses</option>
            <option value="submitted">submitted</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="completed">completed</option>
            <option value="cancelled">cancelled</option>
          </select>

          <select
            name="origin"
            defaultValue={origin}
            className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All origins</option>
            <option value="vault">vault</option>
            <option value="standalone">standalone</option>
          </select>

          <select
            name="routing"
            defaultValue={routing}
            className="rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All routing</option>
            <option value="unrouted">unrouted</option>
            <option value="routed">routed</option>
            <option value="awarded">awarded</option>
          </select>

          <button
            type="submit"
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Apply
          </button>
        </form>

        <div className="mt-5 text-sm text-slate-500">
          Showing {rows.length} request{rows.length === 1 ? "" : "s"}.
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white">
        <div className="divide-y divide-zinc-200">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid gap-6 px-8 py-6 lg:grid-cols-[1.3fr_1fr_260px]"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Request
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-950">
                  {row.title || row.requested_item_name || "Untitled request"}
                </h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                    Status: {row.status}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                    Origin: {row.request_origin}
                  </span>
                  <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
                    Priority: {row.priority}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600">
                  <p>Organization: {row.organization_name}</p>
                  <p>Type: {row.request_type}</p>
                  <p>Due date: {formatDate(row.due_date)}</p>
                  <p>Quantity: {row.quantity ?? "—"}</p>
                  <p>Manufacturing type: {row.manufacturing_type || "—"}</p>
                  <p>Target process: {row.target_process || "—"}</p>
                  <p>Target material: {row.target_material || "—"}</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Routing
                </p>
                {row.latest_round ? (
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <p>Round: {row.latest_round.round_number}</p>
                    <p>Mode: {row.latest_round.mode}</p>
                    <p>Status: {row.latest_round.status}</p>
                    <p>
                      Target due date:{" "}
                      {formatDate(row.latest_round.target_due_date)}
                    </p>
                    <p>
                      Awarded: {row.latest_round.awarded_at ? "Yes" : "No"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No provider quote round yet.
                  </p>
                )}

                {row.notes ? (
                  <div className="mt-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Notes
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {row.notes}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-3">
                <Link
                  href={`/admin/requests/${row.id}`}
                  className="inline-flex rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Open request
                </Link>

                <Link
                  href={`/dashboard/requests/${row.id}`}
                  className="inline-flex rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
                >
                  Customer page
                </Link>

                <div className="pt-2 text-xs text-slate-400">
                  <p>Created: {formatDate(row.created_at)}</p>
                  <p className="mt-1 break-all">{row.id}</p>
                </div>
              </div>
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="px-8 py-10 text-sm text-slate-500">
              No requests found for the current filters.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
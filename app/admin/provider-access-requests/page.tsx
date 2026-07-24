import Link from "next/link";

import { requirePlatformOwner } from "@/lib/auth/platform-owner";
import { createAdminClient } from "@/lib/supabase/admin";

type ProviderAccessRequestRow = {
  id: string;
  full_name: string;
  email: string;
  company: string;
  country: string;
  capabilities: string;
  status: "pending" | "approved" | "rejected";
  notification_sent_at: string | null;
  notification_error: string | null;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClass(status: ProviderAccessRequestRow["status"]) {
  if (status === "approved") {
    return "bg-emerald-100 text-emerald-800";
  }

  if (status === "rejected") {
    return "bg-red-100 text-red-800";
  }

  return "bg-amber-100 text-amber-800";
}

export default async function ProviderAccessRequestsPage() {
  await requirePlatformOwner("/admin/provider-access-requests");

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("provider_access_requests")
    .select(
      "id, full_name, email, company, country, capabilities, status, notification_sent_at, notification_error, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data ?? []) as ProviderAccessRequestRow[];
  const pendingCount = requests.filter(
    (request) => request.status === "pending",
  ).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 rounded-[24px] border border-zinc-200 bg-white p-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">
            Provider onboarding
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Provider access requests
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Review each submission before creating a provider organization or
            sending an invitation. Submission records remain here for
            traceability after a decision.
          </p>
        </div>
        <div className="w-fit rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-900">
          {pendingCount} pending
        </div>
      </div>

      {requests.length ? (
        <div className="overflow-hidden rounded-[24px] border border-zinc-200 bg-white">
          <div className="divide-y divide-zinc-200">
            {requests.map((request) => (
              <article
                key={request.id}
                className="grid gap-5 p-6 transition hover:bg-slate-50 lg:grid-cols-[1.1fr_1fr_auto] lg:items-center"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg font-semibold text-slate-950">
                      {request.company}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusClass(request.status)}`}
                    >
                      {request.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {request.full_name} · {request.email}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {request.country} · Received {formatDate(request.created_at)}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Capabilities
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-700">
                    {request.capabilities}
                  </p>
                  <p
                    className={`mt-2 text-xs ${
                      request.notification_error
                        ? "text-red-700"
                        : "text-slate-500"
                    }`}
                  >
                    {request.notification_sent_at
                      ? "Review email delivered"
                      : request.notification_error || "Review email not sent"}
                  </p>
                </div>

                <Link
                  href={`/review/provider-access/${request.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[#003040] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#00485c]"
                >
                  {request.status === "pending" ? "Review request" : "View record"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
          <h3 className="text-lg font-semibold text-slate-950">
            No provider access requests yet
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            New provider submissions will appear here after they pass the
            public form security checks.
          </p>
        </div>
      )}
    </section>
  );
}

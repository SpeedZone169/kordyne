import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireProviderUser } from "@/lib/auth/provider-access";
import {
  getProviderPackageStatusLabel,
  providerPackageStatusTones,
  type ProviderPackageStatus,
} from "@/lib/providers";

function toneClasses(
  tone: "neutral" | "info" | "success" | "warning" | "danger",
) {
  switch (tone) {
    case "info":
      return "bg-sky-100 text-sky-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "danger":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(date);
}

export default async function ProviderHomePage() {
  const context = await requireProviderUser();
  const supabase = await createClient();

  const { data: packages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        package_title,
        package_status,
        target_due_date,
        published_at,
        customer_org_id,
        created_at
      `,
    )
    .in("provider_org_id", context.providerOrgIds)
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(8);

  if (packagesError) {
    throw new Error(packagesError.message);
  }

  const customerOrgIds = [
    ...new Set((packages ?? []).map((pkg) => pkg.customer_org_id)),
  ];

  let customerNamesById = new Map<string, string>();

  if (customerOrgIds.length > 0) {
    const { data: orgs, error: orgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", customerOrgIds);

    if (orgsError) {
      throw new Error(orgsError.message);
    }

    customerNamesById = new Map((orgs ?? []).map((org) => [org.id, org.name]));
  }

  const rows =
    packages?.map((row) => ({
      ...row,
      package_status: row.package_status as ProviderPackageStatus,
    })) ?? [];

  const awaitingResponseCount = rows.filter((row) =>
    ["published", "viewed", "awaiting_provider_response"].includes(
      row.package_status,
    ),
  ).length;

  const awardedCount = rows.filter((row) => row.package_status === "awarded")
    .length;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
              Provider portal
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
              Manage incoming manufacturing opportunities in one secure workspace
            </h1>
            <p className="text-base text-slate-600">
              Review customer packages, prepare commercial responses, and track
              awarded work from a provider-specific Kordyne surface.
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3 rounded-2xl bg-slate-50 p-4 text-sm">
            <div>
              <div className="text-slate-500">Published packages</div>
              <div className="font-medium text-slate-900">{rows.length}</div>
            </div>
            <div>
              <div className="text-slate-500">Awaiting response</div>
              <div className="font-medium text-slate-900">
                {awaitingResponseCount}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Awarded</div>
              <div className="font-medium text-slate-900">{awardedCount}</div>
            </div>
            <div>
              <div className="text-slate-500">Provider orgs</div>
              <div className="font-medium text-slate-900">
                {context.providerOrgIds.length}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/provider/requests"
            className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Open request inbox
          </Link>
          <Link
            href="/provider/requests"
            className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Review active packages
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Recent customer packages
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                The latest request packages published to your provider
                organization.
              </p>
            </div>

            <Link
              href="/provider/requests"
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              View all
            </Link>
          </div>

          {rows.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-600">
              No published packages yet.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-slate-200 p-4"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">
                          {row.package_title || "Provider package"}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${toneClasses(
                            providerPackageStatusTones[row.package_status],
                          )}`}
                        >
                          {getProviderPackageStatusLabel(row.package_status)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        Customer:{" "}
                        {customerNamesById.get(row.customer_org_id) ??
                          "Unknown customer"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm md:min-w-[260px]">
                      <div>
                        <div className="text-slate-500">Due date</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDate(row.target_due_date)}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500">Published</div>
                        <div className="mt-1 font-medium text-slate-900">
                          {formatDate(row.published_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link
                      href={`/provider/requests/${row.id}`}
                      className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Open package
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Why providers use this portal
          </h2>
          <div className="mt-4 space-y-4 text-sm text-slate-600">
            <p>
              Review only the files and requirements explicitly shared with your
              organization.
            </p>
            <p>
              Prepare quote responses in a structured workspace instead of
              fragmented email chains.
            </p>
            <p>
              Keep incoming work, future scheduling, and customer collaboration
              in one provider-specific surface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
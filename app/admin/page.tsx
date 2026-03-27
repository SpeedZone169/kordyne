import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

type MetricCard = {
  label: string;
  value: number | null;
  href: string;
  helper: string;
};

async function getCount(
  table: string,
  options?: { column?: string; filter?: { column: string; value: string } }
) {
  const supabase = createAdminClient();

  let query = supabase.from(table).select(options?.column || "*", {
    count: "exact",
    head: true,
  });

  if (options?.filter) {
    query = query.eq(options.filter.column, options.filter.value);
  }

  const { count, error } = await query;

  if (error) {
    console.error(`Failed count for ${table}:`, error.message);
    return null;
  }

  return count ?? 0;
}

export default async function AdminOverviewPage() {
  await requirePlatformOwner();

  const [
    usersCount,
    organizationsCount,
    invitesCount,
    requestsCount,
    quoteRoundsCount,
    quotesCount,
    ownerCount,
  ] = await Promise.all([
    getCount("profiles"),
    getCount("organizations"),
    getCount("organization_invites"),
    getCount("service_requests"),
    getCount("provider_quote_rounds"),
    getCount("provider_quotes"),
    getCount("profiles", {
      filter: { column: "platform_role", value: "platform_owner" },
    }),
  ]);

  const metrics: MetricCard[] = [
    {
      label: "Users",
      value: usersCount,
      href: "/admin/users",
      helper: "All registered user profiles",
    },
    {
      label: "Organizations",
      value: organizationsCount,
      href: "/admin/organizations",
      helper: "Customer organizations on the platform",
    },
    {
      label: "Invites",
      value: invitesCount,
      href: "/admin/invites",
      helper: "Outstanding and historical invite records",
    },
    {
      label: "Requests",
      value: requestsCount,
      href: "/admin/stats",
      helper: "Total service requests created",
    },
    {
      label: "Quote rounds",
      value: quoteRoundsCount,
      href: "/admin/stats",
      helper: "Provider routing rounds created",
    },
    {
      label: "Quotes",
      value: quotesCount,
      href: "/admin/stats",
      helper: "Provider quote submissions",
    },
    {
      label: "Platform owners",
      value: ownerCount,
      href: "/admin/users",
      helper: "Global internal owner accounts",
    },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-slate-400">Overview</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Platform Owner Dashboard
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          This surface is separate from customer and provider workflows. Use it
          to monitor the platform, manage entities, and move into deeper admin
          tools over time.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Link
            key={metric.label}
            href={metric.href}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-slate-700 hover:bg-slate-800/80"
          >
            <p className="text-sm text-slate-400">{metric.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {metric.value ?? "—"}
            </p>
            <p className="mt-3 text-sm text-slate-300">{metric.helper}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Next admin modules</h2>
          <div className="mt-4 space-y-2 text-sm text-slate-300">
            <p>• organization management</p>
            <p>• provider management</p>
            <p>• user controls</p>
            <p>• invite controls</p>
            <p>• later relationships and disputes</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Security model</h2>
          <p className="mt-4 text-sm text-slate-300">
            Access is gated by <code>profiles.platform_role</code>. Platform
            owner is global and separate from customer/provider organization
            roles.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-lg font-semibold">Statistics</h2>
          <p className="mt-4 text-sm text-slate-300">
            Open the statistics page for the first platform-wide reporting
            scaffold.
          </p>
          <Link
            href="/admin/stats"
            className="mt-4 inline-flex rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-100 hover:bg-slate-800"
          >
            Open statistics
          </Link>
        </div>
      </section>
    </div>
  );
}
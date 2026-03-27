import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOwner } from "@/lib/auth/platform-owner";

async function getCount(
  table: string,
  options?: { filter?: { column: string; value: string } }
) {
  const supabase = createAdminClient();

  let query = supabase.from(table).select("*", {
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

export default async function AdminStatsPage() {
  await requirePlatformOwner();

  const [
    usersCount,
    organizationsCount,
    requestsCount,
    invitesCount,
    quoteRoundsCount,
    quotesCount,
    ownersCount,
  ] = await Promise.all([
    getCount("profiles"),
    getCount("organizations"),
    getCount("service_requests"),
    getCount("organization_invites"),
    getCount("provider_quote_rounds"),
    getCount("provider_quotes"),
    getCount("profiles", {
      filter: { column: "platform_role", value: "platform_owner" },
    }),
  ]);

  const stats = [
    { label: "Total users", value: usersCount },
    { label: "Total organizations", value: organizationsCount },
    { label: "Total requests", value: requestsCount },
    { label: "Total invites", value: invitesCount },
    { label: "Total quote rounds", value: quoteRoundsCount },
    { label: "Total quotes", value: quotesCount },
    { label: "Platform owners", value: ownersCount },
  ];

  return (
    <div className="space-y-8">
      <section>
        <p className="text-sm text-slate-400">Statistics</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          Platform Statistics
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-300">
          This is the first internal reporting scaffold using tables you already
          control. Visitor analytics and live session tracking can be added
          later with dedicated telemetry.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">
              {stat.value ?? "—"}
            </p>
          </div>
        ))}
      </section>
    </div>
  );
}
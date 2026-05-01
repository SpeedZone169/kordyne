import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase/server";
import Client from "./Client";

const SUPPORTED_PROFILE_PROVIDERS = [
  "fusion",
  "solidworks",
  "inventor",
  "onshape",
] as const;

type ProviderKey = (typeof SUPPORTED_PROFILE_PROVIDERS)[number];

const PROVIDER_META: Record<
  ProviderKey,
  {
    label: string;
    shortStatus: string;
  }
> = {
  fusion: {
    label: "Fusion",
    shortStatus: "Live",
  },
  inventor: {
    label: "Inventor",
    shortStatus: "Next",
  },
  solidworks: {
    label: "SolidWorks",
    shortStatus: "Planned",
  },
  onshape: {
    label: "Onshape",
    shortStatus: "Planned",
  },
};

function formatUtcDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function DesignConnectorsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    redirect("/dashboard");
  }

  const [
    organizationResult,
    connectorsResult,
    profilesResult,
    recentRunsResult,
    entitlementsResult,
    releasesResult,
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .eq("id", membership.organization_id)
      .maybeSingle(),
    supabase
      .from("design_connectors")
      .select(
        `
          *,
          credential_profile:internal_connector_profiles (
            id,
            display_name,
            provider_key,
            auth_mode,
            last_test_status
          )
        `,
      )
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("internal_connector_profiles")
      .select(
        "id, organization_id, provider_key, display_name, auth_mode, client_id, last_tested_at, last_test_status, last_test_error, created_at, updated_at, token_expires_at",
      )
      .eq("organization_id", membership.organization_id)
      .in("provider_key", [...SUPPORTED_PROFILE_PROVIDERS])
      .order("provider_key", { ascending: true })
      .order("display_name", { ascending: true }),
    supabase
      .from("design_sync_runs")
      .select(
        "id, provider_key, run_type, direction, status, started_at, completed_at, design_connector_id",
      )
      .eq("organization_id", membership.organization_id)
      .order("started_at", { ascending: false })
      .limit(20),
    supabase
      .from("organization_connector_entitlements")
      .select(
        "provider_key, is_enabled, allowed_runtime_roles, current_release_id, updated_at",
      )
      .eq("organization_id", membership.organization_id),
    supabase
      .from("connector_distribution_releases")
      .select("id, provider_key, version, file_name, created_at, is_active")
      .eq("is_active", true)
      .in("provider_key", [...SUPPORTED_PROFILE_PROVIDERS])
      .order("created_at", { ascending: false }),
  ]);

  const connectors = connectorsResult.data ?? [];
  const profiles = profilesResult.data ?? [];
  const recentRuns = recentRunsResult.data ?? [];
  const entitlements = entitlementsResult.data ?? [];
  const releases = releasesResult.data ?? [];
  const organization = organizationResult.data ?? null;

  const entitlementByProvider = new Map(
    entitlements.map((item) => [item.provider_key, item]),
  );

  const latestReleaseByProvider = new Map<string, (typeof releases)[number]>();
  for (const release of releases) {
    if (!latestReleaseByProvider.has(release.provider_key)) {
      latestReleaseByProvider.set(release.provider_key, release);
    }
  }

  const connectorCount = connectors.length;
  const profileCount = profiles.length;
  const activeRunCount = recentRuns.filter(
    (run) => run.status === "queued" || run.status === "running",
  ).length;
  const successfulRunCount = recentRuns.filter(
    (run) => run.status === "completed",
  ).length;

  return (
    <div className="space-y-6 p-6">
      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-500">
              {organization?.name ?? "Organization"}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">
              Design Connectors
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-gray-600">
              Connect CAD environments to Kordyne, manage credentials and scopes,
              and control connector rollout across current and upcoming adapters.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/design-connectors/downloads"
              className="rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white"
            >
              Downloads
            </Link>
            <Link
              href="/dashboard/parts"
              className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700"
            >
              Parts
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Active connectors
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {connectorCount}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Credential profiles
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {profileCount}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Runs in progress
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {activeRunCount}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-gray-500">
            Recent successful runs
          </div>
          <div className="mt-2 text-3xl font-semibold text-gray-900">
            {successfulRunCount}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Connector rollout
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Current package and entitlement status by connector.
            </p>
          </div>

          <Link
            href="/dashboard/design-connectors/downloads"
            className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700"
          >
            Manage downloads
          </Link>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUPPORTED_PROFILE_PROVIDERS.map((providerKey) => {
            const meta = PROVIDER_META[providerKey];
            const entitlement = entitlementByProvider.get(providerKey);
            const release = latestReleaseByProvider.get(providerKey);
            const enabled = Boolean(entitlement?.is_enabled);

            const statusTone = enabled
              ? "border-green-200 bg-green-50 text-green-700"
              : release
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-gray-200 bg-gray-50 text-gray-500";

            const statusLabel = enabled
              ? "Enabled"
              : release
                ? "Available"
                : meta.shortStatus;

            const runtimeRoles =
              Array.isArray(entitlement?.allowed_runtime_roles) &&
              entitlement.allowed_runtime_roles.length > 0
                ? entitlement.allowed_runtime_roles.join(", ")
                : "—";

            return (
              <div
                key={providerKey}
                className="rounded-2xl border border-gray-200 bg-gray-50/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-base font-semibold text-gray-900">
                    {meta.label}
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-medium ${statusTone}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  <div>
                    <span className="font-medium text-gray-700">Version:</span>{" "}
                    {release?.version ?? "—"}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Published:</span>{" "}
                    {formatUtcDate(release?.created_at)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Runtime:</span>{" "}
                    {runtimeRoles}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
        <Client
          initialConnectors={connectors}
          initialProfiles={profiles}
          initialRuns={recentRuns}
          organizationId={membership.organization_id}
          currentUserId={user.id}
          isOrgAdmin={membership.role === "admin"}
        />
      </section>
    </div>
  );
}
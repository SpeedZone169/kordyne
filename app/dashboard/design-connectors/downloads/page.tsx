import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { DESIGN_CONNECTOR_PROVIDER_LIST } from "../../../../lib/design-connectors/contract";

const CONNECTORS = DESIGN_CONNECTOR_PROVIDER_LIST.map((provider) => ({
  key: provider.key,
  label: provider.label,
  href: provider.downloadRoute,
  security: provider.security,
}));

const DOWNLOAD_FORMATS = [
  { key: "msi", label: "MSI installer" },
] as const;

function formatUtc(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function DesignConnectorDownloadsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard/design-connectors/downloads");
  }

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!membership?.organization_id) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-800">
          No organization membership found.
        </div>
      </div>
    );
  }

  const [entitlementsResult, releasesResult] = await Promise.all([
    supabase
      .from("organization_connector_entitlements")
      .select("provider_key, is_enabled, allowed_runtime_roles, current_release_id")
      .eq("organization_id", membership.organization_id),
    supabase
      .from("connector_distribution_releases")
      .select(
        "id, provider_key, version, package_format, file_name, created_at, is_active, sha256_checksum, signature_thumbprint",
      )
      .eq("package_format", "msi")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const entitlements = entitlementsResult.data ?? [];
  const releases = releasesResult.data ?? [];

  const entitlementByProvider = new Map(
    entitlements.map((item) => [item.provider_key, item]),
  );

  const latestReleaseByProviderAndFormat = new Map<
    string,
    (typeof releases)[number]
  >();

  for (const release of releases) {
    const format = release.package_format || "msi";
    const releaseKey = `${release.provider_key}:${format}`;

    if (!latestReleaseByProviderAndFormat.has(releaseKey)) {
      latestReleaseByProviderAndFormat.set(releaseKey, release);
    }
  }

  const canDownload = membership.role === "admin";

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Connector Downloads
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Download enabled design connectors for your organization.
            </p>
          </div>

          <Link
            href="/dashboard/design-connectors"
            className="rounded-xl border px-4 py-2 text-sm font-medium text-gray-700"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {CONNECTORS.map((connector) => {
          const entitlement = entitlementByProvider.get(connector.key);
          const connectorReleases = DOWNLOAD_FORMATS.map((format) => ({
            ...format,
            release: latestReleaseByProviderAndFormat.get(
              `${connector.key}:${format.key}`,
            ),
          }));
          const release =
            connectorReleases.find((item) => item.release)?.release ?? null;

          const enabled = Boolean(entitlement?.is_enabled);
          const version = release?.version ?? "—";
          const published = formatUtc(release?.created_at);
          const runtimeRoles =
            Array.isArray(entitlement?.allowed_runtime_roles) &&
            entitlement.allowed_runtime_roles.length > 0
              ? entitlement.allowed_runtime_roles.join(", ")
              : "—";

          const hasRelease = connectorReleases.some((item) => item.release);
          const showDownload = Boolean(
            canDownload && enabled && connector.href && hasRelease,
          );
          const securityLabel = connector.security.requiresSignedInstaller
            ? "Signed MSI required"
            : "Controlled access enforced";
          const integrityLabel = release?.sha256_checksum
            ? "Checksum recorded"
            : release
              ? "Checksum pending"
              : "—";

          const statusLabel = enabled
            ? "Enabled"
            : release
              ? "Available"
              : "Coming soon";

          const statusClasses = enabled
            ? "border-green-200 bg-green-50 text-green-700"
            : release
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-gray-200 bg-gray-50 text-gray-500";

          return (
            <section
              key={connector.key}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">
                  {connector.label}
                </h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${statusClasses}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-gray-700">
                <div>
                  <span className="font-medium">Version:</span> {version}
                </div>
                <div className="space-y-1">
                  <div className="font-medium">Files:</div>
                  {connectorReleases.some((item) => item.release) ? (
                    connectorReleases.map((item) =>
                      item.release ? (
                        <div key={item.key}>
                          <span className="text-gray-500">{item.label}:</span>{" "}
                          {item.release.file_name}
                        </div>
                      ) : null,
                    )
                  ) : (
                    <div>—</div>
                  )}
                </div>
                <div>
                  <span className="font-medium">Published:</span> {published}
                </div>
                <div>
                  <span className="font-medium">Runtime:</span> {runtimeRoles}
                </div>
                <div>
                  <span className="font-medium">Security:</span>{" "}
                  {securityLabel}
                </div>
                <div>
                  <span className="font-medium">Integrity:</span>{" "}
                  {integrityLabel}
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {showDownload ? (
                  connectorReleases.map((item) =>
                    item.release ? (
                      <a
                        key={item.key}
                        href={connector.href}
                        className="inline-flex rounded-xl border border-gray-900 bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                      >
                        Download MSI
                      </a>
                    ) : null,
                  )
                ) : release ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    Download disabled
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed rounded-xl border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    Coming soon
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

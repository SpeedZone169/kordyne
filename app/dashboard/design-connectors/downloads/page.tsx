import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "../../../../lib/supabase/server";
import { DESIGN_CONNECTOR_PROVIDER_LIST } from "../../../../lib/design-connectors/contract";

const DEFAULT_ONSHAPE_APP_STORE_URL =
  "https://cad.onshape.com/appstore/apps/Project%20%26%20Data%20Management/6a0974f9ed8d853e7994daac";
const ONSHAPE_APP_STORE_URL =
  process.env.NEXT_PUBLIC_ONSHAPE_APP_STORE_URL?.trim() ||
  process.env.ONSHAPE_APP_STORE_URL?.trim() ||
  DEFAULT_ONSHAPE_APP_STORE_URL;
const ONSHAPE_APP_STORE_VERSION = "0.1.0";

const CONNECTORS = DESIGN_CONNECTOR_PROVIDER_LIST.map((provider) => ({
  key: provider.key,
  label: provider.label,
  description: provider.description,
  href: provider.downloadRoute,
  setupRoute: provider.setupRoute,
  runtimes: provider.runtimes,
  security: provider.security,
}));

const DOWNLOAD_FORMATS = [
  { key: "msi", label: "MSI installer" },
] as const;

function formatUtc(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

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
        <div className="rounded-[8px] border border-red-200 bg-red-50 p-6 text-red-800">
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
    <div className="space-y-6 bg-[#f4f9fb] p-6">
      <div className="rounded-[8px] border border-[#c6dce3] bg-[#003040] p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              Connector Downloads
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-cyan-50/75">
              Install desktop connectors or open the Onshape Store listing
              for your organization.
            </p>
          </div>

          <Link
            href="/dashboard/design-connectors"
            className="rounded-[8px] border border-cyan-100/25 px-4 py-2 text-sm font-medium text-white"
          >
            Back
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          const isOnshape = connector.key === "onshape";
          const version =
            release?.version ?? (isOnshape ? ONSHAPE_APP_STORE_VERSION : "-");
          const published = release?.created_at
            ? formatUtc(release.created_at)
            : isOnshape
              ? "Private beta"
              : "-";
          const runtimeRoles =
            Array.isArray(entitlement?.allowed_runtime_roles) &&
            entitlement.allowed_runtime_roles.length > 0
              ? entitlement.allowed_runtime_roles.join(", ")
              : "-";

          const hasRelease = connectorReleases.some((item) => item.release);
          const isDesktopPackage =
            connector.security.distributionKind === "msi";
          const showDownload = Boolean(
            canDownload && enabled && connector.href && hasRelease,
          );
          const securityLabel = connector.security.requiresSignedInstaller
            ? "Signed MSI required"
            : "Controlled access enforced";
          const integrityLabel = !isDesktopPackage
            ? "OAuth runtime"
            : release?.sha256_checksum
            ? "Checksum recorded"
            : release
              ? "Checksum pending"
              : "-";
          const runtimeLabel = connector.runtimes
            .map((runtime) => runtime.replace(/_/g, " "))
            .join(", ");

          const statusLabel = enabled
            ? "Enabled"
            : isOnshape
              ? "Onshape Store"
            : connector.setupRoute
              ? "Web app"
            : release
              ? "Available"
              : "Coming soon";

          const statusClasses = enabled
            ? "border-[#00bdde]/40 bg-[#d6f8fd] text-[#003040]"
            : isOnshape
              ? "border-[#00bdde]/40 bg-[#e8fbff] text-[#006f87]"
            : connector.setupRoute
              ? "border-[#00bdde]/40 bg-[#e8fbff] text-[#006f87]"
            : release
              ? "border-amber-200 bg-amber-50 text-amber-700"
              : "border-gray-200 bg-gray-50 text-gray-500";

          return (
            <section
              key={connector.key}
              className="rounded-[8px] border border-[#c6dce3] bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[#003040]">
                    {connector.label}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {connector.description}
                  </p>
                </div>
                <span
                  className={`rounded-[8px] border px-3 py-1 text-xs font-medium ${statusClasses}`}
                >
                  {statusLabel}
                </span>
              </div>

              <div className="mt-5 space-y-3 text-sm text-slate-700">
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
                    <div>-</div>
                  )}
                </div>
                <div>
                  <span className="font-medium">Published:</span> {published}
                </div>
                <div>
                  <span className="font-medium">Runtime:</span>{" "}
                  {runtimeRoles !== "-" ? runtimeRoles : runtimeLabel}
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
                        className="inline-flex rounded-[8px] border border-[#00bdde] bg-[#00bdde] px-4 py-2 text-sm font-medium text-[#002b38]"
                      >
                        Download MSI
                      </a>
                    ) : null,
                  )
                ) : connector.key === "onshape" ? (
                  <a
                    href={ONSHAPE_APP_STORE_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-[8px] border border-[#00bdde] bg-[#00bdde] px-4 py-2 text-sm font-medium text-[#002b38]"
                  >
                    Onshape Store
                  </a>
                ) : connector.setupRoute ? (
                  <Link
                    href={connector.setupRoute}
                    className="inline-flex rounded-[8px] border border-[#003040] bg-[#003040] px-4 py-2 text-sm font-medium text-white"
                  >
                    Open web add-in
                  </Link>
                ) : release ? (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed rounded-[8px] border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
                  >
                    Download disabled
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex cursor-not-allowed rounded-[8px] border border-gray-200 bg-gray-100 px-4 py-2 text-sm font-medium text-gray-400"
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

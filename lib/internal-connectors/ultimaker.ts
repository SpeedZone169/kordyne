import { decryptConnectorSecret } from "@/lib/internal-connectors/crypto";
import type {
  ConnectorSyncResult,
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
  InternalResourceStatus,
  UltimakerDiscoveredPrinter,
} from "@/lib/internal-connectors/types";

const ULTIMAKER_API_BASE_URL = "https://api.ultimaker.com";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readPath(root: unknown, path: string[]): unknown {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function mapUltimakerStatus(rawStatus: string | null): InternalResourceStatus {
  const normalized = rawStatus?.trim().toLowerCase() ?? "";

  if (!normalized) return "idle";

  if (
    normalized.includes("print") ||
    normalized.includes("running") ||
    normalized.includes("processing")
  ) {
    return "running";
  }

  if (normalized.includes("queue")) {
    return "queued";
  }

  if (normalized.includes("pause")) {
    return "paused";
  }

  if (
    normalized.includes("error") ||
    normalized.includes("alarm") ||
    normalized.includes("attention") ||
    normalized.includes("failure")
  ) {
    return "blocked";
  }

  if (normalized.includes("maint")) {
    return "maintenance";
  }

  if (
    normalized.includes("offline") ||
    normalized.includes("disconnect") ||
    normalized.includes("unreachable")
  ) {
    return "offline";
  }

  if (
    normalized.includes("finish") ||
    normalized.includes("done") ||
    normalized.includes("complete")
  ) {
    return "complete";
  }

  if (
    normalized.includes("idle") ||
    normalized.includes("ready") ||
    normalized.includes("online")
  ) {
    return "idle";
  }

  return "idle";
}

function getUltimakerBearerToken(
  profile: InternalConnectorCredentialProfileSecretRecord,
): string {
  if (profile.auth_mode === "api_token") {
    if (
      !profile.access_token_ciphertext ||
      !profile.access_token_iv ||
      !profile.access_token_tag
    ) {
      throw new Error("Ultimaker API token is missing from this credential profile.");
    }

    return decryptConnectorSecret({
      ciphertext: profile.access_token_ciphertext,
      iv: profile.access_token_iv,
      tag: profile.access_token_tag,
    });
  }

  if (profile.auth_mode === "oauth_authorization_code") {
    if (
      !profile.access_token_ciphertext ||
      !profile.access_token_iv ||
      !profile.access_token_tag
    ) {
      throw new Error("Ultimaker access token is missing from this credential profile.");
    }

    return decryptConnectorSecret({
      ciphertext: profile.access_token_ciphertext,
      iv: profile.access_token_iv,
      tag: profile.access_token_tag,
    });
  }

  throw new Error(
    `Unsupported Ultimaker auth mode "${profile.auth_mode ?? "unknown"}".`,
  );
}

async function ultimakerFetchJson(
  path: string,
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const token = getUltimakerBearerToken(profile);

  const response = await fetch(`${ULTIMAKER_API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const text = await response.text();
  let json: unknown = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    const payload = asRecord(json);
    const errors = asArray(payload.errors);
    const firstError = asRecord(errors[0]);
    const title = readString(firstError.title);
    const detail = readString(firstError.detail);
    const message =
      title || detail || `Ultimaker API request failed with ${response.status}.`;

    throw new Error(message);
  }

  return json;
}

function extractCollection(json: unknown): Record<string, unknown>[] {
  const root = asRecord(json);
  const data = root.data;

  if (Array.isArray(data)) {
    return data.map((item) => asRecord(item));
  }

  if (Array.isArray(json)) {
    return json.map((item) => asRecord(item));
  }

  return [];
}

function extractClusterName(cluster: Record<string, unknown>): string | null {
  return (
    readString(cluster.name) ||
    readString(cluster.display_name) ||
    readString(readPath(cluster, ["attributes", "name"])) ||
    readString(readPath(cluster, ["attributes", "display_name"])) ||
    readString(readPath(cluster, ["cluster", "name"]))
  );
}

function extractClusterId(cluster: Record<string, unknown>): string | null {
  return (
    readString(cluster.id) ||
    readString(cluster.cluster_id) ||
    readString(readPath(cluster, ["attributes", "id"])) ||
    readString(readPath(cluster, ["attributes", "cluster_id"]))
  );
}

function extractRawStatus(cluster: Record<string, unknown>): string | null {
  return (
    readString(cluster.status) ||
    readString(cluster.state) ||
    readString(readPath(cluster, ["attributes", "status"])) ||
    readString(readPath(cluster, ["attributes", "state"])) ||
    readString(readPath(cluster, ["printer_status", "status"])) ||
    readString(readPath(cluster, ["print_job", "status"]))
  );
}

function extractPrinterCount(cluster: Record<string, unknown>): number {
  const printers =
    asArray(cluster.printers).length ||
    asArray(readPath(cluster, ["attributes", "printers"])).length ||
    asArray(readPath(cluster, ["status", "printers"])).length;

  return printers;
}

function extractCurrentJobName(cluster: Record<string, unknown>): string | null {
  return (
    readString(readPath(cluster, ["current_print_job", "name"])) ||
    readString(readPath(cluster, ["print_job", "name"])) ||
    readString(readPath(cluster, ["job", "name"])) ||
    readString(readPath(cluster, ["attributes", "current_print_job", "name"]))
  );
}

function extractCurrentMaterial(cluster: Record<string, unknown>): string | null {
  return (
    readString(readPath(cluster, ["current_print_job", "material"])) ||
    readString(readPath(cluster, ["print_job", "material"])) ||
    readString(readPath(cluster, ["job", "material"])) ||
    readString(readPath(cluster, ["attributes", "current_print_job", "material"]))
  );
}

function extractTimeElapsedSec(cluster: Record<string, unknown>): number | null {
  return (
    readNumber(readPath(cluster, ["current_print_job", "time_elapsed"])) ||
    readNumber(readPath(cluster, ["print_job", "time_elapsed"])) ||
    readNumber(readPath(cluster, ["job", "time_elapsed"])) ||
    readNumber(readPath(cluster, ["attributes", "current_print_job", "time_elapsed"]))
  );
}

function extractTimeTotalSec(cluster: Record<string, unknown>): number | null {
  return (
    readNumber(readPath(cluster, ["current_print_job", "time_total"])) ||
    readNumber(readPath(cluster, ["print_job", "time_total"])) ||
    readNumber(readPath(cluster, ["job", "time_total"])) ||
    readNumber(readPath(cluster, ["attributes", "current_print_job", "time_total"]))
  );
}

function normalizeDiscoveredCluster(
  cluster: Record<string, unknown>,
): UltimakerDiscoveredPrinter | null {
  const clusterId = extractClusterId(cluster);

  if (!clusterId) {
    return null;
  }

  const rawStatus = extractRawStatus(cluster);

  return {
    clusterId,
    clusterName: extractClusterName(cluster),
    printerCount: extractPrinterCount(cluster),
    rawStatus,
    mappedStatus: mapUltimakerStatus(rawStatus),
    currentJobName: extractCurrentJobName(cluster),
    currentMaterial: extractCurrentMaterial(cluster),
    timeElapsedSec: extractTimeElapsedSec(cluster),
    timeTotalSec: extractTimeTotalSec(cluster),
  };
}

async function fetchUltimakerClusters(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const json = await ultimakerFetchJson("/connect/v1/clusters", profile);
  const clusters = extractCollection(json)
    .map(normalizeDiscoveredCluster)
    .filter(Boolean) as UltimakerDiscoveredPrinter[];

  return clusters;
}

export async function testUltimakerProfile(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const clusters = await fetchUltimakerClusters(profile);

  return {
    message:
      clusters.length > 0
        ? `Connected to Ultimaker Digital Factory. Found ${clusters.length} cluster(s).`
        : "Connected to Ultimaker Digital Factory, but no connected clusters were found.",
    printerCount: clusters.length,
  };
}

export async function discoverUltimakerPrinters(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  return fetchUltimakerClusters(profile);
}

export async function testUltimakerConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord | null,
) {
  if (!profile) {
    throw new Error("Ultimaker connector is missing a credential profile.");
  }

  if (!connection.external_resource_id) {
    throw new Error("Missing external_resource_id. Select an Ultimaker cluster first.");
  }

  const clusters = await fetchUltimakerClusters(profile);
  const matched = clusters.find(
    (cluster) => cluster.clusterId === connection.external_resource_id,
  );

  if (!matched) {
    throw new Error(
      `Ultimaker cluster "${connection.external_resource_id}" was not found for the selected credentials.`,
    );
  }

  return {
    message: `Connected to Ultimaker cluster ${matched.clusterName || matched.clusterId}. Current mapped status: ${matched.mappedStatus}.`,
    rawStatus: matched.rawStatus,
    mappedStatus: matched.mappedStatus,
  };
}

export async function syncUltimakerConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord | null,
): Promise<ConnectorSyncResult> {
  if (!profile) {
    throw new Error("Ultimaker connector is missing a credential profile.");
  }

  if (!connection.external_resource_id) {
    throw new Error("Missing external_resource_id. Select an Ultimaker cluster first.");
  }

  const clusters = await fetchUltimakerClusters(profile);
  const matched = clusters.find(
    (cluster) => cluster.clusterId === connection.external_resource_id,
  );

  if (!matched) {
    throw new Error(
      `Ultimaker cluster "${connection.external_resource_id}" was not found for the selected credentials.`,
    );
  }

  return {
    status: matched.mappedStatus,
    rawStatus: matched.rawStatus,
    reasonCode: `ultimaker_${(matched.rawStatus ?? "unknown")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "unknown"}`,
    reasonDetail: `Ultimaker reported cluster status "${matched.rawStatus ?? "unknown"}".`,
    effectiveAt: new Date().toISOString(),
    payload: {
      provider: "ultimaker",
      raw_status: matched.rawStatus,
      mapped_status: matched.mappedStatus,
      cluster: {
        id: matched.clusterId,
        name: matched.clusterName,
        printer_count: matched.printerCount,
      },
      current_job: {
        name: matched.currentJobName,
        material: matched.currentMaterial,
        time_elapsed_sec: matched.timeElapsedSec,
        time_total_sec: matched.timeTotalSec,
      },
      external_resource_id: connection.external_resource_id,
    },
  };
}
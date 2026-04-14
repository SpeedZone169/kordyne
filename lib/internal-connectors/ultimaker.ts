import { decryptConnectorSecret } from "@/lib/internal-connectors/crypto";
import type {
  ConnectorSyncResult,
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
  InternalResourceStatus,
  UltimakerDiscoveredPrinter,
} from "./types";

const DEFAULT_BASE_URL = "https://api.ultimaker.com";

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

function readPath(root: unknown, path: string[]) {
  let current: unknown = root;

  for (const key of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

function resolveBaseUrl(connection?: InternalResourceConnection): string {
  const raw = readString(connection?.base_url) ?? DEFAULT_BASE_URL;
  const url = new URL(raw);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Ultimaker base_url must be http or https.");
  }

  return url.origin;
}

function requireUltimakerAccessToken(
  profile: InternalConnectorCredentialProfileSecretRecord,
): string {
  if (profile.provider_key !== "ultimaker") {
    throw new Error(
      `Expected an Ultimaker credential profile, received "${profile.provider_key}".`,
    );
  }

  const authMode = String(profile.auth_mode ?? "");
  if (authMode && authMode !== "oauth") {
    throw new Error(
      `Ultimaker credential profile must use oauth auth_mode. Received "${authMode}".`,
    );
  }

  if (
    !profile.access_token_ciphertext ||
    !profile.access_token_iv ||
    !profile.access_token_tag
  ) {
    throw new Error("Ultimaker credential profile is missing access token.");
  }

  return decryptConnectorSecret({
    ciphertext: profile.access_token_ciphertext,
    iv: profile.access_token_iv,
    tag: profile.access_token_tag,
  });
}

function requireMachineId(connection: InternalResourceConnection): string {
  const externalId = readString(connection.external_resource_id);

  if (!externalId) {
    throw new Error(
      "external_resource_id is required and should be the Ultimaker cluster or printer id.",
    );
  }

  return externalId;
}

async function fetchJson(
  url: string,
  init: RequestInit,
  context: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await response.text();

    let json: unknown = null;
    if (text) {
      try {
        json = JSON.parse(text) as unknown;
      } catch {
        json = { message: text };
      }
    }

    if (!response.ok) {
      const data = asRecord(json);
      const detail =
        readString(data.detail) ??
        readString(data.error) ??
        readString(data.message) ??
        text ??
        response.statusText;

      throw new Error(`${context} failed (${response.status}): ${detail}`);
    }

    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`${context} timed out.`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFirstSuccessfulJson(
  urls: string[],
  init: RequestInit,
  context: string,
): Promise<unknown> {
  let lastError: unknown = null;

  for (const url of urls) {
    try {
      return await fetchJson(url, init, context);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(`${context} failed.`);
}

function extractCollection(json: unknown): Record<string, unknown>[] {
  if (Array.isArray(json)) {
    return json.map((item) => asRecord(item));
  }

  const data = asRecord(json);

  const candidates = [
    data.data,
    data.results,
    data.items,
    data.clusters,
    data.printers,
    readPath(data, ["data", "items"]),
    readPath(data, ["data", "clusters"]),
    readPath(data, ["data", "printers"]),
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((item) => asRecord(item));
    }
  }

  return [];
}

function extractRawStatus(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.status) ??
    readString(machine.state) ??
    readString(readPath(machine, ["status", "state"])) ??
    readString(readPath(machine, ["status", "id"])) ??
    readString(readPath(machine, ["cluster_status"])) ??
    readString(readPath(machine, ["printer_status"])) ??
    readString(readPath(machine, ["system", "state"]))
  );
}

export function mapUltimakerStatus(rawStatus: string | null): InternalResourceStatus {
  const value = (rawStatus ?? "").trim().toLowerCase();

  if (!value) return "blocked";

  if (
    value.includes("offline") ||
    value.includes("disconnect") ||
    value.includes("unavailable") ||
    value.includes("error")
  ) {
    return "offline";
  }

  if (
    value.includes("maintenance") ||
    value.includes("service") ||
    value.includes("updat")
  ) {
    return "maintenance";
  }

  if (value.includes("pause")) {
    return "paused";
  }

  if (value.includes("queue") || value.includes("pending")) {
    return "queued";
  }

  if (
    value.includes("print") ||
    value.includes("busy") ||
    value.includes("active") ||
    value.includes("processing")
  ) {
    return "running";
  }

  if (value.includes("complete") || value.includes("finish")) {
    return "complete";
  }

  if (value.includes("idle") || value.includes("ready")) {
    return "idle";
  }

  return "blocked";
}

function normalizeReasonCode(rawStatus: string | null): string {
  const normalized = (rawStatus ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `ultimaker_${normalized || "unknown"}`;
}

function getMachineId(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.id) ??
    readString(machine.uuid) ??
    readString(machine.cluster_id) ??
    readString(readPath(machine, ["cluster", "id"])) ??
    readString(readPath(machine, ["printer", "id"]))
  );
}

function getMachineName(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.name) ??
    readString(machine.display_name) ??
    readString(machine.printer_name) ??
    readString(readPath(machine, ["cluster", "name"])) ??
    readString(readPath(machine, ["printer", "name"]))
  );
}

function getPrinterType(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.printer_type) ??
    readString(machine.type) ??
    readString(machine.model) ??
    readString(readPath(machine, ["printer", "type"])) ??
    readString(readPath(machine, ["printer", "model"]))
  );
}

function getTechnology(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.technology) ??
    readString(readPath(machine, ["printer", "technology"])) ??
    "FDM"
  );
}

function getMaterial(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.material) ??
    readString(readPath(machine, ["active_material", "name"])) ??
    readString(readPath(machine, ["materials", "0", "name"])) ??
    readString(readPath(machine, ["printer", "material"]))
  );
}

function getFirmwareVersion(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.firmware_version) ??
    readString(readPath(machine, ["firmware", "version"])) ??
    readString(readPath(machine, ["system", "firmware"]))
  );
}

function getLocalIp(machine: Record<string, unknown>): string | null {
  return (
    readString(machine.local_ip) ??
    readString(readPath(machine, ["network", "local_ip"])) ??
    readString(readPath(machine, ["network", "ip"]))
  );
}

function sanitizeMachinePayload(machine: Record<string, unknown>) {
  return {
    id: getMachineId(machine),
    name: getMachineName(machine),
    clusterId:
      readString(machine.cluster_id) ??
      readString(readPath(machine, ["cluster", "id"])) ??
      getMachineId(machine),
    clusterName:
      readString(readPath(machine, ["cluster", "name"])) ?? getMachineName(machine),
    printerType: getPrinterType(machine),
    technology: getTechnology(machine),
    material: getMaterial(machine),
    firmwareVersion: getFirmwareVersion(machine),
    localIp: getLocalIp(machine),
    rawStatus: extractRawStatus(machine),
  };
}

export function mapUltimakerPrinterSummary(
  machine: Record<string, unknown>,
): UltimakerDiscoveredPrinter {
  const id = getMachineId(machine) ?? "";
  const name = getMachineName(machine) ?? id;
  const rawStatus = extractRawStatus(machine);

  return {
    id,
    name,
    clusterId:
      readString(machine.cluster_id) ??
      readString(readPath(machine, ["cluster", "id"])) ??
      id,
    clusterName:
      readString(readPath(machine, ["cluster", "name"])) ?? name,
    printerType: getPrinterType(machine),
    technology: getTechnology(machine),
    material: getMaterial(machine),
    rawStatus,
    mappedStatus: mapUltimakerStatus(rawStatus),
    firmwareVersion: getFirmwareVersion(machine),
    localIp: getLocalIp(machine),
  };
}

async function fetchUltimakerCollection(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl: string,
): Promise<Record<string, unknown>[]> {
  const token = requireUltimakerAccessToken(profile);

  const json = await fetchFirstSuccessfulJson(
    [
      `${baseUrl}/connect/v1/clusters`,
      `${baseUrl}/api/v1/clusters`,
    ],
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
    "Ultimaker discovery request",
  );

  return extractCollection(json);
}

async function fetchUltimakerMachineRecord(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<Record<string, unknown>> {
  const baseUrl = resolveBaseUrl(connection);
  const token = requireUltimakerAccessToken(profile);
  const externalId = requireMachineId(connection);

  const directJson = await fetchFirstSuccessfulJson(
    [
      `${baseUrl}/connect/v1/clusters/${encodeURIComponent(externalId)}`,
      `${baseUrl}/api/v1/clusters/${encodeURIComponent(externalId)}`,
    ],
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
    "Ultimaker machine request",
  ).catch(() => null);

  if (directJson) {
    const directRecord = asRecord(directJson);
    if (Object.keys(directRecord).length > 0) {
      return directRecord;
    }
  }

  const collection = await fetchUltimakerCollection(profile, baseUrl);
  const matched = collection.find((item) => {
    const id = getMachineId(item);
    return id === externalId;
  });

  if (!matched) {
    throw new Error(
      `Ultimaker machine "${externalId}" was not found for this account.`,
    );
  }

  return matched;
}

export async function discoverUltimakerPrinters(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl = DEFAULT_BASE_URL,
): Promise<UltimakerDiscoveredPrinter[]> {
  const collection = await fetchUltimakerCollection(profile, baseUrl);

  return collection
    .filter((item) => Boolean(getMachineId(item)))
    .map(mapUltimakerPrinterSummary)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function testUltimakerProfile(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const printers = await discoverUltimakerPrinters(profile);

  return {
    ok: true,
    printerCount: printers.length,
    message:
      printers.length > 0
        ? `Credentials are valid. ${printers.length} Ultimaker machine(s) discovered.`
        : "Credentials are valid. No Ultimaker machines were returned for this account.",
  };
}

export async function testUltimakerConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  if (connection.provider_key !== "ultimaker") {
    throw new Error("This adapter only supports Ultimaker connectors.");
  }

  if (!connection.sync_enabled) {
    throw new Error("Connector is disabled. Enable sync before testing.");
  }

  const machine = await fetchUltimakerMachineRecord(connection, profile);
  const rawStatus = extractRawStatus(machine);
  const mappedStatus = mapUltimakerStatus(rawStatus);

  return {
    ok: true,
    message: `Connected to Ultimaker machine ${connection.external_resource_id}. Current mapped status: ${mappedStatus}.`,
    rawStatus,
    mappedStatus,
    printer: sanitizeMachinePayload(machine),
  };
}

export async function syncUltimakerConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<ConnectorSyncResult> {
  if (connection.provider_key !== "ultimaker") {
    throw new Error("This adapter only supports Ultimaker connectors.");
  }

  const machine = await fetchUltimakerMachineRecord(connection, profile);
  const rawStatus = extractRawStatus(machine);
  const status = mapUltimakerStatus(rawStatus);
  const effectiveAt = new Date().toISOString();

  return {
    status,
    rawStatus,
    reasonCode: normalizeReasonCode(rawStatus),
    reasonDetail: rawStatus
      ? `Ultimaker reported machine status "${rawStatus}".`
      : "Ultimaker did not return a recognizable machine status.",
    effectiveAt,
    payload: {
      provider: "ultimaker",
      external_resource_id: connection.external_resource_id,
      raw_status: rawStatus,
      mapped_status: status,
      printer: sanitizeMachinePayload(machine),
    },
  };
}
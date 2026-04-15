import { decryptConnectorSecret } from "@/lib/internal-connectors/crypto";
import type {
  ConnectorSyncResult,
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
  InternalResourceStatus,
} from "./types";

const DEFAULT_TIMEOUT_MS = 15_000;

type StratasysDiscoveredMachine = {
  id: string;
  name: string;
  serial: string | null;
  model: string | null;
  technology: string | null;
  material: string | null;
  locationName: string | null;
  rawStatus: string | null;
  mappedStatus: InternalResourceStatus;
  currentJobName: string | null;
};

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

function splitPath(path: string): string[] {
  return path
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);
}

function readMappedString(
  record: Record<string, unknown>,
  candidates: string[],
): string | null {
  for (const candidate of candidates) {
    const value = readString(readPath(record, splitPath(candidate)));
    if (value) return value;
  }

  return null;
}

function normalizeReasonCode(rawStatus: string | null): string {
  const normalized = (rawStatus ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `stratasys_${normalized || "unknown"}`;
}

function resolveBaseUrl(
  source: { base_url?: string | null; metadata?: Record<string, unknown> | null },
): string {
  const metadata = asRecord(source.metadata);
  const raw =
    readString(source.base_url) ??
    readString(metadata.apiBaseUrl) ??
    readString(metadata.baseUrl);

  if (!raw) {
    throw new Error(
      "Stratasys base URL is required. Add it on the connector or in metadata.",
    );
  }

  const url = new URL(raw);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Stratasys base_url must be http or https.");
  }

  return url.origin;
}

function requireStratasysCredentials(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  if (profile.provider_key !== "stratasys") {
    throw new Error(
      `Expected a Stratasys credential profile, received "${profile.provider_key}".`,
    );
  }

  if (!profile.client_id) {
    throw new Error("Stratasys credential profile is missing client_id.");
  }

  if (
    !profile.client_secret_ciphertext ||
    !profile.client_secret_iv ||
    !profile.client_secret_tag
  ) {
    throw new Error("Stratasys credential profile is missing client secret.");
  }

  return {
    apiKey: profile.client_id,
    apiSecret: decryptConnectorSecret({
      ciphertext: profile.client_secret_ciphertext,
      iv: profile.client_secret_iv,
      tag: profile.client_secret_tag,
    }),
  };
}

function getConnectionMetadata(
  connection?: InternalResourceConnection | null,
): Record<string, unknown> {
  return asRecord(connection?.metadata);
}

function getAuthMode(
  connection?: InternalResourceConnection | null,
): "x_api_key" | "bearer" | "basic" {
  const metadata = getConnectionMetadata(connection);
  const raw =
    readString(metadata.stratasysAuthMode) ??
    readString(metadata.authMode) ??
    "x_api_key";

  if (raw === "bearer") return "bearer";
  if (raw === "basic") return "basic";
  return "x_api_key";
}

function getApiKeyHeaderName(connection?: InternalResourceConnection | null) {
  const metadata = getConnectionMetadata(connection);
  return (
    readString(metadata.stratasysApiKeyHeader) ??
    readString(metadata.apiKeyHeader) ??
    "X-API-Key"
  );
}

function getApiSecretHeaderName(connection?: InternalResourceConnection | null) {
  const metadata = getConnectionMetadata(connection);
  return (
    readString(metadata.stratasysApiSecretHeader) ??
    readString(metadata.apiSecretHeader) ??
    "X-API-Secret"
  );
}

function getDiscoveryPath(connection?: InternalResourceConnection | null) {
  const metadata = getConnectionMetadata(connection);
  return (
    readString(metadata.stratasysDiscoveryPath) ??
    readString(metadata.discoveryPath) ??
    "/api/printers"
  );
}

function getMachineByIdPath(
  connection: InternalResourceConnection,
  machineId: string,
) {
  const metadata = getConnectionMetadata(connection);
  const template =
    readString(metadata.stratasysMachinePathTemplate) ??
    readString(metadata.machinePathTemplate);

  if (template) {
    return template.replaceAll("{id}", encodeURIComponent(machineId));
  }

  return `${getDiscoveryPath(connection).replace(/\/+$/, "")}/${encodeURIComponent(
    machineId,
  )}`;
}

function getCollectionPathCandidates(
  connection?: InternalResourceConnection | null,
): string[] {
  const metadata = getConnectionMetadata(connection);
  const explicit =
    readString(metadata.stratasysCollectionPath) ??
    readString(metadata.collectionPath);

  if (explicit) {
    return [explicit];
  }

  return [
    "items",
    "data",
    "results",
    "machines",
    "printers",
    "devices",
  ];
}

function getFieldCandidates(
  connection: InternalResourceConnection | null | undefined,
  key:
    | "id"
    | "name"
    | "serial"
    | "model"
    | "technology"
    | "material"
    | "locationName"
    | "rawStatus"
    | "currentJobName",
): string[] {
  const metadata = getConnectionMetadata(connection);

  const explicit = readString(metadata[`stratasysField_${key}`]);
  if (explicit) {
    return [explicit];
  }

  switch (key) {
    case "id":
      return ["id", "printerId", "machineId", "deviceId", "uuid"];
    case "name":
      return ["name", "displayName", "printerName", "machineName"];
    case "serial":
      return ["serial", "serialNumber", "printerSerial"];
    case "model":
      return ["model", "printerModel", "machineModel", "type"];
    case "technology":
      return ["technology", "process", "printingTechnology"];
    case "material":
      return ["material", "materialName", "activeMaterial.name"];
    case "locationName":
      return ["locationName", "location.name", "siteName", "groupName"];
    case "rawStatus":
      return ["status", "state", "printerStatus", "machineStatus", "status.name"];
    case "currentJobName":
      return ["currentJobName", "activeJob.name", "currentJob.name", "job.name"];
    default:
      return [];
  }
}

function extractCollection(
  json: unknown,
  connection?: InternalResourceConnection | null,
): Record<string, unknown>[] {
  if (Array.isArray(json)) {
    return json.map((item) => asRecord(item));
  }

  const root = asRecord(json);
  const candidates = getCollectionPathCandidates(connection);

  for (const candidate of candidates) {
    const value = readPath(root, splitPath(candidate));
    if (Array.isArray(value)) {
      return value.map((item) => asRecord(item));
    }
  }

  return [];
}

function createAuthHeaders(
  credentials: { apiKey: string; apiSecret: string },
  connection?: InternalResourceConnection | null,
): Record<string, string> {
  const authMode = getAuthMode(connection);

  if (authMode === "bearer") {
    return {
      authorization: `Bearer ${credentials.apiSecret}`,
    };
  }

  if (authMode === "basic") {
    const token = Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`,
    ).toString("base64");

    return {
      authorization: `Basic ${token}`,
    };
  }

  return {
    [getApiKeyHeaderName(connection)]: credentials.apiKey,
    [getApiSecretHeaderName(connection)]: credentials.apiSecret,
  };
}

async function fetchJson(
  url: string,
  init: RequestInit,
  context: string,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

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

function extractRawStatus(
  machine: Record<string, unknown>,
  connection?: InternalResourceConnection | null,
): string | null {
  return readMappedString(machine, getFieldCandidates(connection, "rawStatus"));
}

export function mapStratasysStatus(rawStatus: string | null): InternalResourceStatus {
  const value = (rawStatus ?? "").trim().toLowerCase();

  if (!value) return "blocked";

  if (
    value.includes("offline") ||
    value.includes("disconnect") ||
    value.includes("unavailable") ||
    value.includes("error") ||
    value.includes("fault")
  ) {
    return "offline";
  }

  if (
    value.includes("maintenance") ||
    value.includes("service") ||
    value.includes("calibrat") ||
    value.includes("cleaning")
  ) {
    return "maintenance";
  }

  if (value.includes("pause")) {
    return "paused";
  }

  if (value.includes("queue") || value.includes("pending") || value.includes("waiting")) {
    return "queued";
  }

  if (
    value.includes("print") ||
    value.includes("build") ||
    value.includes("running") ||
    value.includes("busy") ||
    value.includes("processing")
  ) {
    return "running";
  }

  if (
    value.includes("complete") ||
    value.includes("finished") ||
    value.includes("done") ||
    value.includes("success")
  ) {
    return "complete";
  }

  if (value.includes("idle") || value.includes("ready") || value.includes("available")) {
    return "idle";
  }

  return "blocked";
}

function sanitizeMachinePayload(
  machine: Record<string, unknown>,
  connection?: InternalResourceConnection | null,
) {
  return {
    id: readMappedString(machine, getFieldCandidates(connection, "id")),
    name: readMappedString(machine, getFieldCandidates(connection, "name")),
    serial: readMappedString(machine, getFieldCandidates(connection, "serial")),
    model: readMappedString(machine, getFieldCandidates(connection, "model")),
    technology: readMappedString(machine, getFieldCandidates(connection, "technology")),
    material: readMappedString(machine, getFieldCandidates(connection, "material")),
    locationName: readMappedString(machine, getFieldCandidates(connection, "locationName")),
    rawStatus: extractRawStatus(machine, connection),
    currentJobName: readMappedString(machine, getFieldCandidates(connection, "currentJobName")),
  };
}

export function mapStratasysMachineSummary(
  machine: Record<string, unknown>,
  connection?: InternalResourceConnection | null,
): StratasysDiscoveredMachine {
  const id =
    readMappedString(machine, getFieldCandidates(connection, "id")) ?? "";
  const name =
    readMappedString(machine, getFieldCandidates(connection, "name")) ?? id;
  const rawStatus = extractRawStatus(machine, connection);

  return {
    id,
    name,
    serial: readMappedString(machine, getFieldCandidates(connection, "serial")),
    model: readMappedString(machine, getFieldCandidates(connection, "model")),
    technology:
      readMappedString(machine, getFieldCandidates(connection, "technology")) ??
      "Additive",
    material: readMappedString(machine, getFieldCandidates(connection, "material")),
    locationName: readMappedString(machine, getFieldCandidates(connection, "locationName")),
    rawStatus,
    mappedStatus: mapStratasysStatus(rawStatus),
    currentJobName: readMappedString(machine, getFieldCandidates(connection, "currentJobName")),
  };
}

async function fetchStratasysCollection(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl: string,
  connection?: InternalResourceConnection | null,
): Promise<Record<string, unknown>[]> {
  const credentials = requireStratasysCredentials(profile);
  const path = getDiscoveryPath(connection);
  const json = await fetchJson(
    `${baseUrl}${path}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        ...createAuthHeaders(credentials, connection),
      },
    },
    "Stratasys discovery request",
  );

  return extractCollection(json, connection);
}

async function fetchStratasysMachine(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<Record<string, unknown>> {
  if (connection.provider_key !== "stratasys") {
    throw new Error("This adapter only supports Stratasys connectors.");
  }

  if (!connection.sync_enabled) {
    throw new Error("Connector is disabled. Enable sync before testing.");
  }

  const machineId = readString(connection.external_resource_id);
  if (!machineId) {
    throw new Error(
      "external_resource_id is required and should be the Stratasys machine id.",
    );
  }

  const baseUrl = resolveBaseUrl(connection);
  const credentials = requireStratasysCredentials(profile);

  try {
    const json = await fetchJson(
      `${baseUrl}${getMachineByIdPath(connection, machineId)}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          ...createAuthHeaders(credentials, connection),
        },
      },
      "Stratasys machine request",
    );

    return asRecord(json);
  } catch {
    const collection = await fetchStratasysCollection(profile, baseUrl, connection);
    const matched = collection.find((machine) => {
      const id = readMappedString(machine, getFieldCandidates(connection, "id"));
      return id === machineId;
    });

    if (!matched) {
      throw new Error(
        `Stratasys machine "${machineId}" was not found for this account.`,
      );
    }

    return matched;
  }
}

export async function discoverStratasysMachines(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl: string,
  connection?: InternalResourceConnection | null,
): Promise<StratasysDiscoveredMachine[]> {
  const collection = await fetchStratasysCollection(profile, baseUrl, connection);

  return collection
    .filter((machine) =>
      Boolean(readMappedString(machine, getFieldCandidates(connection, "id"))),
    )
    .map((machine) => mapStratasysMachineSummary(machine, connection))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function testStratasysProfile(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl: string,
  connection?: InternalResourceConnection | null,
) {
  const machines = await discoverStratasysMachines(profile, baseUrl, connection);

  return {
    ok: true,
    printerCount: machines.length,
    message:
      machines.length > 0
        ? `Credentials are valid. ${machines.length} Stratasys machine(s) discovered.`
        : "Credentials are valid. No Stratasys machines were returned for this account.",
  };
}

export async function testStratasysConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const machine = await fetchStratasysMachine(connection, profile);
  const rawStatus = extractRawStatus(machine, connection);
  const mappedStatus = mapStratasysStatus(rawStatus);

  return {
    ok: true,
    message: `Connected to Stratasys machine ${connection.external_resource_id}. Current mapped status: ${mappedStatus}.`,
    rawStatus,
    mappedStatus,
    printer: sanitizeMachinePayload(machine, connection),
  };
}

export async function syncStratasysConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<ConnectorSyncResult> {
  const machine = await fetchStratasysMachine(connection, profile);
  const rawStatus = extractRawStatus(machine, connection);
  const status = mapStratasysStatus(rawStatus);
  const effectiveAt = new Date().toISOString();

  return {
    status,
    rawStatus,
    reasonCode: normalizeReasonCode(rawStatus),
    reasonDetail: rawStatus
      ? `Stratasys reported machine status "${rawStatus}".`
      : "Stratasys did not return a recognizable machine status.",
    effectiveAt,
    payload: {
      provider: "stratasys",
      external_resource_id: connection.external_resource_id,
      raw_status: rawStatus,
      mapped_status: status,
      printer: sanitizeMachinePayload(machine, connection),
    },
  };
}
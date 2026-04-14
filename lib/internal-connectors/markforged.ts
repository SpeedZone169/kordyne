import { decryptConnectorSecret } from "@/lib/internal-connectors/crypto";
import type {
  ConnectorSyncResult,
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
  InternalResourceStatus,
  MarkforgedDiscoveredPrinter,
} from "./types";

const DEFAULT_BASE_URL = "https://www.eiger.io";

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
    throw new Error("Markforged base_url must be http or https.");
  }

  return url.origin;
}

function requireMarkforgedCredentials(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  if (profile.provider_key !== "markforged") {
    throw new Error(
      `Expected a Markforged credential profile, received "${profile.provider_key}".`,
    );
  }

  if (!profile.client_id) {
    throw new Error("Markforged credential profile is missing client_id.");
  }

  if (
    !profile.client_secret_ciphertext ||
    !profile.client_secret_iv ||
    !profile.client_secret_tag
  ) {
    throw new Error("Markforged credential profile is missing client secret.");
  }

  return {
    accessKey: profile.client_id,
    secretKey: decryptConnectorSecret({
      ciphertext: profile.client_secret_ciphertext,
      iv: profile.client_secret_iv,
      tag: profile.client_secret_tag,
    }),
  };
}

function requireDeviceId(connection: InternalResourceConnection): string {
  const id = readString(connection.external_resource_id);

  if (!id) {
    throw new Error(
      "external_resource_id is required and should be the Markforged device id.",
    );
  }

  return id;
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

function createBasicAuthHeader(accessKey: string, secretKey: string) {
  const token = Buffer.from(`${accessKey}:${secretKey}`).toString("base64");
  return `Basic ${token}`;
}

async function fetchMarkforgedCollection(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl = DEFAULT_BASE_URL,
): Promise<Record<string, unknown>[]> {
  const credentials = requireMarkforgedCredentials(profile);

  const json = await fetchJson(
    `${baseUrl}/api/v3/devices`,
    {
      method: "GET",
      headers: {
        authorization: createBasicAuthHeader(
          credentials.accessKey,
          credentials.secretKey,
        ),
        accept: "application/json",
      },
    },
    "Markforged devices request",
  );

  if (Array.isArray(json)) {
    return json.map((item) => asRecord(item));
  }

  const record = asRecord(json);
  const collection =
    asArray(record.data).length > 0
      ? asArray(record.data)
      : asArray(record.devices).length > 0
        ? asArray(record.devices)
        : asArray(record.items);

  return collection.map((item) => asRecord(item));
}

function getDeviceId(device: Record<string, unknown>): string | null {
  return (
    readString(device.id) ??
    readString(device.device_id) ??
    readString(device.uuid)
  );
}

function getDeviceName(device: Record<string, unknown>): string | null {
  return (
    readString(device.name) ??
    readString(device.display_name) ??
    readString(device.printer_name)
  );
}

function getDeviceModel(device: Record<string, unknown>): string | null {
  return (
    readString(device.model) ??
    readString(device.printer_type) ??
    readString(device.type) ??
    readString(readPath(device, ["machine", "model"]))
  );
}

function getDeviceTechnology(device: Record<string, unknown>): string | null {
  return (
    readString(device.technology) ??
    readString(device.process) ??
    readString(readPath(device, ["materials", "technology"])) ??
    "Composite / FFF"
  );
}

function getDeviceLocation(device: Record<string, unknown>): string | null {
  return (
    readString(device.location_name) ??
    readString(device.location) ??
    readString(readPath(device, ["location", "name"]))
  );
}

function getCurrentJobName(device: Record<string, unknown>): string | null {
  return (
    readString(device.current_job_name) ??
    readString(readPath(device, ["current_job", "name"])) ??
    readString(readPath(device, ["active_job", "name"]))
  );
}

function getMaterial(device: Record<string, unknown>): string | null {
  return (
    readString(device.material) ??
    readString(device.material_name) ??
    readString(readPath(device, ["material", "name"])) ??
    readString(readPath(device, ["current_job", "material"]))
  );
}

function extractRawStatus(device: Record<string, unknown>): string | null {
  return (
    readString(device.status) ??
    readString(device.state) ??
    readString(device.printer_status) ??
    readString(readPath(device, ["status", "state"])) ??
    readString(readPath(device, ["status", "name"]))
  );
}

export function mapMarkforgedStatus(rawStatus: string | null): InternalResourceStatus {
  const value = (rawStatus ?? "").trim().toLowerCase();

  if (!value) return "blocked";

  if (
    value.includes("offline") ||
    value.includes("disconnect") ||
    value.includes("unavailable")
  ) {
    return "offline";
  }

  if (
    value.includes("maintenance") ||
    value.includes("service") ||
    value.includes("calibrat")
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
    value.includes("building") ||
    value.includes("busy") ||
    value.includes("running")
  ) {
    return "running";
  }

  if (value.includes("complete") || value.includes("finished")) {
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

  return `markforged_${normalized || "unknown"}`;
}

function sanitizeDevicePayload(device: Record<string, unknown>) {
  return {
    id: getDeviceId(device),
    name: getDeviceName(device),
    model: getDeviceModel(device),
    technology: getDeviceTechnology(device),
    locationName: getDeviceLocation(device),
    rawStatus: extractRawStatus(device),
    currentJobName: getCurrentJobName(device),
    material: getMaterial(device),
    progressPercent:
      readNumber(device.progress_percent) ??
      readNumber(readPath(device, ["current_job", "progress_percent"])),
  };
}

export function mapMarkforgedDeviceSummary(
  device: Record<string, unknown>,
): MarkforgedDiscoveredPrinter {
  const id = getDeviceId(device) ?? "";
  const name = getDeviceName(device) ?? id;
  const rawStatus = extractRawStatus(device);

  return {
    id,
    serial:
      readString(device.serial) ??
      readString(device.serial_number) ??
      null,
    name,
    model: getDeviceModel(device),
    technology: getDeviceTechnology(device),
    locationName: getDeviceLocation(device),
    rawStatus,
    mappedStatus: mapMarkforgedStatus(rawStatus),
    currentJobName: getCurrentJobName(device),
    material: getMaterial(device),
  };
}

export async function discoverMarkforgedDevices(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl = DEFAULT_BASE_URL,
): Promise<MarkforgedDiscoveredPrinter[]> {
  const devices = await fetchMarkforgedCollection(profile, baseUrl);

  return devices
    .filter((device) => Boolean(getDeviceId(device)))
    .map(mapMarkforgedDeviceSummary)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function testMarkforgedProfile(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const devices = await discoverMarkforgedDevices(profile);

  return {
    ok: true,
    printerCount: devices.length,
    message:
      devices.length > 0
        ? `Credentials are valid. ${devices.length} Markforged device(s) discovered.`
        : "Credentials are valid. No Markforged devices were returned for this account.",
  };
}

async function fetchMarkforgedDevice(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<Record<string, unknown>> {
  if (connection.provider_key !== "markforged") {
    throw new Error("This adapter only supports Markforged connectors.");
  }

  if (!connection.sync_enabled) {
    throw new Error("Connector is disabled. Enable sync before testing.");
  }

  const baseUrl = resolveBaseUrl(connection);
  const deviceId = requireDeviceId(connection);
  const credentials = requireMarkforgedCredentials(profile);

  try {
    const json = await fetchJson(
      `${baseUrl}/api/v3/devices/${encodeURIComponent(deviceId)}`,
      {
        method: "GET",
        headers: {
          authorization: createBasicAuthHeader(
            credentials.accessKey,
            credentials.secretKey,
          ),
          accept: "application/json",
        },
      },
      "Markforged device request",
    );

    return asRecord(json);
  } catch {
    const devices = await fetchMarkforgedCollection(profile, baseUrl);
    const matched = devices.find((device) => getDeviceId(device) === deviceId);

    if (!matched) {
      throw new Error(
        `Markforged device "${deviceId}" was not found for this account.`,
      );
    }

    return matched;
  }
}

export async function testMarkforgedConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const device = await fetchMarkforgedDevice(connection, profile);
  const rawStatus = extractRawStatus(device);
  const mappedStatus = mapMarkforgedStatus(rawStatus);

  return {
    ok: true,
    message: `Connected to Markforged device ${connection.external_resource_id}. Current mapped status: ${mappedStatus}.`,
    rawStatus,
    mappedStatus,
    printer: sanitizeDevicePayload(device),
  };
}

export async function syncMarkforgedConnection(
  connection: InternalResourceConnection,
  profile: InternalConnectorCredentialProfileSecretRecord,
): Promise<ConnectorSyncResult> {
  const device = await fetchMarkforgedDevice(connection, profile);
  const rawStatus = extractRawStatus(device);
  const status = mapMarkforgedStatus(rawStatus);
  const effectiveAt = new Date().toISOString();

  return {
    status,
    rawStatus,
    reasonCode: normalizeReasonCode(rawStatus),
    reasonDetail: rawStatus
      ? `Markforged reported device status "${rawStatus}".`
      : "Markforged did not return a recognizable device status.",
    effectiveAt,
    payload: {
      provider: "markforged",
      external_resource_id: connection.external_resource_id,
      raw_status: rawStatus,
      mapped_status: status,
      printer: sanitizeDevicePayload(device),
    },
  };
}
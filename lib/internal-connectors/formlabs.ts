import type {
  ConnectorSyncResult,
  InternalResourceConnection,
  InternalResourceStatus,
} from "./types";

const DEFAULT_BASE_URL = "https://api.formlabs.com";
const DEFAULT_CLIENT_ID_ENV = "FORMLABS_CLIENT_ID";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function requireSafeEnvName(name: string): string {
  if (!/^[A-Z0-9_]+$/.test(name)) {
    throw new Error("Secret environment variable name is invalid.");
  }

  if (!name.startsWith("FORMLABS_") && !name.startsWith("KORDYNE_CONNECTOR_")) {
    throw new Error(
      "Secret environment variable must start with FORMLABS_ or KORDYNE_CONNECTOR_.",
    );
  }

  return name;
}

function resolveClientSecret(connection: InternalResourceConnection): string {
  const secretName = readString(connection.vault_secret_name);

  if (!secretName) {
    if (connection.vault_secret_id) {
      throw new Error(
        "vault_secret_id is set, but no Supabase Vault resolver exists yet. Use vault_secret_name pointing to a server environment variable for now.",
      );
    }

    throw new Error("vault_secret_name is required for Formlabs connectors.");
  }

  const envName = requireSafeEnvName(secretName);
  const secret = process.env[envName];

  if (!secret) {
    throw new Error(`Missing server environment variable: ${envName}.`);
  }

  return secret;
}

function resolveClientId(connection: InternalResourceConnection): string {
  const metadata = asRecord(connection.metadata);

  const directClientId =
    readString(metadata.formlabsClientId) ?? readString(metadata.clientId);

  if (directClientId) return directClientId;

  const envName = requireSafeEnvName(
    readString(metadata.formlabsClientIdEnv) ??
      readString(metadata.clientIdEnv) ??
      DEFAULT_CLIENT_ID_ENV,
  );

  const clientId = process.env[envName];

  if (!clientId) {
    throw new Error(
      `Missing Formlabs client id. Add ${envName} to server env or set metadata.clientId.`,
    );
  }

  return clientId;
}

function resolveBaseUrl(connection: InternalResourceConnection): string {
  const raw = readString(connection.base_url) ?? DEFAULT_BASE_URL;
  const url = new URL(raw);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Formlabs base_url must be http or https.");
  }

  return url.origin;
}

function requirePrinterSerial(connection: InternalResourceConnection): string {
  const serial = readString(connection.external_resource_id);

  if (!serial) {
    throw new Error(
      "external_resource_id is required and should be the Formlabs printer serial.",
    );
  }

  return serial;
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
    const json = text ? (JSON.parse(text) as unknown) : null;

    if (!response.ok) {
      const detail =
        asRecord(json).detail ??
        asRecord(json).error ??
        asRecord(json).message ??
        response.statusText;

      throw new Error(`${context} failed (${response.status}): ${String(detail)}`);
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

async function getAccessToken(connection: InternalResourceConnection) {
  const baseUrl = resolveBaseUrl(connection);
  const clientId = resolveClientId(connection);
  const clientSecret = resolveClientSecret(connection);

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const json = await fetchJson(
    `${baseUrl}/developer/v1/o/token/`,
    {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    },
    "Formlabs token request",
  );

  const token = readString(asRecord(json).access_token);

  if (!token) {
    throw new Error("Formlabs token response did not include access_token.");
  }

  return { baseUrl, token };
}

function extractRawStatus(printer: Record<string, unknown>): string | null {
  const printerStatus = asRecord(printer.printer_status);

  return (
    readString(printerStatus.status) ??
    readString(printerStatus.state) ??
    readString(printer.status) ??
    readString(printer.state)
  );
}

function normalizeReasonCode(rawStatus: string | null): string {
  const normalized = (rawStatus ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `formlabs_${normalized || "unknown"}`;
}

export function mapFormlabsStatus(rawStatus: string | null): InternalResourceStatus {
  const value = (rawStatus ?? "").trim().toLowerCase();

  if (!value) return "blocked";

  if (
    value.includes("offline") ||
    value.includes("disconnect") ||
    value.includes("unavailable") ||
    value.includes("unreachable")
  ) {
    return "offline";
  }

  if (
    value.includes("idle") ||
    value.includes("ready") ||
    value.includes("available")
  ) {
    return "idle";
  }

  if (value.includes("queue") || value.includes("pending")) {
    return "queued";
  }

  if (value.includes("pause")) {
    return "paused";
  }

  if (
    value.includes("print") ||
    value.includes("preprint") ||
    value.includes("preheat") ||
    value.includes("precoat") ||
    value.includes("postcoat") ||
    value.includes("running") ||
    value.includes("busy") ||
    value.includes("heating")
  ) {
    return "running";
  }

  if (
    value.includes("finished") ||
    value.includes("complete") ||
    value.includes("succeeded")
  ) {
    return "complete";
  }

  if (
    value.includes("maintenance") ||
    value.includes("service") ||
    value.includes("calibrat")
  ) {
    return "maintenance";
  }

  return "blocked";
}

export async function fetchFormlabsPrinter(
  connection: InternalResourceConnection,
): Promise<Record<string, unknown>> {
  if (connection.provider_key !== "formlabs") {
    throw new Error("This adapter only supports Formlabs connectors.");
  }

  if (!connection.sync_enabled) {
    throw new Error("Connector is disabled. Enable sync before testing.");
  }

  const printerSerial = requirePrinterSerial(connection);
  const { baseUrl, token } = await getAccessToken(connection);

  const json = await fetchJson(
    `${baseUrl}/developer/v1/printers/${encodeURIComponent(printerSerial)}/`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
    "Formlabs printer request",
  );

  return asRecord(json);
}

export async function testFormlabsConnection(
  connection: InternalResourceConnection,
) {
  const printer = await fetchFormlabsPrinter(connection);
  const rawStatus = extractRawStatus(printer);
  const mappedStatus = mapFormlabsStatus(rawStatus);

  return {
    ok: true,
    message: `Connected to Formlabs printer ${connection.external_resource_id}. Current mapped status: ${mappedStatus}.`,
    rawStatus,
    mappedStatus,
    printer,
  };
}

export async function syncFormlabsConnection(
  connection: InternalResourceConnection,
): Promise<ConnectorSyncResult> {
  const printer = await fetchFormlabsPrinter(connection);
  const rawStatus = extractRawStatus(printer);
  const status = mapFormlabsStatus(rawStatus);
  const effectiveAt = new Date().toISOString();

  return {
    status,
    rawStatus,
    reasonCode: normalizeReasonCode(rawStatus),
    reasonDetail: rawStatus
      ? `Formlabs reported printer status "${rawStatus}".`
      : "Formlabs did not return a recognizable printer status.",
    effectiveAt,
    payload: {
      provider: "formlabs",
      external_resource_id: connection.external_resource_id,
      raw_status: rawStatus,
      mapped_status: status,
      printer,
    },
  };
}
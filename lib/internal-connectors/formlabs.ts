import { decryptConnectorSecret } from "@/lib/internal-connectors/crypto";
import type {
  ConnectorSyncResult,
  FormlabsDiscoveredPrinter,
  InternalConnectorCredentialProfileSecretRecord,
  InternalResourceConnection,
  InternalResourceStatus,
} from "./types";

const DEFAULT_BASE_URL = "https://api.formlabs.com";
const DEFAULT_CLIENT_ID_ENV = "FORMLABS_CLIENT_ID";
const FORMLABS_STALE_PING_MINUTES = 15;

function requireFormlabsCredentials(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  if (profile.provider_key !== "formlabs") {
    throw new Error(
      `Expected a Formlabs credential profile, received "${profile.provider_key}".`,
    );
  }

  if (!profile.client_id) {
    throw new Error("Formlabs credential profile is missing client_id.");
  }

  if (
    !profile.client_secret_ciphertext ||
    !profile.client_secret_iv ||
    !profile.client_secret_tag
  ) {
    throw new Error("Formlabs credential profile is missing client secret.");
  }

  return {
    clientId: profile.client_id,
    clientSecret: decryptConnectorSecret({
      ciphertext: profile.client_secret_ciphertext,
      iv: profile.client_secret_iv,
      tag: profile.client_secret_tag,
    }),
  };
}

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

function requireSafeEnvName(name: string): string {
  if (!/^[A-Z0-9_]+$/.test(name)) {
    throw new Error("Secret environment variable name is invalid.");
  }

  return name;
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

function resolveFallbackClientId(connection: InternalResourceConnection): string {
  const metadata = asRecord(connection.metadata);
  const directClientId =
    readString(metadata.formlabsClientId) ?? readString(metadata.clientId);

  if (directClientId) {
    return directClientId;
  }

  const envName = requireSafeEnvName(
    readString(metadata.formlabsClientIdEnv) ??
      readString(metadata.clientIdEnv) ??
      DEFAULT_CLIENT_ID_ENV,
  );

  const clientId = process.env[envName];

  if (!clientId) {
    throw new Error(
      `Missing Formlabs client id. Add ${envName} to server env or use a credential profile.`,
    );
  }

  return clientId;
}

function resolveFallbackClientSecret(connection: InternalResourceConnection): string {
  const secretName = readString(connection.vault_secret_name);

  if (!secretName) {
    if (connection.vault_secret_id) {
      throw new Error(
        "vault_secret_id is set, but no vault resolver exists for Formlabs fallback mode. Use a credential profile or vault_secret_name.",
      );
    }

    throw new Error(
      "Formlabs credentials are missing. Select a saved credential profile or provide a fallback secret reference.",
    );
  }

  const envName = requireSafeEnvName(secretName);
  const secret = process.env[envName];

  if (!secret) {
    throw new Error(`Missing server environment variable: ${envName}.`);
  }

  return secret;
}

function resolveCredentialMaterial(
  connection: InternalResourceConnection,
  profile?: InternalConnectorCredentialProfileSecretRecord | null,
) {
  if (profile) {
    return requireFormlabsCredentials(profile);
  }

  return {
    clientId: resolveFallbackClientId(connection),
    clientSecret: resolveFallbackClientSecret(connection),
  };
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

async function getAccessToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string,
) {
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

  return token;
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

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isPingStale(lastPingedAt: string | null): boolean {
  const lastPing = parseDate(lastPingedAt);
  if (!lastPing) return false;

  const ageMs = Date.now() - lastPing.getTime();
  return ageMs > FORMLABS_STALE_PING_MINUTES * 60 * 1000;
}

function getPrinterStatusContext(printer: Record<string, unknown>) {
  const printerStatus = asRecord(printer.printer_status);
  const currentPrintRun = asRecord(printerStatus.current_print_run);

  const rawStatus = extractRawStatus(printer);
  const readyToPrint = readString(printerStatus.ready_to_print);
  const lastPingedAt = readString(printerStatus.last_pinged_at);
  const currentPrintStatus = readString(currentPrintRun.status);
  const hasCurrentPrintRun = Object.keys(currentPrintRun).length > 0;
  const pingStale = isPingStale(lastPingedAt);

  return {
    rawStatus,
    readyToPrint,
    lastPingedAt,
    currentPrintStatus,
    hasCurrentPrintRun,
    pingStale,
  };
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

function deriveFormlabsStatus(
  printer: Record<string, unknown>,
): {
  mappedStatus: InternalResourceStatus;
  rawStatus: string | null;
  reasonSuffix: string;
  pingStale: boolean;
  lastPingedAt: string | null;
} {
  const context = getPrinterStatusContext(printer);

  if (context.pingStale) {
    return {
      mappedStatus: "offline",
      rawStatus: context.rawStatus,
      reasonSuffix: "stale_ping",
      pingStale: true,
      lastPingedAt: context.lastPingedAt,
    };
  }

  const fromRaw = mapFormlabsStatus(context.rawStatus);

  if (fromRaw === "idle" && context.readyToPrint?.toLowerCase() === "false") {
    return {
      mappedStatus: context.hasCurrentPrintRun ? "running" : "blocked",
      rawStatus: context.rawStatus,
      reasonSuffix: context.hasCurrentPrintRun ? "active_run" : "not_ready",
      pingStale: false,
      lastPingedAt: context.lastPingedAt,
    };
  }

  return {
    mappedStatus: fromRaw,
    rawStatus: context.rawStatus,
    reasonSuffix: "raw_status",
    pingStale: false,
    lastPingedAt: context.lastPingedAt,
  };
}

function normalizeReasonCode(printer: Record<string, unknown>): string {
  const derived = deriveFormlabsStatus(printer);

  if (derived.pingStale) {
    return "formlabs_stale_ping";
  }

  const normalized = (derived.rawStatus ?? "unknown")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return `formlabs_${normalized || "unknown"}`;
}

function sanitizeCurrentPrintRun(value: unknown) {
  const run = asRecord(value);

  if (Object.keys(run).length === 0) {
    return null;
  }

  return {
    guid: readString(run.guid),
    name: readString(run.name),
    status: readString(run.status),
    material: readString(run.material),
    createdAt: readString(run.created_at),
    printStartedAt: readString(run.print_started_at),
    printFinishedAt: readString(run.print_finished_at),
    estimatedTimeRemainingMs:
      typeof run.estimated_time_remaining_ms === "number"
        ? run.estimated_time_remaining_ms
        : null,
  };
}

function sanitizePreviousPrintRun(value: unknown) {
  const run = asRecord(value);

  if (Object.keys(run).length === 0) {
    return null;
  }

  return {
    guid: readString(run.guid),
    name: readString(run.name),
    status: readString(run.status),
    material: readString(run.material),
    createdAt: readString(run.created_at),
    printStartedAt: readString(run.print_started_at),
    printFinishedAt: readString(run.print_finished_at),
  };
}

function sanitizePrinterPayload(printer: Record<string, unknown>) {
  const printerStatus = asRecord(printer.printer_status);
  const derived = deriveFormlabsStatus(printer);

  return {
    serial: readString(printer.serial),
    alias: readString(printer.alias),
    machineTypeId: readString(printer.machine_type_id),
    group: (() => {
      const group = asRecord(printer.group);
      return {
        id: readString(group.id),
        name: readString(group.name),
      };
    })(),
    printerStatus: {
      status: readString(printerStatus.status),
      readyToPrint: readString(printerStatus.ready_to_print),
      lastModified: readString(printerStatus.last_modified),
      lastPingedAt: readString(printerStatus.last_pinged_at),
      currentPrintRun: sanitizeCurrentPrintRun(printerStatus.current_print_run),
    },
    previousPrintRun: sanitizePreviousPrintRun(printer.previous_print_run),
    derivedConnectivity: {
      mappedStatus: derived.mappedStatus,
      pingStale: derived.pingStale,
      lastPingedAt: derived.lastPingedAt,
      staleThresholdMinutes: FORMLABS_STALE_PING_MINUTES,
    },
  };
}

export function mapFormlabsPrinterSummary(
  printer: Record<string, unknown>,
): FormlabsDiscoveredPrinter {
  const printerStatus = asRecord(printer.printer_status);
  const currentPrintRun = asRecord(printerStatus.current_print_run);
  const derived = deriveFormlabsStatus(printer);

  return {
    serial: readString(printer.serial) ?? "",
    alias: readString(printer.alias),
    machineTypeId: readString(printer.machine_type_id),
    groupName: readString(asRecord(printer.group).name),
    rawStatus: derived.rawStatus,
    mappedStatus: derived.mappedStatus,
    readyToPrint: readString(printerStatus.ready_to_print),
    lastModified: readString(printerStatus.last_modified),
    lastPingedAt: readString(printerStatus.last_pinged_at),
    currentPrintName: readString(currentPrintRun.name),
    currentPrintStatus: readString(currentPrintRun.status),
    currentPrintMaterial: readString(currentPrintRun.material),
  };
}

export async function discoverFormlabsPrinters(
  profile: InternalConnectorCredentialProfileSecretRecord,
  baseUrl = DEFAULT_BASE_URL,
): Promise<FormlabsDiscoveredPrinter[]> {
  const credentials = requireFormlabsCredentials(profile);

  const token = await getAccessToken(
    baseUrl,
    credentials.clientId,
    credentials.clientSecret,
  );

  const json = await fetchJson(
    `${baseUrl}/developer/v1/printers/`,
    {
      method: "GET",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/json",
      },
    },
    "Formlabs printers request",
  );

  const printers = asArray(json)
    .map((item) => asRecord(item))
    .filter((item) => readString(item.serial));

  return printers
    .map(mapFormlabsPrinterSummary)
    .sort((a, b) => (a.alias ?? a.serial).localeCompare(b.alias ?? b.serial));
}

export async function testFormlabsProfile(
  profile: InternalConnectorCredentialProfileSecretRecord,
) {
  const printers = await discoverFormlabsPrinters(profile);

  return {
    ok: true,
    printerCount: printers.length,
    message:
      printers.length > 0
        ? `Credentials are valid. ${printers.length} printer(s) discovered.`
        : "Credentials are valid. No printers were returned for this account.",
  };
}

export async function fetchFormlabsPrinter(
  connection: InternalResourceConnection,
  profile?: InternalConnectorCredentialProfileSecretRecord | null,
): Promise<Record<string, unknown>> {
  if (connection.provider_key !== "formlabs") {
    throw new Error("This adapter only supports Formlabs connectors.");
  }

  if (!connection.sync_enabled) {
    throw new Error("Connector is disabled. Enable sync before testing.");
  }

  const printerSerial = requirePrinterSerial(connection);
  const baseUrl = resolveBaseUrl(connection);
  const credentials = resolveCredentialMaterial(connection, profile);
  const token = await getAccessToken(
    baseUrl,
    credentials.clientId,
    credentials.clientSecret,
  );

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
  profile?: InternalConnectorCredentialProfileSecretRecord | null,
) {
  const printer = await fetchFormlabsPrinter(connection, profile);
  const derived = deriveFormlabsStatus(printer);

  return {
    ok: true,
    message: `Connected to Formlabs printer ${connection.external_resource_id}. Current mapped status: ${derived.mappedStatus}.`,
    rawStatus: derived.rawStatus,
    mappedStatus: derived.mappedStatus,
    printer: sanitizePrinterPayload(printer),
  };
}

export async function syncFormlabsConnection(
  connection: InternalResourceConnection,
  profile?: InternalConnectorCredentialProfileSecretRecord | null,
): Promise<ConnectorSyncResult> {
  const printer = await fetchFormlabsPrinter(connection, profile);
  const derived = deriveFormlabsStatus(printer);
  const effectiveAt = new Date().toISOString();

  return {
    status: derived.mappedStatus,
    rawStatus: derived.rawStatus,
    reasonCode: normalizeReasonCode(printer),
    reasonDetail: derived.pingStale
      ? `Formlabs printer has not pinged within ${FORMLABS_STALE_PING_MINUTES} minutes and is treated as offline.`
      : derived.rawStatus
        ? `Formlabs reported printer status "${derived.rawStatus}".`
        : "Formlabs did not return a recognizable printer status.",
    effectiveAt,
    payload: {
      provider: "formlabs",
      external_resource_id: connection.external_resource_id,
      raw_status: derived.rawStatus,
      mapped_status: derived.mappedStatus,
      connectivity_reason:
        derived.pingStale ? "stale_ping" : derived.reasonSuffix,
      printer: sanitizePrinterPayload(printer),
    },
  };
}
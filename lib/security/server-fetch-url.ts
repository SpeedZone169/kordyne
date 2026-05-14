function normalizeHostname(hostname: string) {
  return hostname.trim().toLowerCase().replace(/^\[|\]$/g, "");
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }

  const [a, b] = parts;

  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168)
  );
}

function isPrivateIpv6(hostname: string) {
  return (
    hostname === "::1" ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.startsWith("fe80:")
  );
}

function isBlockedServerFetchHost(hostname: string) {
  const normalized = normalizeHostname(hostname);

  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized === "metadata.google.internal" ||
    normalized === "host.docker.internal" ||
    normalized === "kubernetes.default.svc" ||
    isPrivateIpv4(normalized) ||
    isPrivateIpv6(normalized)
  );
}

export function assertSafeServerFetchUrl(raw: string, label = "Base URL") {
  const url = new URL(raw);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${label} must be http or https.`);
  }

  if (url.username || url.password) {
    throw new Error(`${label} must not include credentials.`);
  }

  if (isBlockedServerFetchHost(url.hostname)) {
    throw new Error(`${label} cannot target local, private, or metadata hosts.`);
  }

  return url.origin;
}

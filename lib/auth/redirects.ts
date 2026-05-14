const DEFAULT_AUTH_REDIRECT = "/dashboard";

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
) {
  if (!value) return fallback;

  let candidate = value.trim();
  if (!candidate) return fallback;

  try {
    candidate = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  if (!candidate.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(candidate, "https://kordyne.local");

    if (parsed.origin !== "https://kordyne.local") {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

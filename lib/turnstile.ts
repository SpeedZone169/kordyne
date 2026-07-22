const turnstileDevelopmentSecret = "1x0000000000000000000000000000000AA";

type TurnstileVerifyResponse = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
};

type VerifyTurnstileOptions = {
  request: Request;
  token: string;
  expectedAction?: string;
};

function getRequestHostname(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || "";

  if (host.startsWith("[")) {
    return host.slice(1, host.indexOf("]")).toLowerCase();
  }

  return host.split(":")[0].toLowerCase();
}

function isLocalHostname(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function getClientIp(request: Request) {
  const cloudflareIp = request.headers.get("cf-connecting-ip");
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();

  return cloudflareIp || forwardedFor || "";
}

export async function verifyTurnstile({
  request,
  token,
  expectedAction,
}: VerifyTurnstileOptions) {
  const hostname = getRequestHostname(request);
  const developmentRequest =
    process.env.NODE_ENV !== "production" && isLocalHostname(hostname);
  const secret = developmentRequest
    ? turnstileDevelopmentSecret
    : process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error("TURNSTILE_SECRET_KEY is not configured");
    return { success: false, errorCodes: ["missing-secret"] };
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", token);

  const clientIp = getClientIp(request);
  if (clientIp) {
    formData.append("remoteip", clientIp);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: formData,
        cache: "no-store",
        signal: controller.signal,
      }
    );

    if (!response.ok) {
      console.error(`Turnstile verification returned HTTP ${response.status}`);
      return { success: false, errorCodes: ["verification-http-error"] };
    }

    const result = (await response.json()) as TurnstileVerifyResponse;
    const actionMatches =
      developmentRequest || !expectedAction || result.action === expectedAction;
    const success = result.success === true && actionMatches;

    if (!success) {
      console.warn("Turnstile verification rejected", {
        action: result.action,
        expectedAction,
        errorCodes: result["error-codes"] ?? [],
        hostname: result.hostname,
      });
    }

    return {
      success,
      errorCodes: result["error-codes"] ?? [],
    };
  } catch (error) {
    console.error("Turnstile verification request failed", error);
    return { success: false, errorCodes: ["verification-request-failed"] };
  } finally {
    clearTimeout(timeout);
  }
}

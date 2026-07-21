import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

export const runtime = "nodejs";

function generateLinkCode() {
  return randomBytes(18).toString("base64url").toUpperCase();
}

function generateClientVerifier() {
  return randomBytes(32).toString("base64url");
}

function hashVerifier(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function POST(request: Request) {
  try {
    const admin = createDesignAppAdminClient();
    const origin = new URL(request.url).origin;

    const body = (await request.json().catch(() => ({}))) as {
      clientType?: string;
    };

    const allowedClientTypes = new Set([
      "fusion",
      "inventor",
      "onshape",
      "solidworks",
    ]);
    const requestedClientType = body.clientType?.trim().toLowerCase() || "fusion";

    const clientType = allowedClientTypes.has(requestedClientType)
      ? requestedClientType
      : "fusion";

    let linkCode = generateLinkCode();
    const clientVerifier = generateClientVerifier();
    const clientVerifierHash = hashVerifier(clientVerifier);

    let lastInsertError: string | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await admin
        .from("design_app_login_links")
        .insert({
          client_type: clientType,
          link_code: linkCode,
          client_verifier_hash: clientVerifierHash,
          status: "pending",
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select("link_code")
        .maybeSingle();

      if (!error && data?.link_code) {
        const browserUrl = new URL("/design-app/connect", origin);
        browserUrl.searchParams.set("code", linkCode);
        browserUrl.searchParams.set("client_type", clientType);

        return NextResponse.json({
          ok: true,
          code: linkCode,
          client_verifier: clientVerifier,
          client_type: clientType,
          browser_url: browserUrl.toString(),
        });
      }

      lastInsertError = error?.message ?? "No link code returned.";
      linkCode = generateLinkCode();
    }

    console.error(
      "[design-app/auth/start] Failed to create login link.",
      lastInsertError,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          process.env.NODE_ENV === "development" && lastInsertError
            ? lastInsertError
            : "Failed to create browser login request.",
      },
      { status: 500 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      { status: 500 },
    );
  }
}

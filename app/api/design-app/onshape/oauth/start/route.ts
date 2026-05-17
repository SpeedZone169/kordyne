import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getDesignAppRequestContext } from "../../../../../../lib/design-app/request-auth";
import { encryptHandoffToken } from "../../../../../../lib/design-app/handoff-crypto";
import { buildOnshapeAuthorizeUrl } from "../../../../../../lib/design-app/onshape-oauth";

type StartInput = {
  return_path?: string | null;
  context?: {
    companyId?: string | null;
  } | null;
};

function safeReturnPath(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "/design-app/onshape";

  try {
    const url = new URL(value, "https://kordyne.local");
    if (url.origin !== "https://kordyne.local") return "/design-app/onshape";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/design-app/onshape";
  }
}

async function startOnshapeOAuth(
  request: Request,
  input: StartInput = {},
  redirectResponse = false,
) {
  const ctx = await getDesignAppRequestContext(request, {
    providerKey: "onshape",
    allowedRoles: ["admin", "engineer"],
    requireEntitlement: true,
  });

  if ("error" in ctx) return ctx.error;

  const statePayload = {
    nonce: randomUUID(),
    user_id: ctx.user.id,
    organization_id: ctx.organizationId,
    return_path: safeReturnPath(input.return_path),
    exp: Date.now() + 10 * 60 * 1000,
  };
  const state = encryptHandoffToken(JSON.stringify(statePayload));
  const authorizationUrl = buildOnshapeAuthorizeUrl(state, request.url, {
    companyId: input.context?.companyId ?? null,
  });

  if (redirectResponse) {
    return NextResponse.redirect(authorizationUrl);
  }

  return NextResponse.json({
    ok: true,
    authorization_url: authorizationUrl,
  });
}

export async function GET(request: Request) {
  try {
    return await startOnshapeOAuth(request, {}, true);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not start Onshape OAuth.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as StartInput;
    return await startOnshapeOAuth(request, body, false);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not start Onshape OAuth.",
      },
      { status: 500 },
    );
  }
}

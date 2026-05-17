import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../../lib/design-app/admin";
import { decryptHandoffToken } from "../../../../../../lib/design-app/handoff-crypto";
import {
  exchangeOnshapeAuthorizationCode,
  storeOnshapeOAuthTokens,
} from "../../../../../../lib/design-app/onshape-oauth";

type OAuthState = {
  user_id?: string;
  organization_id?: string;
  return_path?: string;
  exp?: number;
};

function htmlResponse(title: string, body: string, status = 200) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root { color-scheme: light dark; }
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; padding: 32px; background: #f8fafc; color: #0f172a; }
      main { max-width: 560px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; background: #fff; padding: 24px; }
      h1 { margin: 0 0 12px; font-size: 22px; }
      p { line-height: 1.5; color: #475569; }
      @media (prefers-color-scheme: dark) {
        body { background: #0f172a; color: #e2e8f0; }
        main { background: #111827; border-color: #334155; }
        p { color: #cbd5e1; }
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${title}</h1>
      <p>${body}</p>
    </main>
  </body>
</html>`;

  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}

function parseState(rawState: string): OAuthState {
  const decoded = decryptHandoffToken(rawState);
  const parsed = JSON.parse(decoded) as OAuthState;

  if (!parsed.user_id || !parsed.organization_id || !parsed.exp) {
    throw new Error("The Onshape OAuth state is incomplete.");
  }

  if (parsed.exp < Date.now()) {
    throw new Error("The Onshape OAuth request expired. Start the connection again.");
  }

  return parsed;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");

  if (error) {
    return htmlResponse(
      "Onshape connection was not approved",
      errorDescription || error,
      400,
    );
  }

  if (!code || !state) {
    return htmlResponse(
      "Onshape connection failed",
      "The authorization response was missing a code or state value.",
      400,
    );
  }

  try {
    const parsedState = parseState(state);
    const tokens = await exchangeOnshapeAuthorizationCode(code, request.url);
    const admin = createDesignAppAdminClient();

    await storeOnshapeOAuthTokens(admin, {
      organizationId: parsedState.organization_id ?? "",
      userId: parsedState.user_id ?? "",
      tokens,
      requestUrl: request.url,
    });

    return htmlResponse(
      "Onshape connected to Kordyne",
      "You can return to the Kordyne panel in Onshape. This tab can be closed.",
    );
  } catch (callbackError) {
    return htmlResponse(
      "Onshape connection failed",
      callbackError instanceof Error
        ? callbackError.message
        : "Unexpected Onshape OAuth callback error.",
      500,
    );
  }
}

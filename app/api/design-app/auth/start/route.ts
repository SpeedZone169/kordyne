import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";

function generateLinkCode(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export async function POST(request: Request) {
  try {
    const admin = createDesignAppAdminClient();
    const origin = new URL(request.url).origin;

    const body = (await request.json().catch(() => ({}))) as {
      clientType?: string;
    };

    const clientType = body.clientType === "fusion" ? "fusion" : "fusion";

    let linkCode = generateLinkCode();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data, error } = await admin
        .from("design_app_login_links")
        .insert({
          client_type: clientType,
          link_code: linkCode,
          status: "pending",
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        })
        .select("link_code")
        .maybeSingle();

      if (!error && data?.link_code) {
        return NextResponse.json({
          ok: true,
          code: linkCode,
          browser_url: `${origin}/design-app/connect?code=${encodeURIComponent(linkCode)}`,
        });
      }

      linkCode = generateLinkCode();
    }

    return NextResponse.json(
      { ok: false, error: "Failed to create browser login request." },
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
import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { decryptHandoffToken } from "../../../../../lib/design-app/handoff-crypto";

export const runtime = "nodejs";

function hashVerifier(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

function verifierMatches(providedVerifier: string, storedHash: string | null) {
  if (!storedHash) return false;

  const provided = Buffer.from(hashVerifier(providedVerifier));
  const stored = Buffer.from(storedHash);

  return provided.length === stored.length && timingSafeEqual(provided, stored);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      clientVerifier?: string;
      client_verifier?: string;
      verifier?: string;
    };

    const code = body.code?.trim();
    const clientVerifier =
      body.clientVerifier?.trim() ||
      body.client_verifier?.trim() ||
      body.verifier?.trim();

    if (!code || !clientVerifier) {
      return NextResponse.json(
        { ok: false, error: "code and clientVerifier are required." },
        { status: 400 },
      );
    }

    const admin = createDesignAppAdminClient();

    const { data: link, error: linkError } = await admin
      .from("design_app_login_links")
      .select(
        "id, status, expires_at, encrypted_access_token, approved_by_user_id, organization_id, role, client_verifier_hash",
      )
      .eq("link_code", code)
      .maybeSingle();

    if (linkError) {
      return NextResponse.json(
        { ok: false, error: linkError.message },
        { status: 500 },
      );
    }

    if (!link) {
      return NextResponse.json(
        { ok: false, error: "Link code not found." },
        { status: 404 },
      );
    }

    if (!verifierMatches(clientVerifier, link.client_verifier_hash)) {
      return NextResponse.json(
        {
          ok: false,
          status: "invalid",
          error: "Invalid browser-login verifier.",
        },
        { status: 403 },
      );
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      await admin
        .from("design_app_login_links")
        .update({ status: "expired" })
        .eq("id", link.id);

      return NextResponse.json({
        ok: false,
        status: "expired",
        error: "Link code expired.",
      });
    }

    if (link.status === "pending") {
      return NextResponse.json({
        ok: false,
        status: "pending",
        error: "Waiting for browser approval.",
      });
    }

    if (link.status === "consumed") {
      return NextResponse.json({
        ok: false,
        status: "consumed",
        error: "Link code already used.",
      });
    }

    if (!link.encrypted_access_token) {
      return NextResponse.json({
        ok: false,
        status: "invalid",
        error: "Approved link has no token payload.",
      });
    }

    const accessToken = decryptHandoffToken(link.encrypted_access_token);

    const { data: consumedLink, error: consumeError } = await admin
      .from("design_app_login_links")
      .update({
        status: "consumed",
        consumed_at: new Date().toISOString(),
        encrypted_access_token: null,
      })
      .eq("id", link.id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();

    if (consumeError || !consumedLink) {
      return NextResponse.json(
        {
          ok: false,
          status: "consumed",
          error: consumeError?.message || "Link code was already used.",
        },
        { status: consumeError ? 500 : 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      access_token: accessToken,
      user_id: link.approved_by_user_id,
      organization_id: link.organization_id,
      role: link.role,
    });
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

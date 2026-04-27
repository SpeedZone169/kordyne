import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { decryptHandoffToken } from "../../../../../lib/design-app/handoff-crypto";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
    };

    const code = body.code?.trim();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "code is required." },
        { status: 400 },
      );
    }

    const admin = createDesignAppAdminClient();

    const { data: link, error: linkError } = await admin
      .from("design_app_login_links")
      .select(
        "id, status, expires_at, encrypted_access_token, approved_by_user_id, organization_id, role",
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

    const { error: consumeError } = await admin
      .from("design_app_login_links")
      .update({
        status: "consumed",
        consumed_at: new Date().toISOString(),
        encrypted_access_token: null,
      })
      .eq("id", link.id);

    if (consumeError) {
      return NextResponse.json(
        { ok: false, error: consumeError.message },
        { status: 500 },
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
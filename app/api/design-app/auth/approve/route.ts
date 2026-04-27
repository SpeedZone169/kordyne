import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { encryptHandoffToken } from "../../../../../lib/design-app/handoff-crypto";

function createTokenBoundClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createSupabaseClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      accessToken?: string;
    };

    const code = body.code?.trim();
    const accessToken = body.accessToken?.trim();

    if (!code || !accessToken) {
      return NextResponse.json(
        { ok: false, error: "code and accessToken are required." },
        { status: 400 },
      );
    }

    const userClient = createTokenBoundClient(accessToken);
    const admin = createDesignAppAdminClient();

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(accessToken);

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { data: membership, error: membershipError } = await userClient
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json(
        { ok: false, error: membershipError.message },
        { status: 500 },
      );
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { ok: false, error: "No organization membership found." },
        { status: 403 },
      );
    }

    const { data: link, error: linkError } = await admin
      .from("design_app_login_links")
      .select("id, status, expires_at")
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

      return NextResponse.json(
        { ok: false, error: "Link code expired." },
        { status: 410 },
      );
    }

    if (link.status === "consumed") {
      return NextResponse.json(
        { ok: false, error: "Link code already consumed." },
        { status: 409 },
      );
    }

    const encryptedAccessToken = encryptHandoffToken(accessToken);

    const { error: updateError } = await admin
      .from("design_app_login_links")
      .update({
        status: "approved",
        approved_by_user_id: user.id,
        organization_id: membership.organization_id,
        role: membership.role,
        approved_at: new Date().toISOString(),
        encrypted_access_token: encryptedAccessToken,
      })
      .eq("id", link.id);

    if (updateError) {
      return NextResponse.json(
        { ok: false, error: updateError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Browser login approved. Return to Fusion and click Complete Browser Login.",
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
import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createDesignAppAdminClient } from "../../../../../lib/design-app/admin";
import { encryptHandoffToken } from "../../../../../lib/design-app/handoff-crypto";
import { createClient as createServerSupabaseClient } from "../../../../../lib/supabase/server";

type AuthContext = {
  accessToken: string;
  supabase: ReturnType<typeof createSupabaseClient>;
  user: {
    id: string;
  };
};

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

async function getCookieAuthContext(): Promise<AuthContext | null> {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  const accessToken = sessionData.session?.access_token;

  if (sessionError || !accessToken) {
    return null;
  }

  return {
    accessToken,
    supabase,
    user,
  };
}

async function getTokenAuthContext(
  accessToken: string | undefined,
): Promise<AuthContext | null> {
  const token = accessToken?.trim();

  if (!token) {
    return null;
  }

  const supabase = createTokenBoundClient(token);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return null;
  }

  return {
    accessToken: token,
    supabase,
    user,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      accessToken?: string;
    };

    const code = body.code?.trim();
    const accessToken = body.accessToken?.trim();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "code is required." },
        { status: 400 },
      );
    }

    const authContext =
      (await getCookieAuthContext()) ?? (await getTokenAuthContext(accessToken));

    if (!authContext) {
      return NextResponse.json(
        {
          ok: false,
          error: "Please log in to Kordyne before approving this connector.",
        },
        { status: 401 },
      );
    }

    const userClient = authContext.supabase;
    const admin = createDesignAppAdminClient();
    const user = authContext.user;

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

    if (link.status !== "pending") {
      return NextResponse.json(
        { ok: false, error: "Link code has already been approved." },
        { status: 409 },
      );
    }

    const encryptedAccessToken = encryptHandoffToken(authContext.accessToken);

    const { data: approvedLink, error: updateError } = await admin
      .from("design_app_login_links")
      .update({
        status: "approved",
        approved_by_user_id: user.id,
        organization_id: membership.organization_id,
        role: membership.role,
        approved_at: new Date().toISOString(),
        encrypted_access_token: encryptedAccessToken,
      })
      .eq("id", link.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (updateError || !approvedLink) {
      return NextResponse.json(
        {
          ok: false,
          error: updateError?.message || "Link code has already been approved.",
        },
        { status: updateError ? 500 : 409 },
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Browser login approved. Return to the connector and click Complete Browser Login.",
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

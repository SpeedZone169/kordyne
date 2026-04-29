import { NextResponse } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "../../../../lib/supabase/server";

function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  const directHeader = request.headers.get("x-kordyne-connection-token");

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  if (directHeader && directHeader.trim().length > 0) {
    return directHeader.trim();
  }

  return null;
}

function maskToken(token: string | null) {
  if (!token) return null;
  if (token.length <= 12) return token;
  return `${token.slice(0, 6)}…${token.slice(-6)}`;
}

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

export async function GET(request: Request) {
  const token = extractToken(request);

  const debug: Record<string, unknown> = {
    token_present: Boolean(token),
    token_preview: maskToken(token),
    authorization_header_present: Boolean(request.headers.get("authorization")),
    custom_token_header_present: Boolean(
      request.headers.get("x-kordyne-connection-token"),
    ),
  };

  try {
    const supabase = token ? createTokenBoundClient(token) : await createClient();

    const authResult = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    const {
      data: { user },
      error: userError,
    } = authResult;

    debug.auth_user_error = userError?.message ?? null;
    debug.auth_user_id = user?.id ?? null;
    debug.auth_user_email = user?.email ?? null;

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Unauthorized.",
          debug,
        },
        { status: 401 },
      );
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    debug.membership_error = membershipError?.message ?? null;
    debug.membership = membership ?? null;

    if (membershipError) {
      return NextResponse.json(
        {
          ok: false,
          error: membershipError.message,
          debug,
        },
        { status: 500 },
      );
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "No organization membership found.",
          debug,
        },
        { status: 403 },
      );
    }

    const { count: partsCount, error: partsCountError } = await supabase
      .from("parts")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id);

    debug.parts_count_error = partsCountError?.message ?? null;
    debug.parts_count = partsCount ?? 0;

    const { count: connectorsCount, error: connectorsCountError } = await supabase
      .from("design_connectors")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", membership.organization_id)
      .eq("provider_key", "fusion");

    debug.connectors_count_error = connectorsCountError?.message ?? null;
    debug.connectors_count = connectorsCount ?? 0;

    return NextResponse.json({
      ok: true,
      debug,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error.",
        debug,
      },
      { status: 500 },
    );
  }
}
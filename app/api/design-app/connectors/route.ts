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
  try {
    const token = extractToken(request);

    const supabase = token
      ? createTokenBoundClient(token)
      : await createClient();

    const authResult = token
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();

    const {
      data: { user },
      error: userError,
    } = authResult;

    if (userError || !user) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
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

    const { data: connectors, error: connectorsError } = await supabase
      .from("design_connectors")
      .select(
        `
          id,
          provider_key,
          display_name,
          connection_mode,
          sync_scope_type,
          sync_scope_external_id,
          sync_scope_label,
          is_enabled,
          last_sync_status,
          last_sync_at,
          credential_profile:internal_connector_profiles (
            id,
            display_name,
            provider_key,
            auth_mode,
            last_test_status
          )
        `,
      )
      .eq("organization_id", membership.organization_id)
      .eq("provider_key", "fusion")
      .order("display_name", { ascending: true });

    if (connectorsError) {
      return NextResponse.json(
        { ok: false, error: connectorsError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      items: connectors ?? [],
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
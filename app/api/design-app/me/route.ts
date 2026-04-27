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
        {
          ok: false,
          error: "Unauthorized.",
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

    if (membershipError) {
      return NextResponse.json(
        { ok: false, error: membershipError.message },
        { status: 500 },
      );
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        {
          ok: false,
          error: "No organization membership found.",
        },
        { status: 403 },
      );
    }

    const { data: organization, error: organizationError } = await supabase
      .from("organizations")
      .select("id, name, slug, plan")
      .eq("id", membership.organization_id)
      .maybeSingle();

    if (organizationError) {
      return NextResponse.json(
        { ok: false, error: organizationError.message },
        { status: 500 },
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return NextResponse.json(
        { ok: false, error: profileError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: profile?.email ?? user.email ?? null,
        full_name: profile?.full_name ?? null,
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            plan: organization.plan,
          }
        : null,
      membership: {
        role: membership.role,
      },
      auth: {
        mode: token ? "token" : "cookie",
      },
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
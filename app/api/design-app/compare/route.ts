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

async function getOrgScopedClient(request: Request) {
  const token = extractToken(request);
  const supabase = token ? createTokenBoundClient(token) : await createClient();

  const authResult = token
    ? await supabase.auth.getUser(token)
    : await supabase.auth.getUser();

  const {
    data: { user },
    error: userError,
  } = authResult;

  if (userError || !user) {
    return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .order("organization_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return {
      error: NextResponse.json({ ok: false, error: membershipError.message }, { status: 500 }),
    };
  }

  if (!membership?.organization_id) {
    return {
      error: NextResponse.json(
        { ok: false, error: "No organization membership found." },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    organizationId: membership.organization_id,
  };
}

export async function POST(request: Request) {
  try {
    const scoped = await getOrgScopedClient(request);
    if ("error" in scoped) return scoped.error;

    const body = (await request.json()) as {
      part_family_id?: string;
      current_document_name?: string;
    };

    const partFamilyId = body.part_family_id?.trim();
    const currentDocumentName = body.current_document_name?.trim() ?? "";

    if (!partFamilyId) {
      return NextResponse.json(
        { ok: false, error: "part_family_id is required." },
        { status: 400 },
      );
    }

    const { data: parts, error: partsError } = await scoped.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", scoped.organizationId)
      .eq("part_family_id", partFamilyId)
      .order("revision_index", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (partsError) {
      return NextResponse.json({ ok: false, error: partsError.message }, { status: 500 });
    }

    const latestPart = (parts ?? [])[0] as Record<string, unknown> | undefined;

    if (!latestPart) {
      return NextResponse.json(
        { ok: false, error: "No part found for this family." },
        { status: 404 },
      );
    }

    const { data: sourceLinks, error: sourceLinksError } = await scoped.supabase
      .from("part_source_links")
      .select("*")
      .eq("part_family_id", partFamilyId)
      .eq("provider_key", "fusion")
      .order("created_at", { ascending: false })
      .limit(1);

    if (sourceLinksError) {
      return NextResponse.json(
        { ok: false, error: sourceLinksError.message },
        { status: 500 },
      );
    }

    const latestSourceLink = (sourceLinks ?? [])[0] ?? null;
    const latestName = String(latestPart.name ?? "");
    const nameMatches =
      currentDocumentName.length > 0 &&
      latestName.length > 0 &&
      currentDocumentName.trim().toLowerCase() === latestName.trim().toLowerCase();

    return NextResponse.json({
      ok: true,
      compare: {
        latest_part_id: latestPart.id ?? null,
        latest_part_family_id: latestPart.part_family_id ?? null,
        latest_name: latestPart.name ?? null,
        latest_part_number: latestPart.part_number ?? null,
        latest_status: latestPart.status ?? null,
        latest_revision_index: latestPart.revision_index ?? null,
        current_document_name: currentDocumentName || null,
        name_matches: nameMatches,
        has_fusion_link: Boolean(latestSourceLink),
        latest_source_link: latestSourceLink,
        recommended_publish_mode: "new_revision",
        recommendation:
          "Use new revision if this selected Kordyne family matches the Fusion document you want to update.",
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
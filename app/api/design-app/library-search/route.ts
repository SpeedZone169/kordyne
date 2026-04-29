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

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function scoreItem(
  q: string,
  item: {
    name?: string | null;
    part_number?: string | null;
    description?: string | null;
    process_type?: string | null;
    material?: string | null;
    category?: string | null;
  },
) {
  const nq = normalize(q);
  if (!nq) return 0;

  const name = normalize(item.name);
  const partNumber = normalize(item.part_number);
  const description = normalize(item.description);
  const processType = normalize(item.process_type);
  const material = normalize(item.material);
  const category = normalize(item.category);

  let score = 0;

  if (name === nq) score += 100;
  if (partNumber === nq) score += 100;

  if (name.startsWith(nq)) score += 50;
  if (partNumber.startsWith(nq)) score += 50;

  if (name.includes(nq)) score += 25;
  if (partNumber.includes(nq)) score += 25;
  if (description.includes(nq)) score += 10;
  if (processType.includes(nq)) score += 8;
  if (material.includes(nq)) score += 8;
  if (category.includes(nq)) score += 6;

  return score;
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
    return {
      error: NextResponse.json(
        {
          ok: false,
          error: userError?.message ?? "Unauthorized.",
          debug: {
            token_present: Boolean(token),
            user_id: null,
          },
        },
        { status: 401 },
      ),
    };
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
      error: NextResponse.json(
        { ok: false, error: membershipError.message },
        { status: 500 },
      ),
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

    const body = (await request.json().catch(() => ({}))) as {
      q?: string;
      limit?: number;
    };

    const q = (body.q ?? "").trim();
    const limit = Math.min(Math.max(body.limit ?? 100, 10), 200);

    const { data: parts, error: partsError } = await scoped.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", scoped.organizationId)
      .order("updated_at", { ascending: false })
      .limit(limit * 3);

    if (partsError) {
      return NextResponse.json({ ok: false, error: partsError.message }, { status: 500 });
    }

    const grouped = new Map<string, Record<string, unknown>>();

    for (const row of parts ?? []) {
      const current = row as Record<string, unknown>;
      const familyId = String(current.part_family_id ?? "");
      if (!familyId) continue;

      const existing = grouped.get(familyId);
      if (!existing) {
        grouped.set(familyId, current);
        continue;
      }

      const existingRevision = Number(existing.revision_index ?? -1);
      const currentRevision = Number(current.revision_index ?? -1);

      if (currentRevision > existingRevision) {
        grouped.set(familyId, current);
      }
    }

    const latestParts = Array.from(grouped.values());

    const familyIds = latestParts
      .map((item) => String(item.part_family_id ?? ""))
      .filter(Boolean);

    const sourceLinksByFamily = new Map<string, Record<string, unknown>>();

    if (familyIds.length > 0) {
      const { data: sourceLinks } = await scoped.supabase
        .from("part_source_links")
        .select("*")
        .in("part_family_id", familyIds)
        .eq("provider_key", "fusion")
        .order("created_at", { ascending: false });

      for (const link of sourceLinks ?? []) {
        const familyId = String((link as Record<string, unknown>).part_family_id ?? "");
        if (familyId && !sourceLinksByFamily.has(familyId)) {
          sourceLinksByFamily.set(familyId, link as Record<string, unknown>);
        }
      }
    }

    const items = latestParts
      .map((part) => {
        const familyId = String(part.part_family_id ?? "");
        const score = scoreItem(q, {
          name: (part.name as string | null) ?? null,
          part_number: (part.part_number as string | null) ?? null,
          description: (part.description as string | null) ?? null,
          process_type: (part.process_type as string | null) ?? null,
          material: (part.material as string | null) ?? null,
          category: (part.category as string | null) ?? null,
        });

        return {
          part_id: String(part.id ?? ""),
          part_family_id: familyId,
          name: part.name ?? null,
          part_number: part.part_number ?? null,
          description: part.description ?? null,
          process_type: part.process_type ?? null,
          material: part.material ?? null,
          category: part.category ?? null,
          revision: part.revision ?? null,
          revision_index: part.revision_index ?? null,
          status: part.status ?? null,
          created_at: part.created_at ?? null,
          updated_at: part.updated_at ?? null,
          latest_source_link: sourceLinksByFamily.get(familyId) ?? null,
          search_score: score,
        };
      })
      .sort((a, b) => {
        if ((b.search_score ?? 0) !== (a.search_score ?? 0)) {
          return (b.search_score ?? 0) - (a.search_score ?? 0);
        }
        return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
      })
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      items,
      debug: {
        query: q,
        returned: items.length,
        note: "Results stay broad and are re-ranked rather than disappearing on minor typos.",
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
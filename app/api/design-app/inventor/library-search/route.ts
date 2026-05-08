import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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

  const fields = [
    normalize(item.name),
    normalize(item.part_number),
    normalize(item.description),
    normalize(item.process_type),
    normalize(item.material),
    normalize(item.category),
  ];

  let score = 0;

  if (fields[0] === nq) score += 100;
  if (fields[1] === nq) score += 100;

  if (fields[0].startsWith(nq)) score += 50;
  if (fields[1].startsWith(nq)) score += 50;

  for (const field of fields) {
    if (field.includes(nq)) score += 10;
  }

  return score;
}

function matchesFilter(value: unknown, filter: string) {
  if (!filter || filter === "all") return true;
  return normalize(value) === normalize(filter);
}

function toRevisionItem(part: Record<string, unknown>) {
  return {
    part_id: String(part.id ?? ""),
    part_family_id: String(part.part_family_id ?? ""),
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
  };
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "inventor",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const body = (await request.json().catch(() => ({}))) as {
      q?: string;
      limit?: number;
      status?: string;
      category?: string;
      process_type?: string;
      sort?: string;
    };

    const q = (body.q ?? "").trim();
    const limit = Math.min(Math.max(body.limit ?? 50, 10), 100);
    const statusFilter = asString(body.status).toLowerCase();
    const categoryFilter = asString(body.category).toLowerCase();
    const processFilter = asString(body.process_type).toLowerCase();
    const sort = asString(body.sort) || "recent";

    const { data: parts, error: partsError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("updated_at", { ascending: false })
      .limit(limit * 12);

    if (partsError) {
      return NextResponse.json(
        { ok: false, error: partsError.message },
        { status: 500 },
      );
    }

    const grouped = new Map<string, Record<string, unknown>[]>();

    for (const row of parts ?? []) {
      const part = row as Record<string, unknown>;
      const familyId = String(part.part_family_id ?? "");
      if (!familyId) continue;

      if (!grouped.has(familyId)) {
        grouped.set(familyId, []);
      }

      grouped.get(familyId)?.push(part);
    }

    const familyIds = Array.from(grouped.keys());

    const sourceLinksByFamily = new Map<string, Record<string, unknown>>();

    if (familyIds.length > 0) {
      const { data: sourceLinks } = await ctx.supabase
        .from("part_source_links")
        .select("*")
        .in("part_family_id", familyIds)
        .eq("provider_key", "inventor")
        .order("created_at", { ascending: false });

      for (const link of sourceLinks ?? []) {
        const familyId = String(
          (link as Record<string, unknown>).part_family_id ?? "",
        );

        if (familyId && !sourceLinksByFamily.has(familyId)) {
          sourceLinksByFamily.set(familyId, link as Record<string, unknown>);
        }
      }
    }

    const items = Array.from(grouped.entries())
      .map(([familyId, familyParts]) => {
        const revisions = familyParts
          .sort((a, b) => Number(b.revision_index ?? -1) - Number(a.revision_index ?? -1))
          .map(toRevisionItem);

        const latest = revisions[0] ?? null;

        const searchScore = Math.max(
          ...familyParts.map((part) =>
            scoreItem(q, {
              name: (part.name as string | null) ?? null,
              part_number: (part.part_number as string | null) ?? null,
              description: (part.description as string | null) ?? null,
              process_type: (part.process_type as string | null) ?? null,
              material: (part.material as string | null) ?? null,
              category: (part.category as string | null) ?? null,
            }),
          ),
          0,
        );

        return {
          ...(latest ?? {}),
          part_family_id: familyId,
          latest_source_link: sourceLinksByFamily.get(familyId) ?? null,
          search_score: searchScore,
          revision_count: revisions.length,
          revisions,
        };
      })
      .filter((item) => {
        return (
          matchesFilter(item.status, statusFilter) &&
          matchesFilter(item.category, categoryFilter) &&
          matchesFilter(item.process_type, processFilter)
        );
      })
      .sort((a, b) => {
        if (q && (b.search_score ?? 0) !== (a.search_score ?? 0)) {
          return (b.search_score ?? 0) - (a.search_score ?? 0);
        }

        if (sort === "name_asc") {
          return String(a.name ?? "").localeCompare(String(b.name ?? ""));
        }

        if (sort === "revision_desc") {
          return Number(b.revision_index ?? -1) - Number(a.revision_index ?? -1);
        }

        if (sort === "status") {
          return String(a.status ?? "").localeCompare(String(b.status ?? ""));
        }

        return String(b.updated_at ?? "").localeCompare(
          String(a.updated_at ?? ""),
        );
      })
      .slice(0, limit);

    return NextResponse.json({
      ok: true,
      items,
      debug: {
        query: q,
        returned: items.length,
        note: "Items are grouped by part family and include all available revisions.",
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

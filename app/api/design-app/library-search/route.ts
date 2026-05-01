import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";

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

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "fusion",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const body = (await request.json().catch(() => ({}))) as {
      q?: string;
      limit?: number;
    };

    const q = (body.q ?? "").trim();
    const limit = Math.min(Math.max(body.limit ?? 100, 10), 200);

    const { data: parts, error: partsError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .order("updated_at", { ascending: false })
      .limit(limit * 3);

    if (partsError) {
      return NextResponse.json(
        { ok: false, error: partsError.message },
        { status: 500 },
      );
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
      const { data: sourceLinks } = await ctx.supabase
        .from("part_source_links")
        .select("*")
        .in("part_family_id", familyIds)
        .eq("provider_key", "fusion")
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
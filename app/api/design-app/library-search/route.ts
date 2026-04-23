import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

type SearchBody = {
  q?: string;
  status?: string;
  process_type?: string;
  material?: string;
  limit?: number;
};

type PartRow = {
  id: string;
  part_family_id: string;
  name: string;
  part_number: string | null;
  description: string | null;
  process_type: string | null;
  material: string | null;
  revision: string | null;
  revision_index: number | null;
  revision_note: string | null;
  category: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  asset_category: string | null;
  file_size_bytes: number | null;
  created_at: string;
};

type FamilySearchResult = {
  part_family_id: string;
  name: string;
  part_number: string | null;
  latest_revision: {
    part_id: string;
    revision: string | null;
    revision_index: number | null;
    revision_note: string | null;
    status: string | null;
    created_at: string;
    updated_at: string | null;
  };
  description: string | null;
  process_type: string | null;
  material: string | null;
  category: string | null;
  revision_count: number;
  file_count: number;
  available_asset_categories: string[];
  available_file_types: string[];
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asLimit(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(Math.max(Math.floor(value), 1), 100);
  }
  return 25;
}

function comparePartsByRevision(a: PartRow, b: PartRow) {
  const aRevisionIndex = a.revision_index ?? 0;
  const bRevisionIndex = b.revision_index ?? 0;

  if (aRevisionIndex !== bRevisionIndex) {
    return bRevisionIndex - aRevisionIndex;
  }

  const aUpdatedAt = new Date(a.updated_at || a.created_at).getTime();
  const bUpdatedAt = new Date(b.updated_at || b.created_at).getTime();

  return bUpdatedAt - aUpdatedAt;
}

function buildFamilyResults(
  parts: PartRow[],
  filesByPartId: Map<string, PartFileRow[]>,
): FamilySearchResult[] {
  const familyMap = new Map<string, PartRow[]>();

  for (const part of parts) {
    const existing = familyMap.get(part.part_family_id) ?? [];
    existing.push(part);
    familyMap.set(part.part_family_id, existing);
  }

  return Array.from(familyMap.entries())
    .map(([partFamilyId, familyParts]) => {
      const revisions = [...familyParts].sort(comparePartsByRevision);
      const latest = revisions[0];

      const latestFiles = filesByPartId.get(latest.id) ?? [];

      return {
        part_family_id: partFamilyId,
        name: latest.name,
        part_number: latest.part_number,
        latest_revision: {
          part_id: latest.id,
          revision: latest.revision,
          revision_index: latest.revision_index,
          revision_note: latest.revision_note,
          status: latest.status,
          created_at: latest.created_at,
          updated_at: latest.updated_at,
        },
        description: latest.description,
        process_type: latest.process_type,
        material: latest.material,
        category: latest.category,
        revision_count: revisions.length,
        file_count: latestFiles.length,
        available_asset_categories: Array.from(
          new Set(
            latestFiles
              .map((file) => file.asset_category)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort(),
        available_file_types: Array.from(
          new Set(
            latestFiles
              .map((file) => file.file_type)
              .filter((value): value is string => Boolean(value)),
          ),
        ).sort(),
      } satisfies FamilySearchResult;
    })
    .sort((a, b) => {
      const aTime = new Date(
        a.latest_revision.updated_at || a.latest_revision.created_at,
      ).getTime();
      const bTime = new Date(
        b.latest_revision.updated_at || b.latest_revision.created_at,
      ).getTime();

      return bTime - aTime;
    });
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = ((await request.json().catch(() => ({}))) ?? {}) as SearchBody;

    const queryText = asNullableString(body.q);
    const statusFilter = asNullableString(body.status);
    const processFilter = asNullableString(body.process_type);
    const materialFilter = asNullableString(body.material);
    const limit = asLimit(body.limit);

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .order("organization_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    if (!membership?.organization_id) {
      return NextResponse.json(
        { error: "No organization membership found." },
        { status: 403 },
      );
    }

    let query = supabase
      .from("parts")
      .select(
        "id, part_family_id, name, part_number, description, process_type, material, revision, revision_index, revision_note, category, status, updated_at, created_at",
      )
      .eq("organization_id", membership.organization_id)
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryText) {
      query = query.or(
        `name.ilike.%${queryText}%,part_number.ilike.%${queryText}%,material.ilike.%${queryText}%,description.ilike.%${queryText}%`,
      );
    }

    if (statusFilter) {
      query = query.eq("status", statusFilter);
    }

    if (processFilter) {
      query = query.eq("process_type", processFilter);
    }

    if (materialFilter) {
      query = query.eq("material", materialFilter);
    }

    const { data: seedParts, error: seedError } = await query;

    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }

    const matchingFamilyIds = Array.from(
      new Set(((seedParts as PartRow[] | null) ?? []).map((part) => part.part_family_id)),
    );

    if (matchingFamilyIds.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
      });
    }

    const { data: familyParts, error: familyError } = await supabase
      .from("parts")
      .select(
        "id, part_family_id, name, part_number, description, process_type, material, revision, revision_index, revision_note, category, status, updated_at, created_at",
      )
      .eq("organization_id", membership.organization_id)
      .in("part_family_id", matchingFamilyIds);

    if (familyError) {
      return NextResponse.json({ error: familyError.message }, { status: 500 });
    }

    const allParts = (familyParts as PartRow[] | null) ?? [];
    const latestRevisionIds = Array.from(
      new Set(
        buildFamilyResults(allParts, new Map())
          .slice(0, limit)
          .map((item) => item.latest_revision.part_id),
      ),
    );

    const { data: latestFiles, error: filesError } =
      latestRevisionIds.length > 0
        ? await supabase
            .from("part_files")
            .select(
              "id, part_id, file_name, file_type, asset_category, file_size_bytes, created_at",
            )
            .in("part_id", latestRevisionIds)
            .order("created_at", { ascending: false })
        : { data: [] as PartFileRow[], error: null };

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

    const filesByPartId = new Map<string, PartFileRow[]>();

    for (const file of ((latestFiles as PartFileRow[] | null) ?? [])) {
      const existing = filesByPartId.get(file.part_id) ?? [];
      existing.push(file);
      filesByPartId.set(file.part_id, existing);
    }

    const items = buildFamilyResults(allParts, filesByPartId).slice(0, limit);

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected search error.",
      },
      { status: 500 },
    );
  }
}
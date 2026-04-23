import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

type LinkStatusBody = {
  provider_key?: string;
  connector_id?: string;
  part_id?: string;
  external_document_id?: string;
  external_item_id?: string;
};

type PartRow = {
  id: string;
  organization_id: string;
  part_family_id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  revision_index: number | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type SourceLinkRow = {
  id: string;
  organization_id: string;
  provider_key: string;
  design_connector_id: string | null;
  part_family_id: string | null;
  part_id: string | null;
  external_workspace_id: string | null;
  external_project_id: string | null;
  external_document_id: string | null;
  external_item_id: string | null;
  external_version_id: string | null;
  external_revision_id: string | null;
  external_name: string | null;
  external_url: string | null;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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

    const body = ((await request.json().catch(() => ({}))) ?? {}) as LinkStatusBody;

    const providerKey = asNullableString(body.provider_key);
    const connectorId = asNullableString(body.connector_id);
    const partId = asNullableString(body.part_id);
    const externalDocumentId = asNullableString(body.external_document_id);
    const externalItemId = asNullableString(body.external_item_id);

    if (!providerKey && !connectorId && !partId && !externalDocumentId && !externalItemId) {
      return NextResponse.json(
        {
          error:
            "At least one of provider_key, connector_id, part_id, external_document_id, or external_item_id is required.",
        },
        { status: 400 },
      );
    }

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
      .from("part_source_links")
      .select("*")
      .eq("organization_id", membership.organization_id)
      .order("updated_at", { ascending: false });

    if (providerKey) {
      query = query.eq("provider_key", providerKey);
    }

    if (connectorId) {
      query = query.eq("design_connector_id", connectorId);
    }

    if (partId) {
      query = query.eq("part_id", partId);
    }

    if (externalDocumentId) {
      query = query.eq("external_document_id", externalDocumentId);
    }

    if (externalItemId) {
      query = query.eq("external_item_id", externalItemId);
    }

    const { data: links, error: linksError } = await query.limit(20);

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 });
    }

    const sourceLinks = (links as SourceLinkRow[] | null) ?? [];

    if (sourceLinks.length === 0) {
      return NextResponse.json({
        items: [],
        total: 0,
      });
    }

    const partIds = Array.from(
      new Set(
        sourceLinks
          .map((link) => link.part_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const familyIds = Array.from(
      new Set(
        sourceLinks
          .map((link) => link.part_family_id)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const { data: linkedParts, error: linkedPartsError } =
      partIds.length > 0
        ? await supabase
            .from("parts")
            .select(
              "id, organization_id, part_family_id, name, part_number, revision, revision_index, status, updated_at, created_at",
            )
            .in("id", partIds)
            .eq("organization_id", membership.organization_id)
        : { data: [] as PartRow[], error: null };

    if (linkedPartsError) {
      return NextResponse.json({ error: linkedPartsError.message }, { status: 500 });
    }

    const { data: familyParts, error: familyPartsError } =
      familyIds.length > 0
        ? await supabase
            .from("parts")
            .select(
              "id, organization_id, part_family_id, name, part_number, revision, revision_index, status, updated_at, created_at",
            )
            .in("part_family_id", familyIds)
            .eq("organization_id", membership.organization_id)
        : { data: [] as PartRow[], error: null };

    if (familyPartsError) {
      return NextResponse.json({ error: familyPartsError.message }, { status: 500 });
    }

    const partMap = new Map(
      (((linkedParts as PartRow[] | null) ?? [])).map((part) => [part.id, part] as const),
    );

    const familyMap = new Map<string, PartRow[]>();

    for (const part of ((familyParts as PartRow[] | null) ?? [])) {
      const existing = familyMap.get(part.part_family_id) ?? [];
      existing.push(part);
      familyMap.set(part.part_family_id, existing);
    }

    const items = sourceLinks.map((link) => {
      const linkedPart = link.part_id ? partMap.get(link.part_id) ?? null : null;
      const familyRevisions = link.part_family_id
        ? [...(familyMap.get(link.part_family_id) ?? [])].sort(comparePartsByRevision)
        : [];
      const latestRevision = familyRevisions[0] ?? null;

      return {
        id: link.id,
        provider_key: link.provider_key,
        design_connector_id: link.design_connector_id,
        external: {
          workspace_id: link.external_workspace_id,
          project_id: link.external_project_id,
          document_id: link.external_document_id,
          item_id: link.external_item_id,
          version_id: link.external_version_id,
          revision_id: link.external_revision_id,
          name: link.external_name,
          url: link.external_url,
        },
        linked_part: linkedPart
          ? {
              part_id: linkedPart.id,
              part_family_id: linkedPart.part_family_id,
              name: linkedPart.name,
              part_number: linkedPart.part_number,
              revision: linkedPart.revision,
              revision_index: linkedPart.revision_index,
              status: linkedPart.status,
              updated_at: linkedPart.updated_at,
              created_at: linkedPart.created_at,
            }
          : null,
        family_status: {
          revision_count: familyRevisions.length,
          latest_revision: latestRevision
            ? {
                part_id: latestRevision.id,
                revision: latestRevision.revision,
                revision_index: latestRevision.revision_index,
                status: latestRevision.status,
                updated_at: latestRevision.updated_at,
                created_at: latestRevision.created_at,
                is_linked_revision: latestRevision.id === link.part_id,
              }
            : null,
        },
        sync: {
          last_sync_at: link.last_sync_at,
          last_sync_status: link.last_sync_status,
          last_error: link.last_error,
          created_at: link.created_at,
          updated_at: link.updated_at,
        },
      };
    });

    return NextResponse.json({
      items,
      total: items.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected link-status error.",
      },
      { status: 500 },
    );
  }
}
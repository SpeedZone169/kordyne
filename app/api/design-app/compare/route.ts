import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "fusion",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

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

    const { data: parts, error: partsError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("part_family_id", partFamilyId)
      .order("revision_index", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1);

    if (partsError) {
      return NextResponse.json(
        { ok: false, error: partsError.message },
        { status: 500 },
      );
    }

    const latestPart = (parts ?? [])[0] as Record<string, unknown> | undefined;

    if (!latestPart) {
      return NextResponse.json(
        { ok: false, error: "No part found for this family." },
        { status: 404 },
      );
    }

    const { data: sourceLinks, error: sourceLinksError } = await ctx.supabase
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
      currentDocumentName.trim().toLowerCase() ===
        latestName.trim().toLowerCase();

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
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
    };

    const partFamilyId = body.part_family_id?.trim();

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

    const { data: files, error: filesError } = await ctx.supabase
      .from("part_files")
      .select("*")
      .eq("part_id", String(latestPart.id))
      .order("created_at", { ascending: false });

    if (filesError) {
      return NextResponse.json(
        { ok: false, error: filesError.message },
        { status: 500 },
      );
    }

    const { data: sourceLinks, error: sourceLinksError } = await ctx.supabase
      .from("part_source_links")
      .select("*")
      .eq("part_family_id", partFamilyId)
      .eq("provider_key", "fusion")
      .order("created_at", { ascending: false });

    if (sourceLinksError) {
      return NextResponse.json(
        { ok: false, error: sourceLinksError.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      latest_part: latestPart,
      files: files ?? [],
      source_links: sourceLinks ?? [],
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
import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../../lib/design-app/request-auth";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toPartSummary(part: Record<string, unknown>) {
  return {
    part_id: String(part.id ?? ""),
    part_family_id: String(part.part_family_id ?? ""),
    name: part.name ?? null,
    part_number: part.part_number ?? null,
    revision: part.revision ?? null,
    revision_index: part.revision_index ?? null,
    status: part.status ?? null,
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
      part_id?: string;
    };

    const partId = asString(body.part_id);

    if (!partId) {
      return NextResponse.json(
        { ok: false, error: "part_id is required." },
        { status: 400 },
      );
    }

    const { data: currentPart, error: currentPartError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("id", partId)
      .eq("organization_id", ctx.organizationId)
      .maybeSingle();

    if (currentPartError) {
      return NextResponse.json(
        { ok: false, error: currentPartError.message },
        { status: 500 },
      );
    }

    if (!currentPart?.id || !currentPart.part_family_id) {
      return NextResponse.json(
        { ok: false, error: "Kordyne source part not found." },
        { status: 404 },
      );
    }

    const familyId = String(currentPart.part_family_id);

    const { data: revisions, error: revisionsError } = await ctx.supabase
      .from("parts")
      .select("*")
      .eq("organization_id", ctx.organizationId)
      .eq("part_family_id", familyId)
      .order("revision_index", { ascending: false });

    if (revisionsError) {
      return NextResponse.json(
        { ok: false, error: revisionsError.message },
        { status: 500 },
      );
    }

    const revisionRows = (revisions ?? []) as Array<Record<string, unknown>>;
    const latestPart = revisionRows[0] ?? (currentPart as Record<string, unknown>);

    const currentRevisionIndex = Number(currentPart.revision_index ?? -1);
    const latestRevisionIndex = Number(latestPart.revision_index ?? -1);

    return NextResponse.json({
      ok: true,
      current: toPartSummary(currentPart as Record<string, unknown>),
      latest: toPartSummary(latestPart),
      revisions: revisionRows.map(toPartSummary),
      status: {
        is_latest_revision: currentRevisionIndex === latestRevisionIndex,
        current_revision_index: currentRevisionIndex,
        latest_revision_index: latestRevisionIndex,
        revision_count: revisionRows.length,
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

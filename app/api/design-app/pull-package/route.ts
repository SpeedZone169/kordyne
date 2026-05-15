import { NextResponse } from "next/server";
import { createDesignAppAdminClient } from "../../../../lib/design-app/admin";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

type PartFileRecord = Record<string, unknown> & {
  storage_path?: string | null;
  file_name?: string | null;
  file_size_bytes?: number | null;
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    const ctx = await getDesignAppRequestContext(request, {
      providerKey: "fusion",
      allowedRoles: ["admin", "engineer"],
      requireEntitlement: true,
    });

    if ("error" in ctx) return ctx.error;

    const admin = createDesignAppAdminClient();
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

    const signedFiles = await Promise.all(
      ((files ?? []) as PartFileRecord[]).map(async (file) => {
        const storagePath = asString(file.storage_path);

        if (!storagePath) {
          return {
            ...file,
            signed_url: null,
            filename: asString(file.file_name),
            size_bytes:
              typeof file.file_size_bytes === "number"
                ? file.file_size_bytes
                : null,
          };
        }

        const { data: signed, error: signedError } = await admin.storage
          .from(DESIGN_UPLOAD_BUCKET)
          .createSignedUrl(storagePath, 10 * 60);

        if (signedError || !signed?.signedUrl) {
          throw new Error(
            signedError?.message ?? "Could not create a signed file URL.",
          );
        }

        return {
          ...file,
          signed_url: signed.signedUrl,
          filename: asString(file.file_name),
          size_bytes:
            typeof file.file_size_bytes === "number"
              ? file.file_size_bytes
              : null,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      latest_part: latestPart,
      files: signedFiles,
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

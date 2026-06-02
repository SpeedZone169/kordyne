import { NextResponse } from "next/server";
import { getDesignAppRequestContext } from "../../../../lib/design-app/request-auth";
import { createDesignAppAdminClient } from "../../../../lib/design-app/admin";

const DESIGN_UPLOAD_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DESIGN_UPLOAD_BUCKET || "part-files";

function normalize(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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

type ThumbnailInfo = {
  thumbnail_file_id: string | null;
  thumbnail_file_name: string | null;
  thumbnail_storage_path: string | null;
  thumbnail_url: string | null;
};

function emptyThumbnail(): ThumbnailInfo {
  return {
    thumbnail_file_id: null,
    thumbnail_file_name: null,
    thumbnail_storage_path: null,
    thumbnail_url: null,
  };
}

function toRevisionItem(part: Record<string, unknown>, thumbnail?: ThumbnailInfo) {
  const thumbnailInfo = thumbnail ?? emptyThumbnail();

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
    thumbnail_file_id: thumbnailInfo.thumbnail_file_id,
    thumbnail_file_name: thumbnailInfo.thumbnail_file_name,
    thumbnail_storage_path: thumbnailInfo.thumbnail_storage_path,
    thumbnail_url: thumbnailInfo.thumbnail_url,
    thumbnail_signed_url: thumbnailInfo.thumbnail_url,
    preview_url: thumbnailInfo.thumbnail_url,
    image_url: thumbnailInfo.thumbnail_url,
  };
}

function isImageContentType(value: unknown) {
  return normalize(value).startsWith("image/");
}

function isImageFileName(value: unknown) {
  const name = normalize(value);
  return (
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp")
  );
}

function thumbnailPreferenceScore(file: Record<string, unknown>) {
  const assetCategory = normalize(file.asset_category);
  const fileType = normalize(file.file_type);
  const fileName = normalize(file.file_name);
  let score = 0;

  if (assetCategory === "image") score += 20;
  if (fileName.includes("preview")) score += 20;
  if (fileName.includes("thumbnail")) score += 18;
  if (fileName.endsWith(".png") || fileType.includes("png")) score += 16;
  if (
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileType.includes("jpeg")
  ) {
    score += 14;
  }
  if (fileName.endsWith(".webp") || fileType.includes("webp")) score += 4;

  return score;
}

async function loadThumbnailMap(
  admin: ReturnType<typeof createDesignAppAdminClient>,
  partIds: string[],
) {
  const thumbnailByPartId = new Map<string, ThumbnailInfo>();

  if (partIds.length === 0) return thumbnailByPartId;

  const { data: imageFiles, error: imageFilesError } = await admin
    .from("part_files")
    .select(
      "id, part_id, file_name, file_type, storage_path, file_size_bytes, asset_category, created_at",
    )
    .in("part_id", partIds)
    .order("created_at", { ascending: false });

  if (imageFilesError) throw new Error(imageFilesError.message);

  const sortedImageFiles = [...(imageFiles ?? [])].sort((a, b) => {
    const left = a as Record<string, unknown>;
    const right = b as Record<string, unknown>;
    const scoreDelta =
      thumbnailPreferenceScore(right) - thumbnailPreferenceScore(left);

    if (scoreDelta !== 0) return scoreDelta;

    return String(right.created_at ?? "").localeCompare(
      String(left.created_at ?? ""),
    );
  });

  for (const file of sortedImageFiles) {
    const record = file as Record<string, unknown>;
    const partId = String(record.part_id ?? "");

    if (!partId || thumbnailByPartId.has(partId)) continue;

    const assetCategory = normalize(record.asset_category);
    const fileType = record.file_type;
    const fileName = record.file_name;

    if (
      assetCategory !== "image" &&
      !isImageContentType(fileType) &&
      !isImageFileName(fileName)
    ) {
      continue;
    }

    const storagePath = asString(record.storage_path);
    if (!storagePath) continue;

    const { data: signed, error: signedError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .createSignedUrl(storagePath, 10 * 60);

    if (signedError || !signed?.signedUrl) continue;

    thumbnailByPartId.set(partId, {
      thumbnail_file_id: String(record.id ?? "") || null,
      thumbnail_file_name: asString(record.file_name) || null,
      thumbnail_storage_path: storagePath,
      thumbnail_url: signed.signedUrl,
    });
  }

  return thumbnailByPartId;
}

async function loadSourceLinkThumbnailMap(
  admin: ReturnType<typeof createDesignAppAdminClient>,
  sourceLinksByFamily: Map<string, Record<string, unknown>>,
) {
  const thumbnailByFamilyId = new Map<string, ThumbnailInfo>();

  for (const [familyId, sourceLink] of sourceLinksByFamily.entries()) {
    const metadata = asRecord(sourceLink.metadata);
    const storagePath = asString(metadata.thumbnail_storage_path);

    if (!storagePath) continue;

    const { data: signed, error: signedError } = await admin.storage
      .from(DESIGN_UPLOAD_BUCKET)
      .createSignedUrl(storagePath, 10 * 60);

    if (signedError || !signed?.signedUrl) continue;

    thumbnailByFamilyId.set(familyId, {
      thumbnail_file_id: asString(metadata.thumbnail_file_id) || null,
      thumbnail_file_name: asString(metadata.thumbnail_filename) || null,
      thumbnail_storage_path: storagePath,
      thumbnail_url: signed.signedUrl,
    });
  }

  return thumbnailByFamilyId;
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

    const admin = createDesignAppAdminClient();

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
    const partIds = Array.from(
      new Set(
        (parts ?? [])
          .map((part) => String((part as Record<string, unknown>).id ?? ""))
          .filter(Boolean),
      ),
    );

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

    const thumbnailByPartId = await loadThumbnailMap(admin, partIds);
    const thumbnailByFamilyId = await loadSourceLinkThumbnailMap(
      admin,
      sourceLinksByFamily,
    );

    const items = Array.from(grouped.entries())
      .map(([familyId, familyParts]) => {
        const sortedFamilyParts = familyParts.sort(
          (a, b) =>
            Number(b.revision_index ?? -1) - Number(a.revision_index ?? -1),
        );

        const revisions = sortedFamilyParts.map((part) =>
          toRevisionItem(part, thumbnailByPartId.get(String(part.id ?? ""))),
        );

        const latest = revisions[0] ?? null;
        const familyThumbnail = revisions.find(
          (revision) => revision.thumbnail_url,
        );
        const sourceThumbnail = thumbnailByFamilyId.get(familyId) ?? null;

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
          thumbnail_file_id:
            latest?.thumbnail_file_id ??
            familyThumbnail?.thumbnail_file_id ??
            sourceThumbnail?.thumbnail_file_id ??
            null,
          thumbnail_file_name:
            latest?.thumbnail_file_name ??
            familyThumbnail?.thumbnail_file_name ??
            sourceThumbnail?.thumbnail_file_name ??
            null,
          thumbnail_storage_path:
            latest?.thumbnail_storage_path ??
            familyThumbnail?.thumbnail_storage_path ??
            sourceThumbnail?.thumbnail_storage_path ??
            null,
          thumbnail_url:
            latest?.thumbnail_url ??
            familyThumbnail?.thumbnail_url ??
            sourceThumbnail?.thumbnail_url ??
            null,
          thumbnail_signed_url:
            latest?.thumbnail_url ??
            familyThumbnail?.thumbnail_url ??
            sourceThumbnail?.thumbnail_url ??
            null,
          preview_url:
            latest?.thumbnail_url ??
            familyThumbnail?.thumbnail_url ??
            sourceThumbnail?.thumbnail_url ??
            null,
          image_url:
            latest?.thumbnail_url ??
            familyThumbnail?.thumbnail_url ??
            sourceThumbnail?.thumbnail_url ??
            null,
          revisions,
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

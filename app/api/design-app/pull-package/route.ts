import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

type PullPackageBody = {
  part_id?: string;
  part_family_id?: string;
  file_roles?: string[];
  asset_categories?: string[];
};

type PartRow = {
  id: string;
  organization_id: string;
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
  created_at: string;
  updated_at: string | null;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  asset_category: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  created_at: string;
};

type SourceLinkRow = {
  id: string;
  provider_key: string;
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
};

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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

function buildDownloadUrl(fileId: string) {
  return `/api/part-files/${fileId}/content?mode=download`;
}

function buildInlineUrl(fileId: string) {
  return `/api/part-files/${fileId}/content?mode=inline`;
}

function getPreviewKind(
  fileName: string,
  fileType: string | null,
): "image" | "pdf" | "cad" | "other" {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = (fileType || "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  if (mime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (["stl", "step", "stp", "iges", "igs"].includes(extension)) {
    return "cad";
  }

  return "other";
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

    const body = ((await request.json().catch(() => ({}))) ??
      {}) as PullPackageBody;

    const partId = asNullableString(body.part_id);
    const partFamilyId = asNullableString(body.part_family_id);
    const fileRoles = asStringArray(body.file_roles);
    const assetCategories = asStringArray(body.asset_categories);

    if (!partId && !partFamilyId) {
      return NextResponse.json(
        { error: "part_id or part_family_id is required." },
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

    let targetPart: PartRow | null = null;

    if (partId) {
      const { data, error } = await supabase
        .from("parts")
        .select(
          "id, organization_id, part_family_id, name, part_number, description, process_type, material, revision, revision_index, revision_note, category, status, created_at, updated_at",
        )
        .eq("id", partId)
        .eq("organization_id", membership.organization_id)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: error?.message || "Part not found." },
          { status: 404 },
        );
      }

      targetPart = data as PartRow;
    } else {
      const { data, error } = await supabase
        .from("parts")
        .select(
          "id, organization_id, part_family_id, name, part_number, description, process_type, material, revision, revision_index, revision_note, category, status, created_at, updated_at",
        )
        .eq("part_family_id", partFamilyId as string)
        .eq("organization_id", membership.organization_id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const familyParts = (data as PartRow[] | null) ?? [];
      if (familyParts.length === 0) {
        return NextResponse.json(
          { error: "Part family not found." },
          { status: 404 },
        );
      }

      targetPart = [...familyParts].sort(comparePartsByRevision)[0] ?? null;
    }

    if (!targetPart) {
      return NextResponse.json(
        { error: "Unable to resolve target revision." },
        { status: 404 },
      );
    }

    const { data: familyParts, error: familyError } = await supabase
      .from("parts")
      .select(
        "id, organization_id, part_family_id, name, part_number, description, process_type, material, revision, revision_index, revision_note, category, status, created_at, updated_at",
      )
      .eq("part_family_id", targetPart.part_family_id)
      .eq("organization_id", membership.organization_id);

    if (familyError) {
      return NextResponse.json({ error: familyError.message }, { status: 500 });
    }

    const revisions = ((familyParts as PartRow[] | null) ?? []).sort(
      comparePartsByRevision,
    );

    const { data: sourceLinks, error: sourceLinkError } = await supabase
      .from("part_source_links")
      .select(
        "id, provider_key, external_workspace_id, external_project_id, external_document_id, external_item_id, external_version_id, external_revision_id, external_name, external_url, last_sync_at, last_sync_status",
      )
      .eq("part_id", targetPart.id)
      .eq("organization_id", membership.organization_id)
      .order("updated_at", { ascending: false })
      .limit(5);

    if (sourceLinkError) {
      return NextResponse.json({ error: sourceLinkError.message }, { status: 500 });
    }

    let fileQuery = supabase
      .from("part_files")
      .select(
        "id, part_id, file_name, file_type, asset_category, file_size_bytes, storage_path, created_at",
      )
      .eq("part_id", targetPart.id)
      .order("created_at", { ascending: false });

    if (assetCategories.length > 0) {
      fileQuery = fileQuery.in("asset_category", assetCategories);
    }

    const { data: fileRows, error: filesError } = await fileQuery;

    if (filesError) {
      return NextResponse.json({ error: filesError.message }, { status: 500 });
    }

    const files = ((fileRows as PartFileRow[] | null) ?? [])
      .filter((file) => {
        if (fileRoles.length === 0) return true;

        const extension = file.file_name.split(".").pop()?.toLowerCase() ?? "";

        return fileRoles.some((role) => {
          switch (role) {
            case "step":
              return ["step", "stp"].includes(extension);
            case "native_cad":
              return [
                "f3d",
                "f3z",
                "sldprt",
                "sldasm",
                "ipt",
                "iam",
                "par",
                "asm",
              ].includes(extension);
            case "drawing_pdf":
              return extension === "pdf";
            case "preview_image":
              return ["png", "jpg", "jpeg", "webp"].includes(extension);
            case "manufacturing_doc":
            case "quality_doc":
            case "other":
              return true;
            default:
              return true;
          }
        });
      })
      .map((file) => ({
        id: file.id,
        file_name: file.file_name,
        file_type: file.file_type,
        asset_category: file.asset_category,
        file_size_bytes: file.file_size_bytes,
        storage_path: file.storage_path,
        created_at: file.created_at,
        preview_kind: getPreviewKind(file.file_name, file.file_type),
        download_url: buildDownloadUrl(file.id),
        inline_url: buildInlineUrl(file.id),
      }));

    return NextResponse.json({
      item: {
        part_id: targetPart.id,
        part_family_id: targetPart.part_family_id,
        name: targetPart.name,
        part_number: targetPart.part_number,
        description: targetPart.description,
        process_type: targetPart.process_type,
        material: targetPart.material,
        category: targetPart.category,
        revision: targetPart.revision,
        revision_index: targetPart.revision_index,
        revision_note: targetPart.revision_note,
        status: targetPart.status,
        created_at: targetPart.created_at,
        updated_at: targetPart.updated_at,
      },
      revisions: revisions.map((part) => ({
        part_id: part.id,
        revision: part.revision,
        revision_index: part.revision_index,
        revision_note: part.revision_note,
        status: part.status,
        created_at: part.created_at,
        updated_at: part.updated_at,
        is_current: part.id === targetPart.id,
      })),
      source_links: ((sourceLinks as SourceLinkRow[] | null) ?? []).map((link) => ({
        id: link.id,
        provider_key: link.provider_key,
        external_workspace_id: link.external_workspace_id,
        external_project_id: link.external_project_id,
        external_document_id: link.external_document_id,
        external_item_id: link.external_item_id,
        external_version_id: link.external_version_id,
        external_revision_id: link.external_revision_id,
        external_name: link.external_name,
        external_url: link.external_url,
        last_sync_at: link.last_sync_at,
        last_sync_status: link.last_sync_status,
      })),
      files,
      total_files: files.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected pull-package error.",
      },
      { status: 500 },
    );
  }
}
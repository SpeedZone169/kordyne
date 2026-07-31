import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type SearchSuggestion = {
  id: string;
  type: "part" | "project" | "request";
  label: string;
  subtitle: string;
  href: string;
  updatedAt: string;
  thumbnailUrl?: string | null;
};

type PartRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  status: string | null;
  process_type: string | null;
  material: string | null;
  updated_at: string | null;
  created_at: string;
};

type ProjectRow = {
  id: string;
  name: string;
  project_type: string;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type RequestRow = {
  id: string;
  title: string | null;
  requested_item_name: string | null;
  requested_item_reference: string | null;
  status: string;
  request_type: string | null;
  priority: string | null;
  updated_at: string | null;
  created_at: string;
};

type ProjectPartLinkRow = {
  project_id: string;
  part_id: string;
  is_primary_part: boolean;
};

type PartFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  storage_path: string;
  asset_category: string | null;
  created_at: string;
};

function formatLabel(value: string | null | undefined) {
  if (!value) return "";

  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function priorityLabel(value: string | null | undefined) {
  return value ? formatLabel(value) : "Normal";
}

function isImageFile(file: PartFileRow) {
  const fileName = file.file_name.toLowerCase();
  const fileType = (file.file_type || "").toLowerCase();

  return (
    file.asset_category?.toLowerCase() === "image" ||
    fileType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
      fileName.endsWith(extension),
    )
  );
}

function thumbnailPreference(file: PartFileRow) {
  const assetCategory = (file.asset_category || "").toLowerCase();
  const fileType = (file.file_type || "").toLowerCase();
  const fileName = file.file_name.toLowerCase();
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

function getTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ suggestions: [] });
  }

  const normalizedTerm = query
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s_-]/gu, " ")
    .trim()
    .replace(/\s+/g, "%");

  if (!normalizedTerm) {
    return NextResponse.json({ suggestions: [] });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: "Search is unavailable." }, { status: 500 });
  }

  const organizationId = membership?.organization_id as string | undefined;

  if (!organizationId) {
    return NextResponse.json({ suggestions: [] });
  }

  const pattern = `%${normalizedTerm}%`;
  const [partsResult, projectsResult, requestsResult] = await Promise.all([
    supabase
      .from("parts")
      .select(
        "id, name, part_number, revision, status, process_type, material, updated_at, created_at",
      )
      .eq("organization_id", organizationId)
      .or(
        `name.ilike.${pattern},part_number.ilike.${pattern},revision.ilike.${pattern},process_type.ilike.${pattern},material.ilike.${pattern}`,
      )
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("projects")
      .select("id, name, project_type, status, updated_at, created_at")
      .eq("organization_id", organizationId)
      .ilike("name", pattern)
      .order("updated_at", { ascending: false })
      .limit(12),
    supabase
      .from("service_requests")
      .select(
        "id, title, requested_item_name, requested_item_reference, status, request_type, priority, updated_at, created_at",
      )
      .eq("organization_id", organizationId)
      .or(
        `title.ilike.${pattern},requested_item_name.ilike.${pattern},requested_item_reference.ilike.${pattern},request_type.ilike.${pattern}`,
      )
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  if (partsResult.error || projectsResult.error || requestsResult.error) {
    return NextResponse.json({ error: "Search is unavailable." }, { status: 500 });
  }

  const parts = (partsResult.data ?? []) as PartRow[];
  const projects = (projectsResult.data ?? []) as ProjectRow[];
  const requests = (requestsResult.data ?? []) as RequestRow[];
  const projectIds = projects.map((project) => project.id);
  const { data: projectLinksRaw } = projectIds.length
    ? await supabase
        .from("project_part_links")
        .select("project_id, part_id, is_primary_part")
        .in("project_id", projectIds)
    : { data: [] as ProjectPartLinkRow[] };
  const projectLinks = (projectLinksRaw ?? []) as ProjectPartLinkRow[];
  const projectThumbnailPartId = new Map<string, string>();

  for (const link of projectLinks) {
    if (link.is_primary_part || !projectThumbnailPartId.has(link.project_id)) {
      projectThumbnailPartId.set(link.project_id, link.part_id);
    }
  }

  const thumbnailPartIds = Array.from(
    new Set([
      ...parts.map((part) => part.id),
      ...projectThumbnailPartId.values(),
    ]),
  );
  const { data: partFilesRaw } = thumbnailPartIds.length
    ? await supabase
        .from("part_files")
        .select(
          "id, part_id, file_name, file_type, storage_path, asset_category, created_at",
        )
        .in("part_id", thumbnailPartIds)
        .order("created_at", { ascending: false })
    : { data: [] as PartFileRow[] };
  const partFiles = ((partFilesRaw ?? []) as PartFileRow[])
    .filter(isImageFile)
    .sort((left, right) => {
      const scoreDifference =
        thumbnailPreference(right) - thumbnailPreference(left);
      return scoreDifference || right.created_at.localeCompare(left.created_at);
    });
  const thumbnailFileByPartId = new Map<string, PartFileRow>();

  for (const file of partFiles) {
    if (!thumbnailFileByPartId.has(file.part_id)) {
      thumbnailFileByPartId.set(file.part_id, file);
    }
  }

  const thumbnailUrlByPartId = new Map<string, string>();
  const thumbnailEntries = Array.from(thumbnailFileByPartId.entries());

  if (thumbnailEntries.length) {
    const { data: signedUrls } = await supabase.storage
      .from("part-files")
      .createSignedUrls(
        thumbnailEntries.map(([, file]) => file.storage_path),
        10 * 60,
      );

    signedUrls?.forEach((signedUrl, index) => {
      const entry = thumbnailEntries[index];
      if (entry && signedUrl.signedUrl) {
        thumbnailUrlByPartId.set(entry[0], signedUrl.signedUrl);
      }
    });
  }

  const suggestions: SearchSuggestion[] = [
    ...parts.map((part) => ({
      id: part.id,
      type: "part" as const,
      label: part.part_number ? `${part.name} (${part.part_number})` : part.name,
      subtitle:
        [
          part.revision ? `Rev ${part.revision}` : null,
          part.process_type,
          part.material,
          formatLabel(part.status),
        ]
          .filter(Boolean)
          .join(" - ") || "Part Vault",
      href: `/dashboard/parts/${part.id}`,
      updatedAt: part.updated_at || part.created_at,
      thumbnailUrl: thumbnailUrlByPartId.get(part.id) ?? null,
    })),
    ...projects.map((project) => ({
      id: project.id,
      type: "project" as const,
      label: project.name,
      subtitle:
        [
          project.project_type === "single_part_workspace"
            ? "Part Workspace"
            : "Project",
          formatLabel(project.status),
        ]
          .filter(Boolean)
          .join(" - ") || "Project workspace",
      href: `/dashboard/projects/${project.id}`,
      updatedAt: project.updated_at || project.created_at,
      thumbnailUrl:
        thumbnailUrlByPartId.get(
          projectThumbnailPartId.get(project.id) || "",
        ) ?? null,
    })),
    ...requests.map((serviceRequest) => ({
      id: serviceRequest.id,
      type: "request" as const,
      label:
        serviceRequest.title ||
        serviceRequest.requested_item_name ||
        serviceRequest.requested_item_reference ||
        `Request ${serviceRequest.id.slice(0, 8)}`,
      subtitle:
        [
          formatLabel(serviceRequest.request_type),
          `${priorityLabel(serviceRequest.priority)} priority`,
          formatLabel(serviceRequest.status),
        ]
          .filter(Boolean)
          .join(" - ") || "Service request",
      href: `/dashboard/requests/${serviceRequest.id}`,
      updatedAt: serviceRequest.updated_at || serviceRequest.created_at,
    })),
  ]
    .sort((left, right) => {
      const normalizedQuery = query.toLowerCase();
      const leftStarts = left.label.toLowerCase().startsWith(normalizedQuery);
      const rightStarts = right.label.toLowerCase().startsWith(normalizedQuery);

      if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
      return getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt);
    })
    .slice(0, 7);

  return NextResponse.json(
    { suggestions },
    {
      headers: {
        "Cache-Control": "private, max-age=30",
      },
    },
  );
}

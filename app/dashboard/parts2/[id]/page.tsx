import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UploadSection from "../../parts/[id]/UploadSection";
import FileActions from "../../parts/[id]/FileActions";
import PartStatusEditor from "../../parts/[id]/PartStatusEditor";
import ServiceRequestActions from "../../parts/[id]/ServiceRequestActions";
import ServiceRequestHistory from "../../parts/[id]/ServiceRequestHistory";
import CreateRevisionButton from "../../parts/[id]/CreateRevisionButton";
import PartWorkspaceClient from "../../parts/[id]/PartWorkspaceClient";
import PartProjectActions from "../../parts/[id]/PartProjectActions";
import { getPartCategoryLabel, getProcessTypeLabel } from "@/lib/parts";

type PageProps = {
  params: Promise<{ id: string }>;
};

const CATEGORY_ORDER = [
  "cad_3d",
  "drawing_2d",
  "image",
  "manufacturing_doc",
  "quality_doc",
  "other",
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  cad_3d: "CAD 3D",
  drawing_2d: "2D Drawings",
  image: "Images",
  manufacturing_doc: "Manufacturing Docs",
  quality_doc: "Quality Docs",
  other: "Other",
};

type PartFile = {
  id: string;
  part_id: string;
  user_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  storage_path: string;
  asset_category: string | null;
  created_at: string;
};

type PartFileWithUrls = PartFile & {
  previewUrl: string | null;
  downloadUrl: string | null;
  uploaderName: string | null;
  previewKind: "image" | "pdf" | "cad" | "other";
};

type ProfileRow = {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
};

type RevisionRow = {
  id: string;
  name: string;
  part_number: string | null;
  revision: string | null;
  revision_note: string | null;
  status: string | null;
  updated_at: string | null;
  created_at: string;
};

type FamilyFileRow = {
  id: string;
  part_id: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  asset_category: string | null;
  created_at: string;
};

type FamilySourceFile = {
  id: string;
  partId: string;
  fileName: string;
  fileType: string | null;
  fileSizeBytes: number | null;
  assetCategory: string | null;
  createdAt: string;
  sourceRevision: {
    partId: string;
    revision: string | null;
    name: string;
    partNumber: string | null;
    createdAt: string;
    updatedAt: string | null;
    status: string | null;
    isCurrent: boolean;
  };
};

type PartReviewAnnotationRow = {
  id: string;
  part_id: string;
  part_file_id: string;
  created_by: string;
  assigned_to: string | null;
  title: string;
  status: "open" | "in_review" | "resolved" | "reopened";
  severity: "info" | "question" | "issue" | "critical";
  category:
    | "design"
    | "manufacturability"
    | "quality"
    | "supplier_question"
    | "internal_note"
    | "other";
  visibility: "internal" | "shared";
  position: unknown;
  normal: unknown | null;
  camera: unknown | null;
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

type PartReviewAnnotationSummaryRow = {
  id: string;
  part_id: string;
  status: string;
};

type PartReviewMessageRow = {
  id: string;
  annotation_id: string;
  created_by: string;
  body: string;
  created_at: string;
};

type OrgMemberRow = {
  user_id: string;
  role: string;
};

type ProjectRow = {
  id: string;
  name: string;
  project_type: string;
  status: string | null;
};

type ProjectPartLinkRow = {
  project_id: string;
  is_primary_part: boolean;
};

function groupFilesByCategory(files: PartFileWithUrls[]) {
  const grouped: Record<string, PartFileWithUrls[]> = {
    cad_3d: [],
    drawing_2d: [],
    image: [],
    manufacturing_doc: [],
    quality_doc: [],
    other: [],
  };

  for (const file of files) {
    const category =
      file.asset_category && CATEGORY_LABELS[file.asset_category]
        ? file.asset_category
        : "other";

    grouped[category].push(file);
  }

  return grouped;
}

function formatDate(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(dateString: string | null) {
  if (!dateString) return "-";

  const date = new Date(dateString);

  return new Intl.DateTimeFormat("en-IE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes: number | null) {
  if (!bytes || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDisplayName(profile: ProfileRow | null | undefined) {
  if (!profile) return "-";
  return profile.full_name || profile.email || "-";
}

function getStatusBadgeClass(status: string | null) {
  switch (status) {
    case "active":
      return "bg-emerald-100 text-emerald-800";
    case "draft":
      return "bg-amber-100 text-amber-800";
    case "archived":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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

  if (["stl", "step", "stp"].includes(extension)) {
    return "cad";
  }

  return "other";
}

function parseVector(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const vector = value as Record<string, unknown>;
  if (!vector) return null;

  const x = typeof vector.x === "number" ? vector.x : null;
  const y = typeof vector.y === "number" ? vector.y : null;
  const z = typeof vector.z === "number" ? vector.z : null;

  if (
    x === null ||
    y === null ||
    z === null ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(z)
  ) {
    return null;
  }

  return { x, y, z };
}

function parseCamera(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const camera = value as Record<string, unknown>;
  const position = parseVector(camera.position);
  const target =
    camera.target === null || camera.target === undefined
      ? null
      : parseVector(camera.target);
  const zoom = typeof camera.zoom === "number" ? camera.zoom : null;
  const distance = typeof camera.distance === "number" ? camera.distance : null;

  if (!position) return null;

  return {
    position,
    target,
    zoom: zoom && Number.isFinite(zoom) ? zoom : null,
    distance: distance && Number.isFinite(distance) ? distance : null,
  };
}

function FocusSection({
  eyebrow,
  title,
  description,
  defaultOpen = false,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-[8px] border border-[#003040]/10 bg-white shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition hover:bg-[#003040]/[0.015] [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#003040]/45">
            {eyebrow}
          </span>
          <span className="mt-1 block text-xl font-semibold tracking-tight text-[#003040]">
            {title}
          </span>
          <span className="mt-1 block max-w-3xl text-sm leading-6 text-[#003040]/58">
            {description}
          </span>
        </span>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[#003040]/10 text-lg leading-none text-[#003040]/60 transition group-open:rotate-45 group-hover:border-[#00bdde]/40 group-hover:text-[#003040]">
          +
        </span>
      </summary>
      <div className="border-t border-[#003040]/6 p-5">{children}</div>
    </details>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#003040]/6 py-2.5 last:border-0">
      <span className="text-sm text-[#003040]/55">{label}</span>
      <span className="max-w-[60%] text-right text-sm font-medium text-[#003040]">
        {value ?? "-"}
      </span>
    </div>
  );
}

export default async function PartDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: orgRole } = await supabase.rpc("get_current_org_role");
  const canEditPart = orgRole === "admin" || orgRole === "engineer";
  const canRequest = canEditPart;
  const canComment = true;
  const canManageReview = canEditPart;

  const { data: part, error } = await supabase
    .from("parts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !part) {
    return (
      <section className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-900">Part not found</h1>
        <p className="mt-4 text-slate-600">
          We could not find this part in your vault.
        </p>
      </section>
    );
  }

  const { data: files } = await supabase
    .from("part_files")
    .select("*")
    .eq("part_id", id)
    .order("created_at", { ascending: false });

  const profileIds = Array.from(
    new Set(
      [part.user_id, ...(files || []).map((file) => file.user_id)].filter(Boolean),
    ),
  );

  const { data: profiles } =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", profileIds)
      : { data: [] as ProfileRow[] };

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.user_id, profile]),
  );

  const creatorProfile = part.user_id ? profileMap.get(part.user_id) : null;

  const filesWithUrls: PartFileWithUrls[] = ((files as PartFile[] | null) ?? []).map(
    (file) => {
      const previewKind = getPreviewKind(file.file_name, file.file_type);
      const baseContentUrl = `/api/part-files/${file.id}/content`;

      return {
        ...file,
        previewUrl:
          previewKind === "image" ||
          previewKind === "pdf" ||
          previewKind === "cad"
            ? `${baseContentUrl}?mode=inline`
            : null,
        downloadUrl: `${baseContentUrl}?mode=download`,
        uploaderName: getDisplayName(profileMap.get(file.user_id)),
        previewKind,
      };
    },
  );

  const groupedFiles = groupFilesByCategory(filesWithUrls);

  const { data: revisions } = await supabase
    .from("parts")
    .select(
      "id, name, part_number, revision, revision_note, status, updated_at, created_at",
    )
    .eq("organization_id", part.organization_id)
    .eq("part_family_id", part.part_family_id)
    .order("created_at", { ascending: true });

  const revisionRows = (revisions as RevisionRow[] | null) ?? [];

  const revisionIds = revisionRows.map((revisionPart) => revisionPart.id);

  const { data: familyFiles } =
    revisionIds.length > 0
      ? await supabase
          .from("part_files")
          .select(
            "id, part_id, file_name, file_type, file_size_bytes, asset_category, created_at",
          )
          .in("part_id", revisionIds)
          .order("created_at", { ascending: false })
      : { data: [] as FamilyFileRow[] };

  const revisionMap = new Map(
    revisionRows.map((revisionPart) => [revisionPart.id, revisionPart] as const),
  );

  const familyFilesForRevisionPicker: FamilySourceFile[] = (
    (familyFiles as FamilyFileRow[] | null) ?? []
  ).flatMap((file) => {
    const sourceRevision = revisionMap.get(file.part_id);

    if (!sourceRevision) {
      return [];
    }

    return [
      {
        id: file.id,
        partId: file.part_id,
        fileName: file.file_name,
        fileType: file.file_type,
        fileSizeBytes: file.file_size_bytes,
        assetCategory: file.asset_category,
        createdAt: file.created_at,
        sourceRevision: {
          partId: sourceRevision.id,
          revision: sourceRevision.revision,
          name: sourceRevision.name,
          partNumber: sourceRevision.part_number,
          createdAt: sourceRevision.created_at,
          updatedAt: sourceRevision.updated_at,
          status: sourceRevision.status,
          isCurrent: sourceRevision.id === part.id,
        },
      },
    ];
  });

  const { data: orgMembersRaw } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", part.organization_id);

  const orgMembers = (orgMembersRaw as OrgMemberRow[] | null) ?? [];

  const { data: reviewAnnotationsRaw } = await supabase
    .from("part_review_annotations")
    .select("*")
    .eq("part_id", part.id)
    .order("updated_at", { ascending: false });

  const reviewAnnotationRows =
    (reviewAnnotationsRaw as PartReviewAnnotationRow[] | null) ?? [];

  const reviewAnnotationIds = reviewAnnotationRows.map(
    (annotation) => annotation.id,
  );

  const { data: reviewMessagesRaw } =
    reviewAnnotationIds.length > 0
      ? await supabase
          .from("part_review_annotation_messages")
          .select("id, annotation_id, created_by, body, created_at")
          .in("annotation_id", reviewAnnotationIds)
          .order("created_at", { ascending: true })
      : { data: [] as PartReviewMessageRow[] };

  const reviewMessages =
    (reviewMessagesRaw as PartReviewMessageRow[] | null) ?? [];

  const { data: familyReviewAnnotationRowsRaw } =
    revisionIds.length > 0
      ? await supabase
          .from("part_review_annotations")
          .select("id, part_id, status")
          .in("part_id", revisionIds)
      : { data: [] as PartReviewAnnotationSummaryRow[] };

  const familyReviewAnnotationRows =
    (familyReviewAnnotationRowsRaw as PartReviewAnnotationSummaryRow[] | null) ??
    [];

  const reviewProfileIds = Array.from(
    new Set(
      [
        ...orgMembers.map((member) => member.user_id),
        ...reviewAnnotationRows.map((annotation) => annotation.created_by),
        ...reviewAnnotationRows
          .map((annotation) => annotation.assigned_to)
          .filter((value): value is string => Boolean(value)),
        ...reviewMessages.map((message) => message.created_by),
      ].filter(Boolean),
    ),
  );

  const missingReviewProfileIds = reviewProfileIds.filter(
    (profileId) => !profileMap.has(profileId),
  );

  const { data: reviewProfiles } =
    missingReviewProfileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("user_id, full_name, email, avatar_url")
          .in("user_id", missingReviewProfileIds)
      : { data: [] as ProfileRow[] };

  const reviewProfileMap = new Map(profileMap);

  for (const profile of (reviewProfiles as ProfileRow[] | null) ?? []) {
    reviewProfileMap.set(profile.user_id, profile);
  }

  const reviewMessagesByAnnotationId = new Map<string, PartReviewMessageRow[]>();

  for (const message of reviewMessages) {
    const existingMessages =
      reviewMessagesByAnnotationId.get(message.annotation_id) ?? [];
    existingMessages.push(message);
    reviewMessagesByAnnotationId.set(message.annotation_id, existingMessages);
  }

  const fileNameById = new Map(filesWithUrls.map((file) => [file.id, file.file_name]));

  const reviewAnnotations = reviewAnnotationRows.flatMap((annotation) => {
    const position = parseVector(annotation.position);
    if (!position) return [];

    const normal =
      annotation.normal === null || annotation.normal === undefined
        ? null
        : parseVector(annotation.normal);
    const camera = parseCamera(annotation.camera);
    const creatorProfile = reviewProfileMap.get(annotation.created_by);
    const assigneeProfile = annotation.assigned_to
      ? reviewProfileMap.get(annotation.assigned_to)
      : null;
    const messagesForAnnotation =
      reviewMessagesByAnnotationId.get(annotation.id) ?? [];

    return [
      {
        id: annotation.id,
        partId: annotation.part_id,
        partFileId: annotation.part_file_id,
        fileName: fileNameById.get(annotation.part_file_id) ?? "Part file",
        title: annotation.title,
        status: annotation.status,
        severity: annotation.severity,
        category: annotation.category,
        visibility: annotation.visibility,
        position,
        normal,
        camera,
        dueDate: annotation.due_date,
        createdAt: annotation.created_at,
        updatedAt: annotation.updated_at,
        resolvedAt: annotation.resolved_at,
        creatorUserId: annotation.created_by,
        creatorName: getDisplayName(creatorProfile),
        creatorEmail: creatorProfile?.email ?? null,
        creatorAvatarUrl: creatorProfile?.avatar_url ?? null,
        assignedToUserId: annotation.assigned_to,
        assigneeName: assigneeProfile ? getDisplayName(assigneeProfile) : null,
        messages: messagesForAnnotation.map((message) => {
          const messageProfile = reviewProfileMap.get(message.created_by);

          return {
            id: message.id,
            annotationId: message.annotation_id,
            body: message.body,
            createdAt: message.created_at,
            creatorUserId: message.created_by,
            creatorName: getDisplayName(messageProfile),
            creatorEmail: messageProfile?.email ?? null,
            creatorAvatarUrl: messageProfile?.avatar_url ?? null,
          };
        }),
      },
    ];
  });

  const memberOptions = orgMembers.map((member) => {
    const memberProfile = reviewProfileMap.get(member.user_id);

    return {
      userId: member.user_id,
      name: getDisplayName(memberProfile),
      email: memberProfile?.email ?? null,
      role: member.role,
    };
  });

  const revisionReviewSummaries = revisionRows.map((revisionPart) => {
    const rowsForRevision = familyReviewAnnotationRows.filter(
      (annotation) => annotation.part_id === revisionPart.id,
    );
    const resolvedCount = rowsForRevision.filter(
      (annotation) => annotation.status === "resolved",
    ).length;

    return {
      partId: revisionPart.id,
      revision: revisionPart.revision,
      isCurrent: revisionPart.id === part.id,
      openCount: rowsForRevision.length - resolvedCount,
      resolvedCount,
    };
  });

  const latestRevision = revisionRows[revisionRows.length - 1] ?? null;
  const isLatestRevision = latestRevision ? latestRevision.id === part.id : true;

  const viewerFiles = filesWithUrls.map((file) => ({
    id: file.id,
    fileName: file.file_name,
    fileType: file.file_type,
    fileSizeBytes: file.file_size_bytes,
    assetCategory: file.asset_category,
    createdAt: file.created_at,
    uploaderName: file.uploaderName,
    previewUrl: file.previewUrl,
    downloadUrl: file.downloadUrl,
    previewKind: file.previewKind,
  }));

  const requestFileOptions = filesWithUrls.map((file) => ({
    id: file.id,
    fileName: file.file_name,
    assetCategory: file.asset_category,
    fileType: file.file_type,
  }));

  const { data: linkedProjectRowsRaw } = await supabase
    .from("project_part_links")
    .select("project_id, is_primary_part")
    .eq("part_id", part.id);

  const linkedProjectRows =
    (linkedProjectRowsRaw as ProjectPartLinkRow[] | null) ?? [];
  const linkedProjectIds = linkedProjectRows.map((row) => row.project_id);

  const { data: projectsRaw } = await supabase
    .from("projects")
    .select("id, name, project_type, status")
    .eq("organization_id", part.organization_id)
    .order("updated_at", { ascending: false });

  const projectRows = (projectsRaw as ProjectRow[] | null) ?? [];
  const linkedProjectMap = new Map(
    linkedProjectRows.map((row) => [row.project_id, row] as const),
  );

  const projectOptions = projectRows
    .filter((project) => project.status !== "archived")
    .map((project) => ({
      id: project.id,
      name: project.name,
      projectType: project.project_type,
      status: project.status,
    }));

  const linkedProjects = projectRows
    .filter((project) => linkedProjectIds.includes(project.id))
    .map((project) => ({
      id: project.id,
      name: project.name,
      projectType: project.project_type,
      status: project.status,
      isPrimaryPart: linkedProjectMap.get(project.id)?.is_primary_part ?? false,
    }));

  const revisionSourceFiles = familyFilesForRevisionPicker.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    assetCategory: file.assetCategory,
    fileType: file.fileType,
    sourceRevision: file.sourceRevision.revision,
  }));
  return (
    <section className="mx-auto max-w-[1680px] space-y-4">
      <div className="overflow-hidden rounded-[8px] border border-white/10 bg-[#001827] text-white shadow-[0_18px_45px_rgba(0,24,39,0.18)]">
        <div
          className="p-5 lg:p-6"
          style={{
            background:
              "radial-gradient(circle at 82% 18%, rgba(0,189,222,0.13), transparent 28%), linear-gradient(135deg, rgba(255,255,255,0.025), transparent 54%)",
          }}
        >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
              <Link href="/dashboard" className="transition hover:text-white">
                Workspace
              </Link>
              <span>/</span>
              <Link href="/dashboard/parts" className="transition hover:text-white">
                Part Vault
              </Link>
              <span>/</span>
              <span className="text-white/75">{part.name}</span>
            </div>

            <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-start">
              <Link
                href="/dashboard/parts"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-white/15 bg-white/5 text-white/70 transition hover:border-[#00bdde]/55 hover:text-white"
                aria-label="Back to Part Vault"
              >
                &lt;
              </Link>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[30px] font-semibold leading-tight text-white">
                    {part.name}
                  </h1>
                  <span className="rounded-full border border-[#00bdde]/25 bg-[#00bdde]/12 px-2.5 py-1 text-xs font-semibold text-[#7feafd]">
                    Revision {part.revision || "-"}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
                      part.status,
                    )}`}
                  >
                    {part.status || "-"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/55">
                  Part Vault - {linkedProjects[0]?.name || "Standalone part"} - {part.material || "No material"} - {getProcessTypeLabel(part.process_type)}
                </p>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">
                  {part.description || "No description added yet."}
                </p>
              </div>
            </div>

            {!canEditPart ? (
              <div className="mt-4 rounded-[8px] border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-100">
                You have read-only access. Viewers can browse files, metadata,
                and collaboration but cannot upload, recategorize, delete, or
                update part status.
              </div>
            ) : null}
          </div>

          {canEditPart ? (
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <CreateRevisionButton
                sourcePartId={part.id}
                currentRevision={part.revision}
                sourceFiles={revisionSourceFiles}
              />
              <Link
                href={`/dashboard/parts/${part.id}/edit`}
                className="inline-flex rounded-[8px] border border-white/18 bg-white/8 px-4 py-2 text-sm font-semibold text-white/85 transition hover:border-[#00bdde]/55 hover:bg-white/12"
              >
                Edit part
              </Link>
            </div>
          ) : null}
        </div>

        </div>

        <div className="grid border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-white/10">
          <div className="px-5 py-3 lg:px-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Part no.</p>
            <p className="mt-1 truncate text-base font-semibold text-white">{part.part_number || "-"}</p>
          </div>
          <div className="border-t border-white/10 px-5 py-3 sm:border-t-0 lg:px-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Files</p>
            <p className="mt-1 text-base font-semibold text-white">{filesWithUrls.length}</p>
          </div>
          <div className="border-t border-white/10 px-5 py-3 sm:border-t-0 lg:px-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Revisions</p>
            <p className="mt-1 text-base font-semibold text-white">{revisionRows.length}</p>
          </div>
          <div className="border-t border-white/10 px-5 py-3 sm:border-t-0 lg:px-6">
            <p className="text-[10px] uppercase tracking-[0.14em] text-white/40">Review items</p>
            <p className="mt-1 text-base font-semibold text-white">{reviewAnnotations.length}</p>
          </div>
        </div>
      </div>

      <FocusSection
        eyebrow="Files and CAD"
        title="Part workspace"
        description="Review previews, STL annotations, controlled files, and comments for this exact revision."
        defaultOpen
      >
        <PartWorkspaceClient
          files={viewerFiles}
          annotations={reviewAnnotations}
          partId={part.id}
          revisionLabel={part.revision}
          latestRevisionLabel={latestRevision?.revision ?? null}
          isLatestRevision={isLatestRevision}
          memberOptions={memberOptions}
          canComment={canComment}
          canManageReview={canManageReview}
          revisionReviewSummaries={revisionReviewSummaries}
        />

        <div className="mt-5 overflow-hidden rounded-[8px] border border-[#003040]/8 bg-white">
          <div className="flex flex-col gap-3 border-b border-[#003040]/6 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-[#003040]">Files</h2>
              <p className="mt-1 text-sm text-[#003040]/55">
                Categorized vault files for download, preview, and management.
              </p>
            </div>
            {canEditPart ? (
              <span className="rounded-full bg-[#003040] px-3 py-1.5 text-xs font-semibold text-white">
                Upload in part information section
              </span>
            ) : null}
          </div>

          {filesWithUrls.length > 0 ? (
            <div className="divide-y divide-[#003040]/6">
              {CATEGORY_ORDER.map((category) => {
                const categoryFiles = groupedFiles[category];

                if (!categoryFiles || categoryFiles.length === 0) {
                  return null;
                }

                return (
                  <div key={category} className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#003040]/45">
                        {CATEGORY_LABELS[category]}
                      </h3>
                      <span className="text-sm text-[#003040]/40">
                        {categoryFiles.length}
                      </span>
                    </div>

                    <div className="overflow-hidden rounded-[8px] border border-[#003040]/8">
                      {categoryFiles.map((file) => (
                        <div
                          key={file.id}
                          className="grid gap-3 border-b border-[#003040]/6 px-4 py-3 last:border-0 md:grid-cols-[minmax(0,1fr)_120px_120px_auto] md:items-center"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#003040]">
                              {file.file_name}
                            </p>
                            <p className="mt-1 text-xs text-[#003040]/50">
                              Uploaded {formatDateTime(file.created_at)}
                              {file.uploaderName ? ` by ${file.uploaderName}` : ""}
                            </p>
                          </div>
                          <p className="text-xs text-[#003040]/55">{file.file_type || "unknown"}</p>
                          <p className="text-xs text-[#003040]/55">{formatBytes(file.file_size_bytes)}</p>
                          {canEditPart ? (
                            <FileActions
                              fileId={file.id}
                              fileName={file.file_name}
                              storagePath={file.storage_path}
                              downloadUrl={file.downloadUrl}
                              assetCategory={file.asset_category}
                            />
                          ) : file.downloadUrl ? (
                            <Link
                              href={file.downloadUrl}
                              className="inline-flex rounded-full border border-[#003040]/10 px-3 py-2 text-xs font-semibold text-[#003040] transition hover:border-[#00bdde]/40"
                            >
                              Download
                            </Link>
                          ) : (
                            <span className="text-sm text-[#003040]/40">Download unavailable</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="p-5 text-sm text-[#003040]/58">No files attached yet.</p>
          )}
        </div>
      </FocusSection>

      <FocusSection
        eyebrow="Revisions"
        title="Revision history"
        description="Move through the part family without losing the current revision context."
      >
        {revisionRows.length > 0 ? (
          <div className="relative">
            <div className="absolute bottom-6 left-4 top-6 w-px bg-[#003040]/8" />
            <div className="space-y-0">
              {revisionRows.map((revisionPart) => {
                const isCurrent = revisionPart.id === part.id;

                return (
                  <div key={revisionPart.id} className="relative flex gap-5 pb-6 last:pb-0">
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#003040]/12 bg-white text-xs font-semibold text-[#003040] ring-4 ring-white">
                      {revisionPart.revision || "-"}
                    </div>
                    <Link
                      href={`/dashboard/parts/${revisionPart.id}`}
                      className={`flex-1 rounded-[8px] border p-5 transition ${
                        isCurrent
                          ? "border-[#00bdde]/40 bg-[#00bdde]/[0.04]"
                          : "border-[#003040]/8 bg-white hover:border-[#00bdde]/35"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-[#003040]">
                              Rev {revisionPart.revision || "-"}
                            </span>
                            {isCurrent ? (
                              <span className="rounded-full bg-[#00bdde] px-2 py-0.5 text-[11px] font-semibold text-white">
                                Current
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                                revisionPart.status,
                              )}`}
                            >
                              {revisionPart.status || "-"}
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-[#003040]/65">
                            {revisionPart.revision_note || "No revision note."}
                          </p>
                        </div>
                        <div className="text-right text-xs text-[#003040]/50">
                          <p>{revisionPart.part_number || "No part number"}</p>
                          <p className="mt-1">{formatDateTime(revisionPart.updated_at || revisionPart.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <p className="text-sm text-[#003040]/58">No linked revisions found.</p>
        )}
      </FocusSection>

      <FocusSection
        eyebrow="Projects and sharing"
        title="Where this part is used"
        description="Create project links, share selected files, and keep standalone parts separate from formal projects."
      >
        <PartProjectActions
          partId={part.id}
          partName={part.name}
          partNumber={part.part_number}
          canManage={canEditPart}
          projects={projectOptions}
          linkedProjects={linkedProjects}
          files={requestFileOptions}
        />
      </FocusSection>

      <FocusSection
        eyebrow="Part information"
        title="Metadata and upload controls"
        description="Keep status, material, process, creator, and upload actions visible without crowding the viewer."
      >
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-stretch">
          <div className="rounded-2xl border border-[#003040]/8 bg-white p-5">
            <h2 className="text-lg font-semibold text-[#003040]">Part information</h2>
            <div className="mt-4">
              <InfoRow label="Part number" value={part.part_number || "-"} />
              <InfoRow label="Process type" value={getProcessTypeLabel(part.process_type)} />
              <InfoRow label="Material" value={part.material || "-"} />
              <InfoRow label="Revision" value={part.revision || "-"} />
              <InfoRow label="Revision note" value={part.revision_note || "-"} />
              <InfoRow label="Category" value={getPartCategoryLabel(part.category)} />
              <InfoRow label="Created by" value={getDisplayName(creatorProfile)} />
              <InfoRow label="Created" value={formatDate(part.created_at)} />
              <InfoRow label="Last updated" value={formatDateTime(part.updated_at || part.created_at)} />
              <div className="flex items-start justify-between gap-4 pt-2.5">
                <span className="text-sm text-[#003040]/55">Status</span>
                <span className="max-w-[60%] text-right text-sm font-medium text-[#003040]">
                  {canEditPart ? (
                    <PartStatusEditor partId={part.id} currentStatus={part.status} />
                  ) : (
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                        part.status,
                      )}`}
                    >
                      {part.status || "-"}
                    </span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {canEditPart ? (
            <UploadSection partId={part.id} />
          ) : (
            <div className="rounded-2xl border border-[#003040]/8 bg-white p-5">
              <h2 className="text-lg font-semibold text-[#003040]">Upload files</h2>
              <p className="mt-4 text-sm text-[#003040]/58">
                File upload is available to engineers and admins only.
              </p>
            </div>
          )}
        </div>
      </FocusSection>

      <FocusSection
        eyebrow="Manufacturing requests"
        title="Route this revision"
        description="Send this revision to internal machines, external providers, CAD creation, or optimization workflows."
      >
        <div className="mb-4 flex justify-end">
          <Link
            href="/dashboard/requests"
            className="rounded-full border border-[#003040]/10 px-3 py-2 text-sm font-semibold text-[#003040] transition hover:border-[#00bdde]/40"
          >
            All requests
          </Link>
        </div>
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <ServiceRequestActions
            partId={part.id}
            canRequest={canRequest}
            availableFiles={requestFileOptions}
          />
          <ServiceRequestHistory partId={part.id} />
        </div>
      </FocusSection>
    </section>
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReviewAnnotationStatus =
  | "open"
  | "in_review"
  | "resolved"
  | "reopened";

export type ReviewAnnotationSeverity =
  | "info"
  | "question"
  | "issue"
  | "critical";

export type ReviewAnnotationCategory =
  | "design"
  | "manufacturability"
  | "quality"
  | "supplier_question"
  | "internal_note"
  | "other";

export type ReviewAnnotationVisibility = "internal" | "shared";

export type VectorPoint = {
  x: number;
  y: number;
  z: number;
};

export type ReviewAnnotationCamera = {
  position: VectorPoint;
  target: VectorPoint | null;
  zoom: number | null;
  distance: number | null;
};

export type ParsedReviewTarget = {
  targetKind: "stl_surface_point";
  position: VectorPoint;
  normal: VectorPoint | null;
  camera: ReviewAnnotationCamera | null;
};

export type PartReviewAccess = {
  part: {
    id: string;
    name: string;
    revision: string | null;
    organization_id: string;
  };
  membership: {
    organization_id: string;
    role: string;
  };
  canManageReview: boolean;
};

export type ReviewAnnotationAccess = PartReviewAccess & {
  annotation: {
    id: string;
    organization_id: string;
    part_id: string;
    part_file_id: string;
    created_by: string;
    assigned_to: string | null;
    title: string;
    status: string;
    severity: string;
    category: string;
    visibility: string;
  };
  canUpdateAnnotation: boolean;
};

export const REVIEW_STATUSES: ReviewAnnotationStatus[] = [
  "open",
  "in_review",
  "resolved",
  "reopened",
];

export const REVIEW_SEVERITIES: ReviewAnnotationSeverity[] = [
  "info",
  "question",
  "issue",
  "critical",
];

export const REVIEW_CATEGORIES: ReviewAnnotationCategory[] = [
  "design",
  "manufacturability",
  "quality",
  "supplier_question",
  "internal_note",
  "other",
];

export const REVIEW_VISIBILITIES: ReviewAnnotationVisibility[] = [
  "internal",
  "shared",
];

const EMAIL_MENTION_PATTERN =
  /@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

export const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function extractMentionEmails(message: string) {
  return [
    ...new Set(
      Array.from(message.matchAll(EMAIL_MENTION_PATTERN))
        .map((match) => match[1]?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function nullableUuid(value: unknown) {
  const uuid = stringValue(value, 80);
  if (!uuid) return null;
  return UUID_PATTERN.test(uuid) ? uuid : undefined;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseVector(value: unknown): VectorPoint | null {
  const vector = asRecord(value);
  if (!vector) return null;

  const x = finiteNumber(vector.x);
  const y = finiteNumber(vector.y);
  const z = finiteNumber(vector.z);

  if (x === null || y === null || z === null) return null;

  return {
    x: Number(x.toFixed(5)),
    y: Number(y.toFixed(5)),
    z: Number(z.toFixed(5)),
  };
}

export function parseReviewTarget(value: unknown): ParsedReviewTarget | null {
  const target = asRecord(value);
  if (!target || target.kind !== "stl_surface_point") return null;

  const position = parseVector(target.position ?? target.point);
  if (!position) return null;

  const normal =
    target.normal === null || target.normal === undefined
      ? null
      : parseVector(target.normal);

  if (target.normal && !normal) return null;

  const cameraRecord = asRecord(target.camera);
  const cameraPosition = parseVector(
    cameraRecord?.position ?? target.cameraPosition,
  );
  const cameraTarget = parseVector(cameraRecord?.target);
  const zoom = finiteNumber(cameraRecord?.zoom);
  const distance = finiteNumber(cameraRecord?.distance);

  return {
    targetKind: "stl_surface_point",
    position,
    normal,
    camera: cameraPosition
      ? {
          position: cameraPosition,
          target: cameraTarget,
          zoom,
          distance,
        }
      : null,
  };
}

export function normalizeStatus(value: unknown) {
  return REVIEW_STATUSES.includes(value as ReviewAnnotationStatus)
    ? (value as ReviewAnnotationStatus)
    : null;
}

export function normalizeSeverity(value: unknown) {
  return REVIEW_SEVERITIES.includes(value as ReviewAnnotationSeverity)
    ? (value as ReviewAnnotationSeverity)
    : null;
}

export function normalizeCategory(value: unknown) {
  return REVIEW_CATEGORIES.includes(value as ReviewAnnotationCategory)
    ? (value as ReviewAnnotationCategory)
    : null;
}

export function normalizeVisibility(value: unknown) {
  return REVIEW_VISIBILITIES.includes(value as ReviewAnnotationVisibility)
    ? (value as ReviewAnnotationVisibility)
    : null;
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function getPartReviewAccess(
  supabase: SupabaseClient,
  userId: string,
  partId: string,
): Promise<PartReviewAccess | { error: string; status: number }> {
  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("id, name, revision, organization_id")
    .eq("id", partId)
    .maybeSingle();

  if (partError) return { error: partError.message, status: 500 };
  if (!part?.organization_id) {
    return { error: "Part revision not found.", status: 404 };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("organization_id", part.organization_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) return { error: membershipError.message, status: 500 };
  if (!membership) {
    return { error: "You do not have access to this part revision.", status: 403 };
  }

  return {
    part,
    membership,
    canManageReview: membership.role === "admin" || membership.role === "engineer",
  };
}

export async function getAnnotationReviewAccess(
  supabase: SupabaseClient,
  userId: string,
  annotationId: string,
): Promise<ReviewAnnotationAccess | { error: string; status: number }> {
  const { data: annotation, error: annotationError } = await supabase
    .from("part_review_annotations")
    .select(
      "id, organization_id, part_id, part_file_id, created_by, assigned_to, title, status, severity, category, visibility",
    )
    .eq("id", annotationId)
    .maybeSingle();

  if (annotationError) return { error: annotationError.message, status: 500 };
  if (!annotation) return { error: "Annotation not found.", status: 404 };

  const access = await getPartReviewAccess(supabase, userId, annotation.part_id);

  if ("error" in access) return access;
  if (access.part.organization_id !== annotation.organization_id) {
    return { error: "Annotation does not belong to this organization.", status: 403 };
  }

  return {
    ...access,
    annotation,
    canUpdateAnnotation:
      access.canManageReview ||
      annotation.created_by === userId ||
      annotation.assigned_to === userId,
  };
}

import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import {
  extractMentionEmails,
  getPartReviewAccess,
  jsonError,
  normalizeCategory,
  normalizeSeverity,
  normalizeVisibility,
  nullableUuid,
  parseReviewTarget,
  stringValue,
  UUID_PATTERN,
} from "@/lib/part-review-annotations";
import { createClient } from "@/lib/supabase/server";

type CreateAnnotationBody = {
  partId?: unknown;
  partFileId?: unknown;
  title?: unknown;
  messageBody?: unknown;
  severity?: unknown;
  category?: unknown;
  visibility?: unknown;
  assignedTo?: unknown;
  dueDate?: unknown;
  target?: unknown;
};

function normalizeDueDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const dateString = stringValue(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return undefined;

  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : dateString;
}

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("Unauthorized.", 401);

  const url = new URL(request.url);
  const partId = url.searchParams.get("partId")?.trim();
  const partFileId = url.searchParams.get("partFileId")?.trim();

  if (!partId || !UUID_PATTERN.test(partId)) {
    return jsonError("partId is required.", 400);
  }

  const access = await getPartReviewAccess(supabase, user.id, partId);
  if ("error" in access) return jsonError(access.error, access.status);

  let query = supabase
    .from("part_review_annotations")
    .select("*")
    .eq("part_id", partId)
    .order("updated_at", { ascending: false });

  if (partFileId) {
    if (!UUID_PATTERN.test(partFileId)) {
      return jsonError("partFileId is invalid.", 400);
    }

    query = query.eq("part_file_id", partFileId);
  }

  const { data, error } = await query;
  if (error) return jsonError(error.message, 500);

  return Response.json({ annotations: data ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("Unauthorized.", 401);

  let body: CreateAnnotationBody;

  try {
    body = (await request.json()) as CreateAnnotationBody;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const partId = stringValue(body.partId, 80);
  const partFileId = stringValue(body.partFileId, 80);
  const title = stringValue(body.title, 160);
  const messageBody = stringValue(body.messageBody, 4000);
  const severity = normalizeSeverity(body.severity) ?? "info";
  const category = normalizeCategory(body.category) ?? "other";
  const visibility = normalizeVisibility(body.visibility) ?? "internal";
  const assignedTo = nullableUuid(body.assignedTo);
  const dueDate = normalizeDueDate(body.dueDate);
  const target = parseReviewTarget(body.target);

  if (!UUID_PATTERN.test(partId)) return jsonError("partId is required.", 400);
  if (!UUID_PATTERN.test(partFileId)) {
    return jsonError("partFileId is required.", 400);
  }
  if (title.length < 2) {
    return jsonError("Annotation title must be at least 2 characters.", 400);
  }
  if (!messageBody) {
    return jsonError("First message is required.", 400);
  }
  if (assignedTo === undefined) return jsonError("assignedTo is invalid.", 400);
  if (dueDate === undefined) return jsonError("dueDate is invalid.", 400);
  if (!target) return jsonError("Viewer annotation target is invalid.", 400);

  const access = await getPartReviewAccess(supabase, user.id, partId);
  if ("error" in access) return jsonError(access.error, access.status);

  const { data: partFile, error: partFileError } = await supabase
    .from("part_files")
    .select("id, part_id, file_name")
    .eq("id", partFileId)
    .eq("part_id", partId)
    .maybeSingle();

  if (partFileError) return jsonError(partFileError.message, 500);
  if (!partFile) return jsonError("Tagged file is not part of this revision.", 400);

  if (assignedTo) {
    const { data: assigneeMembership, error: assigneeError } = await supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", access.part.organization_id)
      .eq("user_id", assignedTo)
      .maybeSingle();

    if (assigneeError) return jsonError(assigneeError.message, 500);
    if (!assigneeMembership) {
      return jsonError("Assignee must belong to this organization.", 400);
    }
  }

  const { data: annotation, error: annotationError } = await supabase
    .from("part_review_annotations")
    .insert({
      organization_id: access.part.organization_id,
      part_id: partId,
      part_file_id: partFileId,
      created_by: user.id,
      assigned_to: assignedTo,
      title,
      status: "open",
      severity,
      category,
      visibility,
      target_kind: target.targetKind,
      position: target.position,
      normal: target.normal,
      camera: target.camera,
      due_date: dueDate,
    })
    .select("id")
    .single();

  if (annotationError || !annotation) {
    return jsonError(annotationError?.message || "Failed to create annotation.", 500);
  }

  const { error: messageError } = await supabase
    .from("part_review_annotation_messages")
    .insert({
      annotation_id: annotation.id,
      organization_id: access.part.organization_id,
      created_by: user.id,
      body: messageBody,
    });

  if (messageError) return jsonError(messageError.message, 500);

  await supabase.from("part_review_annotation_events").insert({
    annotation_id: annotation.id,
    organization_id: access.part.organization_id,
    actor_id: user.id,
    event_type: "created",
    new_value: {
      title,
      severity,
      category,
      visibility,
      assigned_to: assignedTo,
    },
  });

  if (assignedTo) {
    await supabase.from("part_review_annotation_events").insert({
      annotation_id: annotation.id,
      organization_id: access.part.organization_id,
      actor_id: user.id,
      event_type: "assigned",
      new_value: { assigned_to: assignedTo },
    });

    const { data: assigneeProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", assignedTo)
      .maybeSingle();

    if (assigneeProfile?.email) {
      await sendWorkflowEmail({
        to: [assigneeProfile.email],
        subject: "You were assigned a Kordyne part review annotation",
        eyebrow: "Part review annotation",
        headline: "A review item was assigned to you",
        intro:
          "A teammate assigned you a revision-scoped annotation in Kordyne.",
        detailRows: [
          { label: "Part", value: access.part.name },
          { label: "Revision", value: access.part.revision || "-" },
          { label: "Annotation", value: title },
          { label: "Severity", value: severity },
        ],
        primaryActionLabel: "Open part review",
        primaryActionUrl: absoluteUrl(`/dashboard/parts/${partId}#part-workspace`),
        footerNote:
          "This notification does not grant vault access. Kordyne permissions still control access.",
      });
    }
  }

  const mentionEmails = extractMentionEmails(messageBody);
  if (mentionEmails.length > 0) {
    await sendWorkflowEmail({
      to: mentionEmails,
      subject: "You were mentioned on a Kordyne part review annotation",
      eyebrow: "Part review mention",
      headline: "You were mentioned in a review thread",
      intro: "A teammate mentioned your email in a part review annotation.",
      detailRows: [
        { label: "Part", value: access.part.name },
        { label: "Revision", value: access.part.revision || "-" },
        { label: "Annotation", value: title },
        { label: "Message", value: messageBody.slice(0, 500) },
      ],
      primaryActionLabel: "Open review thread",
      primaryActionUrl: absoluteUrl(`/dashboard/parts/${partId}#part-workspace`),
      footerNote:
        "Mentions notify the email address, but vault access remains controlled by Kordyne permissions.",
    });
  }

  return Response.json({
    ok: true,
    annotationId: annotation.id,
    notifiedMentions: mentionEmails.length,
  });
}

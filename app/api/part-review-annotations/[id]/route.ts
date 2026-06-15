import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import {
  getAnnotationReviewAccess,
  jsonError,
  normalizeCategory,
  normalizeSeverity,
  normalizeStatus,
  normalizeVisibility,
  nullableUuid,
  stringValue,
} from "@/lib/part-review-annotations";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type PatchAnnotationBody = {
  title?: unknown;
  status?: unknown;
  severity?: unknown;
  category?: unknown;
  visibility?: unknown;
  assignedTo?: unknown;
  dueDate?: unknown;
};

function normalizeDueDate(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const dateString = stringValue(value, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return undefined;

  const date = new Date(`${dateString}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? undefined : dateString;
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("Unauthorized.", 401);

  const access = await getAnnotationReviewAccess(supabase, user.id, id);
  if ("error" in access) return jsonError(access.error, access.status);

  const { data: messages, error: messagesError } = await supabase
    .from("part_review_annotation_messages")
    .select("*")
    .eq("annotation_id", id)
    .order("created_at", { ascending: true });

  if (messagesError) return jsonError(messagesError.message, 500);

  return Response.json({
    annotation: access.annotation,
    messages: messages ?? [],
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("Unauthorized.", 401);

  let body: PatchAnnotationBody;

  try {
    body = (await request.json()) as PatchAnnotationBody;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const access = await getAnnotationReviewAccess(supabase, user.id, id);
  if ("error" in access) return jsonError(access.error, access.status);
  if (!access.canUpdateAnnotation) {
    return jsonError("You cannot update this annotation.", 403);
  }

  const updates: Record<string, unknown> = {};
  const eventValue: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = stringValue(body.title, 160);
    if (title.length < 2) {
      return jsonError("Annotation title must be at least 2 characters.", 400);
    }
    updates.title = title;
    eventValue.title = title;
  }

  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (!status) return jsonError("Status is invalid.", 400);

    updates.status = status;
    eventValue.status = status;

    if (status === "resolved") {
      updates.resolved_by = user.id;
      updates.resolved_at = new Date().toISOString();
      eventValue.resolved_by = user.id;
    }

    if (status === "reopened") {
      updates.reopened_by = user.id;
      updates.reopened_at = new Date().toISOString();
      eventValue.reopened_by = user.id;
    }
  }

  if (body.severity !== undefined) {
    const severity = normalizeSeverity(body.severity);
    if (!severity) return jsonError("Severity is invalid.", 400);
    updates.severity = severity;
    eventValue.severity = severity;
  }

  if (body.category !== undefined) {
    const category = normalizeCategory(body.category);
    if (!category) return jsonError("Category is invalid.", 400);
    updates.category = category;
    eventValue.category = category;
  }

  if (body.visibility !== undefined) {
    const visibility = normalizeVisibility(body.visibility);
    if (!visibility) return jsonError("Visibility is invalid.", 400);
    updates.visibility = visibility;
    eventValue.visibility = visibility;
  }

  if (body.assignedTo !== undefined) {
    const assignedTo = nullableUuid(body.assignedTo);
    if (assignedTo === undefined) return jsonError("assignedTo is invalid.", 400);

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

    updates.assigned_to = assignedTo;
    eventValue.assigned_to = assignedTo;
  }

  if (body.dueDate !== undefined) {
    const dueDate = normalizeDueDate(body.dueDate);
    if (dueDate === undefined) return jsonError("dueDate is invalid.", 400);
    updates.due_date = dueDate;
    eventValue.due_date = dueDate;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No supported annotation updates were provided.", 400);
  }

  const { error: updateError } = await supabase
    .from("part_review_annotations")
    .update(updates)
    .eq("id", id);

  if (updateError) return jsonError(updateError.message, 500);

  const eventType =
    "status" in eventValue
      ? "status_changed"
      : "assigned_to" in eventValue
        ? "assigned"
        : "details_updated";

  await supabase.from("part_review_annotation_events").insert({
    annotation_id: id,
    organization_id: access.part.organization_id,
    actor_id: user.id,
    event_type: eventType,
    old_value: {
      status: access.annotation.status,
      severity: access.annotation.severity,
      category: access.annotation.category,
      visibility: access.annotation.visibility,
      assigned_to: access.annotation.assigned_to,
      title: access.annotation.title,
    },
    new_value: eventValue,
  });

  if (
    "assigned_to" in eventValue &&
    typeof eventValue.assigned_to === "string" &&
    eventValue.assigned_to !== access.annotation.assigned_to
  ) {
    const { data: assigneeProfile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", eventValue.assigned_to)
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
          { label: "Annotation", value: access.annotation.title },
        ],
        primaryActionLabel: "Open part review",
        primaryActionUrl: absoluteUrl(
          `/dashboard/parts/${access.part.id}#part-workspace`,
        ),
        footerNote:
          "This notification does not grant vault access. Kordyne permissions still control access.",
      });
    }
  }

  return Response.json({ ok: true });
}

import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import {
  extractMentionEmails,
  getAnnotationReviewAccess,
  jsonError,
  stringValue,
} from "@/lib/part-review-annotations";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreateMessageBody = {
  body?: unknown;
};

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

  const { data, error } = await supabase
    .from("part_review_annotation_messages")
    .select("*")
    .eq("annotation_id", id)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return Response.json({ messages: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return jsonError("Unauthorized.", 401);

  let body: CreateMessageBody;

  try {
    body = (await request.json()) as CreateMessageBody;
  } catch {
    return jsonError("Invalid request body.", 400);
  }

  const messageBody = stringValue(body.body, 4000);
  if (!messageBody) return jsonError("Message is required.", 400);

  const access = await getAnnotationReviewAccess(supabase, user.id, id);
  if ("error" in access) return jsonError(access.error, access.status);

  const { error: insertError } = await supabase
    .from("part_review_annotation_messages")
    .insert({
      annotation_id: id,
      organization_id: access.part.organization_id,
      created_by: user.id,
      body: messageBody,
    });

  if (insertError) return jsonError(insertError.message, 500);

  await supabase.from("part_review_annotation_events").insert({
    annotation_id: id,
    organization_id: access.part.organization_id,
    actor_id: user.id,
    event_type: "message_added",
    new_value: { body_preview: messageBody.slice(0, 240) },
  });

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
        { label: "Annotation", value: access.annotation.title },
        { label: "Message", value: messageBody.slice(0, 500) },
      ],
      primaryActionLabel: "Open review thread",
      primaryActionUrl: absoluteUrl(
        `/dashboard/parts/${access.part.id}#part-workspace`,
      ),
      footerNote:
        "Mentions notify the email address, but vault access remains controlled by Kordyne permissions.",
    });
  }

  return Response.json({
    ok: true,
    notifiedMentions: mentionEmails.length,
  });
}

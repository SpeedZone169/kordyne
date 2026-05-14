import { NextResponse } from "next/server";
import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

type MessageRequestBody = {
  partId?: string;
  revisionPartId?: string;
  messageBody?: string;
};

const EMAIL_MENTION_PATTERN =
  /@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

function extractMentionEmails(message: string) {
  return [
    ...new Set(
      Array.from(message.matchAll(EMAIL_MENTION_PATTERN))
        .map((match) => match[1]?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: MessageRequestBody;

  try {
    body = (await request.json()) as MessageRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const partId = body.partId?.trim();
  const revisionPartId = body.revisionPartId?.trim() || partId;
  const messageBody = body.messageBody?.trim();

  if (!partId) {
    return NextResponse.json({ error: "partId is required." }, { status: 400 });
  }

  if (!messageBody || messageBody.length > 4000) {
    return NextResponse.json(
      { error: "Message must be between 1 and 4000 characters." },
      { status: 400 },
    );
  }

  const { data: part, error: partError } = await supabase
    .from("parts")
    .select("id, name, revision, organization_id")
    .eq("id", partId)
    .maybeSingle();

  if (partError || !part) {
    return NextResponse.json(
      { error: "Part collaboration thread not found." },
      { status: 404 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .eq("organization_id", part.organization_id)
    .maybeSingle();

  if (membershipError) {
    return NextResponse.json({ error: membershipError.message }, { status: 500 });
  }

  if (!membership?.organization_id) {
    return NextResponse.json(
      { error: "You do not have access to this part thread." },
      { status: 403 },
    );
  }

  const { error: insertError } = await supabase
    .from("part_collaboration_messages")
    .insert({
      part_id: partId,
      revision_part_id: revisionPartId,
      sender_org_id: membership.organization_id,
      sender_user_id: user.id,
      message_type: "message",
      message_body: messageBody,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const mentionEmails = extractMentionEmails(messageBody);

  if (mentionEmails.length > 0) {
    await sendWorkflowEmail({
      to: mentionEmails,
      subject: "You were mentioned on a Kordyne part revision",
      eyebrow: "Part collaboration mention",
      headline: "You were mentioned in Kordyne",
      intro:
        "A teammate mentioned your email on a controlled part revision thread.",
      detailRows: [
        {
          label: "Part",
          value: part.name,
        },
        {
          label: "Revision",
          value: part.revision || "-",
        },
        {
          label: "Message",
          value: messageBody.slice(0, 500),
        },
      ],
      primaryActionLabel: "Open part thread",
      primaryActionUrl: absoluteUrl(`/dashboard/parts/${partId}`),
      footerNote:
        "Mentions notify the email address, but vault access remains controlled by Kordyne permissions.",
    });
  }

  return NextResponse.json({
    ok: true,
    notifiedMentions: mentionEmails.length,
  });
}

import { NextResponse } from "next/server";
import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

type MessageRequestBody = {
  providerPackageId?: string;
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

  const providerPackageId = body.providerPackageId?.trim();
  const messageBody = body.messageBody?.trim();

  if (!providerPackageId) {
    return NextResponse.json(
      { error: "providerPackageId is required." },
      { status: 400 },
    );
  }

  if (!messageBody || messageBody.length > 4000) {
    return NextResponse.json(
      { error: "Message must be between 1 and 4000 characters." },
      { status: 400 },
    );
  }

  const { data: pkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      "id, customer_org_id, provider_org_id, service_request_id, package_title",
    )
    .eq("id", providerPackageId)
    .maybeSingle();

  if (packageError || !pkg) {
    return NextResponse.json(
      { error: "Collaboration thread not found." },
      { status: 404 },
    );
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .in("organization_id", [pkg.customer_org_id, pkg.provider_org_id]);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 500 },
    );
  }

  const senderOrgId = memberships?.[0]?.organization_id;

  if (!senderOrgId) {
    return NextResponse.json(
      { error: "You do not have access to this collaboration thread." },
      { status: 403 },
    );
  }

  const { error: insertError } = await supabase.from("provider_messages").insert({
    provider_request_package_id: providerPackageId,
    sender_org_id: senderOrgId,
    sender_user_id: user.id,
    message_type: "message",
    message_body: messageBody,
    is_system: false,
  });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const mentionEmails = extractMentionEmails(messageBody);

  if (mentionEmails.length > 0) {
    await sendWorkflowEmail({
      to: mentionEmails,
      subject: "You were mentioned in a Kordyne collaboration thread",
      eyebrow: "Collaboration mention",
      headline: "You were mentioned in Kordyne",
      intro:
        "A teammate mentioned your email in a controlled manufacturing collaboration thread.",
      detailRows: [
        {
          label: "Thread",
          value: pkg.package_title || "Provider package",
        },
        {
          label: "Message",
          value: messageBody.slice(0, 500),
        },
      ],
      primaryActionLabel: "Open collaboration",
      primaryActionUrl: absoluteUrl(
        `/dashboard/collaboration?packageId=${providerPackageId}`,
      ),
      footerNote:
        "Access to the underlying vault or provider package is still controlled by Kordyne permissions.",
    });
  }

  return NextResponse.json({
    ok: true,
    notifiedMentions: mentionEmails.length,
  });
}

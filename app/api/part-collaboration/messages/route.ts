import { NextResponse } from "next/server";
import { absoluteUrl, sendWorkflowEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

type MessageRequestBody = {
  partId?: string;
  revisionPartId?: string;
  messageBody?: string;
  viewerAnnotation?: unknown;
};

type ViewerAnnotationPayload = {
  kind: "stl_surface_point";
  fileId: string;
  fileName: string;
  label: string;
  point: {
    x: number;
    y: number;
    z: number;
  };
  normal: {
    x: number;
    y: number;
    z: number;
  } | null;
  screen: {
    x: number;
    y: number;
  };
  cameraPosition: {
    x: number;
    y: number;
    z: number;
  };
};

const EMAIL_MENTION_PATTERN =
  /@([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractMentionEmails(message: string) {
  return [
    ...new Set(
      Array.from(message.matchAll(EMAIL_MENTION_PATTERN))
        .map((match) => match[1]?.trim().toLowerCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function asPlainObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringValue(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function parseVector(value: unknown) {
  const vector = asPlainObject(value);
  if (!vector) return null;

  const x = finiteNumber(vector.x);
  const y = finiteNumber(vector.y);
  const z = finiteNumber(vector.z);

  if (x === null || y === null || z === null) return null;

  return { x, y, z };
}

function parseScreenPoint(value: unknown) {
  const screen = asPlainObject(value);
  if (!screen) return null;

  const x = finiteNumber(screen.x);
  const y = finiteNumber(screen.y);

  if (x === null || y === null) return null;

  return {
    x: Math.min(Math.max(x, 0), 1),
    y: Math.min(Math.max(y, 0), 1),
  };
}

function parseViewerAnnotation(value: unknown): ViewerAnnotationPayload | null {
  const annotation = asPlainObject(value);
  if (!annotation) return null;

  if (annotation.kind !== "stl_surface_point") return null;

  const fileId = stringValue(annotation.fileId, 80);
  if (!UUID_PATTERN.test(fileId)) return null;

  const point = parseVector(annotation.point);
  const cameraPosition = parseVector(annotation.cameraPosition);
  const screen = parseScreenPoint(annotation.screen);

  if (!point || !cameraPosition || !screen) return null;

  const normal =
    annotation.normal === null || annotation.normal === undefined
      ? null
      : parseVector(annotation.normal);

  if (annotation.normal && !normal) return null;

  return {
    kind: "stl_surface_point",
    fileId,
    fileName: stringValue(annotation.fileName, 180) || "STL file",
    label: stringValue(annotation.label, 80) || "Feature tag",
    point,
    normal,
    screen,
    cameraPosition,
  };
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

  const viewerAnnotation = body.viewerAnnotation
    ? parseViewerAnnotation(body.viewerAnnotation)
    : null;

  if (body.viewerAnnotation && !viewerAnnotation) {
    return NextResponse.json(
      { error: "Viewer annotation is invalid." },
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

  if (viewerAnnotation) {
    const { data: taggedFile, error: taggedFileError } = await supabase
      .from("part_files")
      .select("id, part_id")
      .eq("id", viewerAnnotation.fileId)
      .eq("part_id", partId)
      .maybeSingle();

    if (taggedFileError) {
      return NextResponse.json(
        { error: taggedFileError.message },
        { status: 500 },
      );
    }

    if (!taggedFile) {
      return NextResponse.json(
        { error: "Tagged file is not part of this revision." },
        { status: 400 },
      );
    }
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
      viewer_annotation: viewerAnnotation,
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

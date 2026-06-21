import { NextResponse } from "next/server";
import { createClient } from "../../../../../lib/supabase/server";
import { isSkippedWorkflowEmailResult, sendWorkflowEmail } from "@/lib/email";

type OrgMemberRow = {
  organization_id: string;
  organization_name: string;
};

function getSiteUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inviteId = String(body.inviteId || "");

    if (!inviteId) {
      return NextResponse.json(
        { error: "Invite ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to resend invites." },
        { status: 401 }
      );
    }

    const { data: orgRole } = await supabase.rpc("get_current_org_role");

    if (orgRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can resend invites." },
        { status: 403 }
      );
    }

    const {
      data: membersData,
      error: membersError,
    } = await supabase.rpc("get_current_org_members");

    if (membersError) {
      return NextResponse.json(
        { error: "Unable to load organization details." },
        { status: 500 }
      );
    }

    const members = (membersData || []) as OrgMemberRow[];
    const organization = members[0] || null;

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found for current admin." },
        { status: 403 }
      );
    }

    const { data: invite, error: inviteError } = await supabase
      .from("organization_invites")
      .select("id, token, email, role, status, organization_id")
      .eq("id", inviteId)
      .eq("organization_id", organization.organization_id)
      .maybeSingle();

    if (inviteError) {
      return NextResponse.json(
        { error: "Unable to load invite." },
        { status: 500 }
      );
    }

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found." },
        { status: 404 }
      );
    }

    if (invite.status !== "pending") {
      return NextResponse.json(
        { error: "Only pending invites can be resent." },
        { status: 400 }
      );
    }

    const inviteUrl = `${getSiteUrl(req)}/invite/${invite.token}`;

    try {
      const emailResult = await sendWorkflowEmail({
        to: [invite.email],
        subject: `Reminder: you're invited to join ${organization.organization_name} on Kordyne`,
        previewText: `Your ${organization.organization_name} invite is still waiting.`,
        eyebrow: "Invite reminder",
        headline: "Your Kordyne invite is waiting",
        intro: `You still have a pending invite to join ${organization.organization_name} as a ${invite.role}.`,
        detailRows: [
          { label: "Organization", value: organization.organization_name },
          { label: "Role", value: invite.role },
        ],
        primaryActionLabel: "Accept invite",
        primaryActionUrl: inviteUrl,
        footerNote:
          "This reminder is for a pending Kordyne invitation. If you were not expecting it, you can ignore this message.",
      });

      if (isSkippedWorkflowEmailResult(emailResult)) {
        return NextResponse.json({
          success: true,
          emailSent: false,
          inviteUrl,
          message:
            "Invite is still available, but email delivery is not configured. Use Copy Link instead.",
        });
      }
    } catch (error) {
      console.error("Invite resend failed:", error);

      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite is still valid, but the email could not be sent. Use Copy Link instead.",
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      inviteUrl,
      message: "Invite email resent.",
    });
  } catch (error) {
    console.error("Resend invite route error:", error);

    return NextResponse.json(
      { error: "Unable to resend invite." },
      { status: 500 }
    );
  }
}
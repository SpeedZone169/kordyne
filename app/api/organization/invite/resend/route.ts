import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "../../../../../lib/supabase/server";

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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite is still available, but RESEND_API_KEY is missing. Use Copy Link instead.",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Kordyne <noreply@kordyne.com>",
      to: invite.email,
      subject: `Reminder: you're invited to join ${organization.organization_name} on Kordyne`,
      text: [
        `You still have a pending invite to join ${organization.organization_name} on Kordyne as a ${invite.role}.`,
        "",
        `Accept your invite: ${inviteUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">Your Kordyne invite is waiting</h2>
          <p>
            You still have a pending invite to join
            <strong> ${organization.organization_name}</strong>
            as <strong>${invite.role}</strong>.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${inviteUrl}"
              style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 12px;"
            >
              Accept Invite
            </a>
          </p>
          <p>If the button does not work, use this link:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Invite resend failed:", emailError);

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
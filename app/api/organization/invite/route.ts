import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "../../../../lib/supabase/server";

type OrgMemberRow = {
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  organization_plan: string | null;
  organization_seat_limit: number | null;
  member_user_id: string;
  member_role: string;
  full_name: string | null;
  email: string | null;
  joined_at: string | null;
};

const ALLOWED_ROLES = new Set(["engineer", "viewer"]);

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
    const organizationId = String(body.organizationId || "");
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "");

    if (!organizationId || !email || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Invalid invite request." },
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
        { error: "You must be logged in to invite members." },
        { status: 401 }
      );
    }

    const { data: orgRole } = await supabase.rpc("get_current_org_role");

    if (orgRole !== "admin") {
      return NextResponse.json(
        { error: "Only admins can invite members." },
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

    if (!organization || organization.organization_id !== organizationId) {
      return NextResponse.json(
        { error: "Organization not found for current admin." },
        { status: 403 }
      );
    }

    const seatLimit = organization.organization_seat_limit ?? 5;
    const activeMemberCount = members.length;

    const { count: pendingInviteCount, error: pendingCountError } = await supabase
      .from("organization_invites")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("status", "pending");

    if (pendingCountError) {
      return NextResponse.json(
        { error: "Unable to check invite seat usage." },
        { status: 500 }
      );
    }

    const seatsUsed = activeMemberCount + (pendingInviteCount || 0);

    if (seatsUsed >= seatLimit) {
      return NextResponse.json(
        { error: "Seat limit reached for your current plan." },
        { status: 400 }
      );
    }

    const { data: existingPendingInvite, error: existingInviteError } =
      await supabase
        .from("organization_invites")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("email", email)
        .eq("status", "pending")
        .maybeSingle();

    if (existingInviteError) {
      return NextResponse.json(
        { error: "Unable to validate existing invites." },
        { status: 500 }
      );
    }

    if (existingPendingInvite) {
      return NextResponse.json(
        { error: "A pending invite for this email already exists." },
        { status: 409 }
      );
    }

    const { data: invite, error: insertError } = await supabase
      .from("organization_invites")
      .insert({
        organization_id: organizationId,
        email,
        role,
        status: "pending",
        invited_by_user_id: user.id,
      })
      .select("id, token, email, role")
      .single();

    if (insertError || !invite) {
      return NextResponse.json(
        { error: insertError?.message || "Unable to create invite." },
        { status: 500 }
      );
    }

    const inviteUrl = `${getSiteUrl(req)}/invite/${invite.token}`;

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite created, but RESEND_API_KEY is missing. Use Copy Link from Pending Invites.",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Kordyne <noreply@kordyne.com>",
      to: email,
      subject: `You're invited to join ${organization.organization_name} on Kordyne`,
      text: [
        `You've been invited to join ${organization.organization_name} on Kordyne as a ${role}.`,
        "",
        `Accept your invite: ${inviteUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">You're invited to join Kordyne</h2>
          <p>
            You've been invited to join <strong>${organization.organization_name}</strong>
            as <strong>${role}</strong>.
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
      console.error("Invite email send failed:", emailError);

      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite created, but the email could not be sent. Use Copy Link from Pending Invites.",
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      inviteUrl,
      message: "Invite created and email sent.",
    });
  } catch (error) {
    console.error("Organization invite route error:", error);

    return NextResponse.json(
      { error: "Unable to create invite." },
      { status: 500 }
    );
  }
}
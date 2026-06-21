import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { isSkippedWorkflowEmailResult, sendWorkflowEmail } from "@/lib/email";

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

    try {
      const emailResult = await sendWorkflowEmail({
        to: [email],
        subject: `You're invited to join ${organization.organization_name} on Kordyne`,
        previewText: `Accept your invite to ${organization.organization_name} on Kordyne.`,
        eyebrow: "Workspace invite",
        headline: "You're invited to join Kordyne",
        intro: `You've been invited to join ${organization.organization_name} as a ${role}.`,
        detailRows: [
          { label: "Organization", value: organization.organization_name },
          { label: "Role", value: role },
        ],
        primaryActionLabel: "Accept invite",
        primaryActionUrl: inviteUrl,
        footerNote:
          "This invitation is intended for the invited email address. If you were not expecting it, you can ignore this message.",
      });

      if (isSkippedWorkflowEmailResult(emailResult)) {
        return NextResponse.json({
          success: true,
          emailSent: false,
          inviteUrl,
          message:
            "Invite created, but email delivery is not configured. Use Copy Link from Pending Invites.",
        });
      }
    } catch (error) {
      console.error("Invite email send failed:", error);

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
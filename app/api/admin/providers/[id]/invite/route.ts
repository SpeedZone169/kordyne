import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasVerifiedMfaSession } from "@/lib/auth/mfa";
import { isSkippedWorkflowEmailResult, sendWorkflowEmail } from "@/lib/email";

function getSiteUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(req.url).origin
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: providerOrgId } = await params;
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const role = "admin";

    if (!providerOrgId || !email) {
      return NextResponse.json(
        { error: "Provider organization and email are required." },
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
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("platform_role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.platform_role !== "platform_owner") {
      return NextResponse.json(
        { error: "Only the platform owner can send provider invites." },
        { status: 403 }
      );
    }

    if (!(await hasVerifiedMfaSession())) {
      return NextResponse.json(
        { error: "Multi-factor verification is required for this action." },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: providerOrg, error: providerOrgError } = await adminSupabase
      .from("organizations")
      .select("id, name")
      .eq("id", providerOrgId)
      .maybeSingle();

    if (providerOrgError || !providerOrg) {
      return NextResponse.json(
        { error: "Provider organization not found." },
        { status: 404 }
      );
    }

    const { data: existingPendingInvite, error: existingInviteError } =
      await adminSupabase
        .from("organization_invites")
        .select("id")
        .eq("organization_id", providerOrgId)
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

    const { data: invite, error: insertError } = await adminSupabase
      .from("organization_invites")
      .insert({
        organization_id: providerOrgId,
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

    const siteUrl = getSiteUrl(req);
    const inviteUrl = `${siteUrl}/invite/${invite.token}`;
    const providerInfoUrl = `${siteUrl}/providers`;

    const introLine = fullName
      ? `Hello ${fullName}. You've been invited to manage ${providerOrg.name} opportunities on Kordyne.`
      : `You've been invited to manage ${providerOrg.name} opportunities on Kordyne.`;

    try {
      const emailResult = await sendWorkflowEmail({
        to: [email],
        subject: `You're invited to join ${providerOrg.name} on Kordyne`,
        previewText: `Accept your provider workspace invite for ${providerOrg.name}.`,
        eyebrow: "Provider invite",
        headline: "You're invited to join Kordyne",
        intro: introLine,
        detailRows: [
          { label: "Provider", value: providerOrg.name },
          { label: "Role", value: "Admin" },
        ],
        primaryActionLabel: "Accept invite",
        primaryActionUrl: inviteUrl,
        secondaryActionLabel: "View provider page",
        secondaryActionUrl: providerInfoUrl,
        footerNote:
          "This provider invitation is intended for the invited email address. If you were not expecting it, you can ignore this message.",
      });

      if (isSkippedWorkflowEmailResult(emailResult)) {
        return NextResponse.json({
          success: true,
          emailSent: false,
          inviteUrl,
          message:
            "Invite created, but email delivery is not configured. Copy the invite link manually.",
        });
      }
    } catch (error) {
      console.error("Provider invite email send failed:", error);

      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite created, but the email could not be sent. Copy the invite link manually.",
      });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      inviteUrl,
      message: "Provider invite created and email sent.",
    });
  } catch (error) {
    console.error("Provider invite route error:", error);

    return NextResponse.json(
      { error: "Unable to create provider invite." },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

    const { count: pendingInviteCount, error: pendingInviteCountError } =
      await adminSupabase
        .from("organization_invites")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", providerOrgId)
        .eq("status", "pending");

    if (pendingInviteCountError) {
      return NextResponse.json(
        { error: "Unable to check pending invites." },
        { status: 500 }
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

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        emailSent: false,
        inviteUrl,
        message:
          "Invite created, but RESEND_API_KEY is missing. Copy the invite link manually.",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const introLine = fullName ? `Hello ${fullName},` : "Hello,";

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Kordyne <noreply@kordyne.com>",
      to: email,
      subject: `You're invited to join ${providerOrg.name} on Kordyne`,
      text: [
        introLine,
        "",
        `You've been invited to join ${providerOrg.name} on Kordyne as an admin.`,
        "",
        "Kordyne helps providers manage incoming manufacturing opportunities and work with customers in a structured portal.",
        "",
        `Learn more here: ${providerInfoUrl}`,
        `Accept your invite here: ${inviteUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">You're invited to join Kordyne</h2>
          <p>${introLine}</p>
          <p>
            You've been invited to join <strong>${providerOrg.name}</strong>
            as an <strong>admin</strong>.
          </p>
          <p>
            Kordyne helps providers manage incoming manufacturing opportunities
            and work with customers in a structured portal.
          </p>
          <p style="margin: 24px 0;">
            <a
              href="${inviteUrl}"
              style="display: inline-block; background: #111827; color: #ffffff; text-decoration: none; padding: 12px 18px; border-radius: 9999px;"
            >
              Accept invite
            </a>
          </p>
          <p>
            Learn more here:
            <a href="${providerInfoUrl}">${providerInfoUrl}</a>
          </p>
          <p>If the button does not work, use this link:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Provider invite email send failed:", emailError);

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
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
    const { id: organizationId } = await params;
    const body = await req.json();

    const email = String(body.email || "").trim().toLowerCase();
    const fullName = String(body.fullName || "").trim();
    const role = "admin";

    if (!organizationId || !email) {
      return NextResponse.json(
        { error: "Organization and email are required." },
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
      .select("platform_role, email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError || !profile || profile.platform_role !== "platform_owner") {
      return NextResponse.json(
        { error: "Only the platform owner can send this invite." },
        { status: 403 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: organization, error: organizationError } = await adminSupabase
      .from("organizations")
      .select("id, name, seat_limit")
      .eq("id", organizationId)
      .maybeSingle();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Organization not found." },
        { status: 404 }
      );
    }

    const { count: memberCount, error: memberCountError } = await adminSupabase
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", organizationId);

    if (memberCountError) {
      return NextResponse.json(
        { error: "Unable to check organization membership." },
        { status: 500 }
      );
    }

    const { count: pendingInviteCount, error: pendingCountError } =
      await adminSupabase
        .from("organization_invites")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "pending");

    if (pendingCountError) {
      return NextResponse.json(
        { error: "Unable to check pending invites." },
        { status: 500 }
      );
    }

    const seatLimit = organization.seat_limit ?? 5;
    const seatsUsed = (memberCount ?? 0) + (pendingInviteCount ?? 0);

    if (seatsUsed >= seatLimit) {
      return NextResponse.json(
        { error: "Seat limit reached for this organization." },
        { status: 400 }
      );
    }

    const { data: existingPendingInvite, error: existingInviteError } =
      await adminSupabase
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

    const { data: invite, error: insertError } = await adminSupabase
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
          "Invite created, but RESEND_API_KEY is missing. Copy the invite link manually.",
      });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const introLine = fullName
      ? `Hello ${fullName},`
      : "Hello,";

    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Kordyne <noreply@kordyne.com>",
      to: email,
      subject: `You're invited to administer ${organization.name} on Kordyne`,
      text: [
        introLine,
        "",
        `You've been invited to join ${organization.name} on Kordyne as an admin.`,
        "",
        "Kordyne is the bridge between engineering, part control, and manufacturing coordination.",
        "",
        `You can review the platform here: ${getSiteUrl(req)}`,
        `Accept your invite here: ${inviteUrl}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
          <h2 style="margin-bottom: 16px;">You're invited to join Kordyne</h2>
          <p>${introLine}</p>
          <p>
            You've been invited to join <strong>${organization.name}</strong>
            as an <strong>admin</strong>.
          </p>
          <p>
            Kordyne is the bridge between engineering, part control, and manufacturing coordination.
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
            You can also learn more here:
            <a href="${getSiteUrl(req)}">${getSiteUrl(req)}</a>
          </p>
          <p>If the button does not work, use this link:</p>
          <p><a href="${inviteUrl}">${inviteUrl}</a></p>
        </div>
      `,
    });

    if (emailError) {
      console.error("Admin organization invite email failed:", emailError);

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
      message: "Invite created and email sent.",
    });
  } catch (error) {
    console.error("Admin organization invite route error:", error);

    return NextResponse.json(
      { error: "Unable to create organization admin invite." },
      { status: 500 }
    );
  }
}
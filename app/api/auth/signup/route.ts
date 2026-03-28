import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
};

type InviteRow = {
  organization_id: string;
  email: string;
  role: string;
  status: string;
};

async function verifyTurnstile(turnstileToken: string, ip?: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    throw new Error("Missing TURNSTILE_SECRET_KEY");
  }

  const formData = new FormData();
  formData.append("secret", secret);
  formData.append("response", turnstileToken);

  if (ip) {
    formData.append("remoteip", ip);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
    }
  );

  return (await response.json()) as TurnstileVerifyResponse;
}

const TERMS_VERSION = "2026-03-16";

export async function POST(req: Request) {
  try {
    const {
      fullName,
      email,
      password,
      repeatPassword,
      turnstileToken,
      acceptedTerms,
      inviteToken,
    } = await req.json();

    if (
      !fullName ||
      !email ||
      !password ||
      !repeatPassword ||
      !turnstileToken ||
      !inviteToken
    ) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    if (password !== repeatPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 }
      );
    }

    if (!acceptedTerms) {
      return NextResponse.json(
        { error: "You must agree to the Terms and Conditions." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim();

    const turnstileResult = await verifyTurnstile(turnstileToken, ip);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    const { data: invite, error: inviteError } = await adminSupabase
      .from("organization_invites")
      .select("organization_id, email, role, status")
      .eq("token", inviteToken)
      .maybeSingle();

    const inviteRow = invite as InviteRow | null;

    if (inviteError || !inviteRow) {
      return NextResponse.json(
        { error: "Invite not found." },
        { status: 404 }
      );
    }

    if (inviteRow.status !== "pending") {
      return NextResponse.json(
        { error: "This invite is no longer pending." },
        { status: 400 }
      );
    }

    if (inviteRow.email.trim().toLowerCase() !== normalizedEmail) {
      return NextResponse.json(
        { error: "You must sign up with the invited email address." },
        { status: 400 }
      );
    }

    const { data: organization, error: organizationError } = await adminSupabase
      .from("organizations")
      .select("name")
      .eq("id", inviteRow.organization_id)
      .maybeSingle();

    if (organizationError || !organization) {
      return NextResponse.json(
        { error: "Unable to resolve the invited organization." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          full_name: fullName,
          company: organization.name,
          invited_org_id: inviteRow.organization_id,
          invited_role: inviteRow.role,
          accepted_terms: true,
          terms_accepted_at: new Date().toISOString(),
          terms_version: TERMS_VERSION,
          privacy_version_shown: TERMS_VERSION,
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to create account." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup route error:", error);

    return NextResponse.json(
      { error: "Unable to complete signup." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
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

function getResetPasswordRedirectUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  return `${siteUrl}/auth/callback?next=/reset-password`;
}

export async function POST(req: Request) {
  try {
    const { email, turnstileToken } = await req.json();

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !turnstileToken) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor?.split(",")[0]?.trim();

    const turnstileResult = await verifyTurnstile(turnstileToken, ip);

    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const redirectTo = getResetPasswordRedirectUrl();

    const { error } = await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo,
      }
    );

    if (error) {
      console.error("Supabase resetPasswordForEmail error:", error);

      return NextResponse.json(
        { error: "Unable to send password reset email." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists for that email, we’ve sent password reset instructions.",
    });
  } catch (error) {
    console.error("Forgot password route error:", error);

    return NextResponse.json(
      { error: "Unable to process password reset request." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { verifyTurnstile } from "../../../../lib/turnstile";

function getResetPasswordRedirectUrl() {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://www.kordyne.com";

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

    const turnstileResult = await verifyTurnstile({
      request: req,
      token: turnstileToken,
      expectedAction: "forgot_password",
    });

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

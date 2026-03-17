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

const TERMS_VERSION = "2026-03-16";

export async function POST(req: Request) {
  try {
    const {
      fullName,
      company,
      email,
      password,
      repeatPassword,
      turnstileToken,
      acceptedTerms,
    } = await req.json();

    if (
      !fullName ||
      !company ||
      !email ||
      !password ||
      !repeatPassword ||
      !turnstileToken
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          company,
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
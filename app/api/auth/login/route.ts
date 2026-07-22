import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";
import { verifyTurnstile } from "../../../../lib/turnstile";

export async function POST(req: Request) {
  try {
    const { email, password, turnstileToken } = await req.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !password || !turnstileToken) {
      return NextResponse.json(
        { error: "Missing required fields." },
        { status: 400 }
      );
    }

    const turnstileResult = await verifyTurnstile({
      request: req,
      token: turnstileToken,
      expectedAction: "login",
    });

    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: "Verification failed. Please try again." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Login route error:", error);

    return NextResponse.json(
      { error: "Unable to complete login." },
      { status: 500 }
    );
  }
}

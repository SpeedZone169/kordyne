import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getApsViewerToken, isApsStepViewerEnabled } from "@/lib/aps";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isApsStepViewerEnabled()) {
    return NextResponse.json(
      { error: "APS STEP viewer is disabled." },
      { status: 503 },
    );
  }

  try {
    const token = await getApsViewerToken();

    return NextResponse.json({
      access_token: token.access_token,
      token_type: token.token_type,
      expires_in: token.expires_in,
    });
  } catch (tokenError) {
    return NextResponse.json(
      {
        error:
          tokenError instanceof Error
            ? tokenError.message
            : "Failed to get APS viewer token.",
      },
      { status: 500 },
    );
  }
}
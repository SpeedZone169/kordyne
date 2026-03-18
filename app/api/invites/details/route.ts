import { NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Missing invite token." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("get_public_invite_details", {
      invite_token: token,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Unable to load invite." },
        { status: 400 }
      );
    }

    const invite = Array.isArray(data) ? data[0] : data;

    if (!invite) {
      return NextResponse.json(
        { error: "Invite not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ invite });
  } catch {
    return NextResponse.json(
      { error: "Unable to load invite." },
      { status: 500 }
    );
  }
}
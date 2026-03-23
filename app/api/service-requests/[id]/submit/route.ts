import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("submit_service_request", {
      p_request_id: id,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to submit request." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data }, { status: 200 });
  } catch (error) {
    console.error("POST /api/service-requests/[id]/submit failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
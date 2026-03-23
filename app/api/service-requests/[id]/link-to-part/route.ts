import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type LinkToPartBody = {
  partId?: string;
};

export async function POST(req: Request, context: RouteContext) {
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

    const body = (await req.json()) as LinkToPartBody;

    if (!body.partId) {
      return NextResponse.json(
        { error: "Part revision is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "link_service_request_to_part_revision",
      {
        p_request_id: id,
        p_part_id: body.partId,
        p_part_file_ids: [],
      }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to link request to part." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: data }, { status: 200 });
  } catch (error) {
    console.error("POST /api/service-requests/[id]/link-to-part failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
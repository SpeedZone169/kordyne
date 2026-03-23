import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type CreatePartFromRequestBody = {
  name?: string;
  partNumber?: string | null;
  description?: string | null;
  processType?: string | null;
  material?: string | null;
  category?: string | null;
  status?: string | null;
  revisionScheme?: string | null;
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

    const body = (await req.json()) as CreatePartFromRequestBody;

    if (!body.name?.trim()) {
      return NextResponse.json(
        { error: "Part name is required." },
        { status: 400 }
      );
    }

    const status = body.status?.trim() || "draft";
    if (!["draft", "active", "archived"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid part status." },
        { status: 400 }
      );
    }

    const revisionScheme = body.revisionScheme?.trim() || "alphabetic";
    if (!["alphabetic", "numeric"].includes(revisionScheme)) {
      return NextResponse.json(
        { error: "Invalid revision scheme." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.rpc(
      "create_part_from_service_request",
      {
        p_request_id: id,
        p_name: body.name.trim(),
        p_part_number: body.partNumber?.trim() || null,
        p_description: body.description?.trim() || null,
        p_process_type: body.processType?.trim() || null,
        p_material: body.material?.trim() || null,
        p_category: body.category?.trim() || null,
        p_status: status,
        p_revision_scheme: revisionScheme,
      }
    );

    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to create vault part from request." },
        { status: 400 }
      );
    }

    return NextResponse.json({ partId: data }, { status: 200 });
  } catch (error) {
    console.error("POST /api/service-requests/[id]/create-part failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
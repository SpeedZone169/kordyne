import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateRevisionBody = {
  sourcePartId?: string;
  newRevision?: string;
  revisionNote?: string;
};

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await req.json()) as CreateRevisionBody;

    const sourcePartId = body.sourcePartId?.trim();
    const newRevision = body.newRevision?.trim();
    const revisionNote = body.revisionNote?.trim() || null;

    if (!sourcePartId) {
      return NextResponse.json(
        { error: "Source part is required." },
        { status: 400 }
      );
    }

    if (!newRevision) {
      return NextResponse.json(
        { error: "New revision is required." },
        { status: 400 }
      );
    }

    const { data: newPartId, error: rpcError } = await supabase.rpc(
      "create_part_revision",
      {
        p_source_part_id: sourcePartId,
        p_new_revision: newRevision,
        p_revision_note: revisionNote,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || "Failed to create revision." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: newPartId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/parts/create-revision failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
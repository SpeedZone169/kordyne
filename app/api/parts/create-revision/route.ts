import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type CreateRevisionBody = {
  sourcePartId?: string;
  newRevision?: string;
  revisionNote?: string;
  fileCopyMode?: "none" | "selected";
  selectedSourceFileIds?: string[];
};

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

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
    const fileCopyMode = body.fileCopyMode ?? "none";

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

    if (!["none", "selected"].includes(fileCopyMode)) {
      return NextResponse.json(
        { error: "Invalid file copy mode." },
        { status: 400 }
      );
    }

    const selectedSourceFileIds = Array.from(
      new Set((body.selectedSourceFileIds ?? []).filter(Boolean))
    );

    if (fileCopyMode === "selected" && selectedSourceFileIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "Select at least one file to copy, or choose Start with no files.",
        },
        { status: 400 }
      );
    }

    const { data: sourcePart, error: sourcePartError } = await supabase
      .from("parts")
      .select("id, organization_id, part_family_id")
      .eq("id", sourcePartId)
      .single();

    if (sourcePartError || !sourcePart) {
      return NextResponse.json(
        { error: "Source part not found." },
        { status: 404 }
      );
    }

    const { data: familyParts, error: familyPartsError } = await supabase
      .from("parts")
      .select("id")
      .eq("part_family_id", sourcePart.part_family_id);

    if (familyPartsError || !familyParts) {
      return NextResponse.json(
        { error: "Failed to load revision family." },
        { status: 400 }
      );
    }

    const familyPartIds = familyParts.map((part) => part.id);

    const { data: newPartId, error: rpcError } = await supabase.rpc(
      "create_part_revision",
      {
        p_source_part_id: sourcePartId,
        p_new_revision: newRevision,
        p_revision_note: revisionNote,
      }
    );

    if (rpcError || !newPartId) {
      return NextResponse.json(
        { error: rpcError?.message || "Failed to create revision." },
        { status: 400 }
      );
    }

    if (fileCopyMode === "selected") {
      const { data: sourceFiles, error: sourceFilesError } = await supabase
        .from("part_files")
        .select(
          "id, part_id, file_name, file_type, file_size_bytes, storage_path, asset_category"
        )
        .in("part_id", familyPartIds)
        .in("id", selectedSourceFileIds);

      if (sourceFilesError) {
        return NextResponse.json(
          { error: `Failed to load source files: ${sourceFilesError.message}` },
          { status: 400 }
        );
      }

      if (!sourceFiles || sourceFiles.length !== selectedSourceFileIds.length) {
        return NextResponse.json(
          {
            error:
              "One or more selected files could not be found in this revision family.",
          },
          { status: 400 }
        );
      }

      for (const sourceFile of sourceFiles) {
        const safeFileName = sanitizeFileName(sourceFile.file_name);
        const destinationPath = `${user.id}/${newPartId}/${Date.now()}-${safeFileName}`;

        const { error: copyError } = await supabase.storage
          .from("part-files")
          .copy(sourceFile.storage_path, destinationPath);

        if (copyError) {
          return NextResponse.json(
            {
              error: `Failed to copy file "${sourceFile.file_name}": ${copyError.message}`,
            },
            { status: 400 }
          );
        }

        const { error: insertFileError } = await supabase
          .from("part_files")
          .insert({
            part_id: newPartId,
            user_id: user.id,
            file_name: sourceFile.file_name,
            file_type: sourceFile.file_type,
            file_size_bytes: sourceFile.file_size_bytes,
            storage_path: destinationPath,
            asset_category: sourceFile.asset_category,
          });

        if (insertFileError) {
          return NextResponse.json(
            {
              error: `Failed to create copied file record for "${sourceFile.file_name}": ${insertFileError.message}`,
            },
            { status: 400 }
          );
        }
      }
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
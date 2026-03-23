import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const OPEN_REQUEST_STATUSES = ["submitted", "in_review", "awaiting_customer"];
const ALLOWED_ASSET_CATEGORIES = [
  "cad_3d",
  "drawing_2d",
  "image",
  "manufacturing_doc",
  "quality_doc",
  "other",
] as const;

type PromoteBody = {
  uploadedFileId?: string;
  assetCategory?: string | null;
  fileName?: string | null;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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

    const body = (await req.json()) as PromoteBody;

    if (!body.uploadedFileId) {
      return NextResponse.json(
        { error: "Uploaded file is required." },
        { status: 400 }
      );
    }

    const { data: requestRow, error: requestError } = await supabase
      .from("service_requests")
      .select("id, organization_id, part_id, status")
      .eq("id", id)
      .single();

    if (requestError || !requestRow) {
      return NextResponse.json({ error: "Request not found." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", requestRow.organization_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return NextResponse.json(
        { error: "You do not have access to this organization." },
        { status: 403 }
      );
    }

    if (!["admin", "engineer"].includes(membership.role || "")) {
      return NextResponse.json(
        { error: "Only admins and engineers can save request files into the vault." },
        { status: 403 }
      );
    }

    if (!OPEN_REQUEST_STATUSES.includes(requestRow.status)) {
      return NextResponse.json(
        { error: "Request uploads can only be promoted while the request is still internal." },
        { status: 400 }
      );
    }

    const { data: uploadedFile, error: uploadedFileError } = await supabase
      .from("service_request_uploaded_files")
      .select(
        "id, service_request_id, file_name, file_type, file_size_bytes, asset_category, storage_path, promoted_to_part_file_id"
      )
      .eq("id", body.uploadedFileId)
      .eq("service_request_id", id)
      .maybeSingle();

    if (uploadedFileError || !uploadedFile) {
      return NextResponse.json(
        { error: "Uploaded request file not found." },
        { status: 404 }
      );
    }

    if (uploadedFile.promoted_to_part_file_id) {
      return NextResponse.json(
        { error: "This request file has already been saved into the vault." },
        { status: 409 }
      );
    }

    const assetCategory =
      body.assetCategory?.trim() ||
      uploadedFile.asset_category ||
      "other";

    if (
      !ALLOWED_ASSET_CATEGORIES.includes(
        assetCategory as (typeof ALLOWED_ASSET_CATEGORIES)[number]
      )
    ) {
      return NextResponse.json(
        { error: "Invalid asset category." },
        { status: 400 }
      );
    }

    const finalFileName = sanitizeFileName(
      body.fileName?.trim() || uploadedFile.file_name
    );

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("service-request-files")
      .download(uploadedFile.storage_path);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: "Failed to read the uploaded request file." },
        { status: 400 }
      );
    }

    const newStoragePath = `${user.id}/${requestRow.part_id}/${Date.now()}-${finalFileName}`;
    const buffer = Buffer.from(await fileBlob.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("part-files")
      .upload(newStoragePath, buffer, {
        contentType: uploadedFile.file_type || "application/octet-stream",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message || "Failed to upload file into the vault." },
        { status: 400 }
      );
    }

    const { data: partFile, error: partFileInsertError } = await supabase
      .from("part_files")
      .insert({
        part_id: requestRow.part_id,
        user_id: user.id,
        file_name: uploadedFile.file_name,
        file_type: uploadedFile.file_type,
        file_size_bytes: uploadedFile.file_size_bytes,
        asset_category: assetCategory,
        storage_path: newStoragePath,
      })
      .select("id")
      .single();

    if (partFileInsertError || !partFile) {
      await supabase.storage.from("part-files").remove([newStoragePath]);

      return NextResponse.json(
        {
          error:
            partFileInsertError?.message ||
            "Failed to create the vault file record.",
        },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("service_request_uploaded_files")
      .update({
        asset_category: assetCategory,
        promoted_to_part_file_id: partFile.id,
        promoted_at: new Date().toISOString(),
      })
      .eq("id", uploadedFile.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to mark the upload as promoted." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { partFileId: partFile.id, promoted: true },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "POST /api/service-requests/[id]/promote-uploaded-file failed",
      error
    );
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
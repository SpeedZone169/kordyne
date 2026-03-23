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

function sanitizeFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

type RouteContext = {
  params: Promise<{ id: string }>;
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
        { error: "Only admins and engineers can upload request files." },
        { status: 403 }
      );
    }

    if (!OPEN_REQUEST_STATUSES.includes(requestRow.status)) {
      return NextResponse.json(
        { error: "Request uploads can only be changed while the request is still internal." },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const files = formData
      .getAll("files")
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (files.length === 0) {
      return NextResponse.json({ error: "No files received." }, { status: 400 });
    }

    const rawCategories = formData.get("assetCategories");
    let assetCategories: string[] = [];

    if (typeof rawCategories === "string") {
      try {
        const parsed = JSON.parse(rawCategories);
        if (Array.isArray(parsed)) {
          assetCategories = parsed.map((value) =>
            typeof value === "string" ? value : "other"
          );
        }
      } catch {
        assetCategories = [];
      }
    }

    const uploadedStoragePaths: string[] = [];
    const recordsToInsert: Array<{
      service_request_id: string;
      uploaded_by_user_id: string;
      file_name: string;
      file_type: string | null;
      file_size_bytes: number;
      asset_category: string;
      storage_path: string;
    }> = [];

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const candidateCategory = assetCategories[index] || "other";
      const assetCategory = ALLOWED_ASSET_CATEGORIES.includes(
        candidateCategory as (typeof ALLOWED_ASSET_CATEGORIES)[number]
      )
        ? candidateCategory
        : "other";

      const safeFileName = sanitizeFileName(file.name || `upload-${index + 1}`);
      const storagePath = `${user.id}/${id}/${Date.now()}-${index}-${safeFileName}`;

      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from("service-request-files")
        .upload(storagePath, buffer, {
          contentType: file.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        if (uploadedStoragePaths.length > 0) {
          await supabase.storage
            .from("service-request-files")
            .remove(uploadedStoragePaths);
        }

        return NextResponse.json(
          { error: uploadError.message || "Failed to upload one of the files." },
          { status: 400 }
        );
      }

      uploadedStoragePaths.push(storagePath);

      recordsToInsert.push({
        service_request_id: id,
        uploaded_by_user_id: user.id,
        file_name: file.name,
        file_type: file.type || null,
        file_size_bytes: file.size,
        asset_category: assetCategory,
        storage_path: storagePath,
      });
    }

    const { data: insertedRows, error: insertError } = await supabase
      .from("service_request_uploaded_files")
      .insert(recordsToInsert)
      .select(
        "id, file_name, file_type, file_size_bytes, asset_category, storage_path, created_at"
      );

    if (insertError) {
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage
          .from("service-request-files")
          .remove(uploadedStoragePaths);
      }

      return NextResponse.json(
        { error: insertError.message || "Failed to save uploaded file metadata." },
        { status: 400 }
      );
    }

    return NextResponse.json({ files: insertedRows ?? [] }, { status: 201 });
  } catch (error) {
    console.error("POST /api/service-requests/[id]/uploaded-files failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
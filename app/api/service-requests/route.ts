import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CAD_OUTPUT_TYPES,
  MANUFACTURING_TYPES,
  OPTIMIZATION_GOALS,
  SERVICE_REQUEST_PRIORITIES,
  SERVICE_REQUEST_TYPES,
} from "@/lib/service-requests";

type CreateRequestBody = {
  partId?: string;
  requestType?: string;
  title?: string;
  notes?: string;
  priority?: string;
  dueDate?: string | null;
  quantity?: number | null;
  targetProcess?: string | null;
  targetMaterial?: string | null;
  manufacturingType?: string | null;
  cadOutputType?: string | null;
  optimizationGoal?: string | null;
  sourceReferenceType?: string | null;
  selectedPartFileIds?: string[];
  requestMeta?: Record<string, unknown>;
};

function isPositiveInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) > 0;
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

    const body = (await req.json()) as CreateRequestBody;

    if (!body.partId) {
      return NextResponse.json({ error: "Part is required." }, { status: 400 });
    }

    if (
      !body.requestType ||
      !SERVICE_REQUEST_TYPES.includes(body.requestType as never)
    ) {
      return NextResponse.json(
        { error: "Invalid request type." },
        { status: 400 }
      );
    }

    const priority = body.priority ?? "normal";
    if (!SERVICE_REQUEST_PRIORITIES.includes(priority as never)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    if (
      body.manufacturingType &&
      !MANUFACTURING_TYPES.includes(body.manufacturingType as never)
    ) {
      return NextResponse.json(
        { error: "Invalid manufacturing type." },
        { status: 400 }
      );
    }

    if (
      body.cadOutputType &&
      !CAD_OUTPUT_TYPES.includes(body.cadOutputType as never)
    ) {
      return NextResponse.json(
        { error: "Invalid CAD output type." },
        { status: 400 }
      );
    }

    if (
      body.optimizationGoal &&
      !OPTIMIZATION_GOALS.includes(body.optimizationGoal as never)
    ) {
      return NextResponse.json(
        { error: "Invalid optimization goal." },
        { status: 400 }
      );
    }

    const sourceReferenceType = body.sourceReferenceType ?? "existing_part_files";

    if (!["existing_part_files", "uploaded_files"].includes(sourceReferenceType)) {
      return NextResponse.json(
        { error: "Invalid source reference type." },
        { status: 400 }
      );
    }

    if (body.quantity != null && !isPositiveInteger(body.quantity)) {
      return NextResponse.json(
        { error: "Quantity must be a positive whole number." },
        { status: 400 }
      );
    }

    if (body.selectedPartFileIds && !Array.isArray(body.selectedPartFileIds)) {
      return NextResponse.json(
        { error: "Selected files must be an array." },
        { status: 400 }
      );
    }

    const selectedPartFileIds = Array.from(
      new Set((body.selectedPartFileIds ?? []).filter(Boolean))
    );

    const { data: part, error: partError } = await supabase
      .from("parts")
      .select("id, organization_id, name, part_number")
      .eq("id", body.partId)
      .single();

    if (partError || !part) {
      return NextResponse.json({ error: "Part not found." }, { status: 404 });
    }

    const { data: membership, error: membershipError } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", part.organization_id)
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
        { error: "Only admins and engineers can create service requests." },
        { status: 403 }
      );
    }

    const requestMeta =
      body.requestMeta && typeof body.requestMeta === "object"
        ? body.requestMeta
        : {};

    const { data: createdId, error: rpcError } = await supabase.rpc(
      "create_service_request",
      {
        p_part_id: part.id,
        p_request_type: body.requestType,
        p_title: body.title?.trim() || null,
        p_notes: body.notes?.trim() || null,
        p_priority: priority,
        p_due_date: body.dueDate || null,
        p_quantity: body.quantity ?? null,
        p_target_process: body.targetProcess?.trim() || null,
        p_target_material: body.targetMaterial?.trim() || null,
        p_manufacturing_type:
          body.requestType === "manufacture_part"
            ? body.manufacturingType || null
            : null,
        p_cad_output_type:
          body.requestType === "cad_creation"
            ? body.cadOutputType || null
            : null,
        p_optimization_goal:
          body.requestType === "optimization"
            ? body.optimizationGoal || null
            : null,
        p_source_reference_type: sourceReferenceType,
        p_request_meta: requestMeta,
        p_part_file_ids: selectedPartFileIds,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { error: rpcError.message || "Failed to create request." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: createdId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/service-requests failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  CAD_OUTPUT_TYPES,
  MANUFACTURING_TYPES,
  OPTIMIZATION_GOALS,
  SERVICE_REQUEST_PRIORITIES,
  SERVICE_REQUEST_TYPES,
  SOURCE_REFERENCE_TYPES,
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

    if (!body.requestType || !SERVICE_REQUEST_TYPES.includes(body.requestType as never)) {
      return NextResponse.json({ error: "Invalid request type." }, { status: 400 });
    }

    const priority = body.priority ?? "normal";
    if (!SERVICE_REQUEST_PRIORITIES.includes(priority as never)) {
      return NextResponse.json({ error: "Invalid priority." }, { status: 400 });
    }

    if (
      body.manufacturingType &&
      !MANUFACTURING_TYPES.includes(body.manufacturingType as never)
    ) {
      return NextResponse.json({ error: "Invalid manufacturing type." }, { status: 400 });
    }

    if (body.cadOutputType && !CAD_OUTPUT_TYPES.includes(body.cadOutputType as never)) {
      return NextResponse.json({ error: "Invalid CAD output type." }, { status: 400 });
    }

    if (
      body.optimizationGoal &&
      !OPTIMIZATION_GOALS.includes(body.optimizationGoal as never)
    ) {
      return NextResponse.json({ error: "Invalid optimization goal." }, { status: 400 });
    }

    const sourceReferenceType = body.sourceReferenceType ?? "existing_part_files";
    if (!SOURCE_REFERENCE_TYPES.includes(sourceReferenceType as never)) {
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

    const defaultTitle =
      body.requestType === "manufacture_part"
        ? `Manufacture request - ${part.part_number || part.name}`
        : body.requestType === "cad_creation"
        ? `CAD creation request - ${part.part_number || part.name}`
        : `Optimization request - ${part.part_number || part.name}`;

    const insertPayload = {
      organization_id: part.organization_id,
      part_id: part.id,
      requested_by_user_id: user.id,
      request_type: body.requestType,
      status: "submitted",
      title: body.title?.trim() || defaultTitle,
      notes: body.notes?.trim() || null,
      priority,
      due_date: body.dueDate || null,
      quantity: body.quantity ?? null,
      target_process: body.targetProcess?.trim() || null,
      target_material: body.targetMaterial?.trim() || null,
      manufacturing_type:
        body.requestType === "manufacture_part" ? body.manufacturingType || null : null,
      cad_output_type:
        body.requestType === "cad_creation" ? body.cadOutputType || null : null,
      optimization_goal:
        body.requestType === "optimization" ? body.optimizationGoal || null : null,
      source_reference_type: sourceReferenceType,
      request_meta: {},
    };

    const { data: created, error: insertError } = await supabase
      .from("service_requests")
      .insert(insertPayload)
      .select("id")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message || "Failed to create request." },
        { status: 400 }
      );
    }

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error("POST /api/service-requests failed", error);
    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
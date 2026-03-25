import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type ProviderSelectionInput = {
  providerRelationshipId: string;
  providerOrgId: string;
};

type FileSelectionInput = {
  id: string;
  sourceType: "part_file" | "service_request_uploaded_file";
};

type CreateQuoteRoundBody = {
  serviceRequestId: string;
  mode: "competitive_quote" | "direct_award";
  providerSelections: ProviderSelectionInput[];
  fileSelections: FileSelectionInput[];
  targetDueDate?: string | null;
  requestedQuantity?: number | null;
  responseDeadline?: string | null;
  customerNotes?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateQuoteRoundBody;

  try {
    body = (await request.json()) as CreateQuoteRoundBody;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    serviceRequestId,
    mode,
    providerSelections,
    fileSelections,
    targetDueDate,
    requestedQuantity,
    responseDeadline,
    customerNotes,
  } = body;

  if (!serviceRequestId) {
    return NextResponse.json(
      { error: "serviceRequestId is required." },
      { status: 400 },
    );
  }

  if (!["competitive_quote", "direct_award"].includes(mode)) {
    return NextResponse.json({ error: "Invalid round mode." }, { status: 400 });
  }

  if (!Array.isArray(providerSelections) || providerSelections.length === 0) {
    return NextResponse.json(
      { error: "At least one provider must be selected." },
      { status: 400 },
    );
  }

  if (mode === "direct_award" && providerSelections.length !== 1) {
    return NextResponse.json(
      { error: "Direct award requires exactly one provider." },
      { status: 400 },
    );
  }

  if (mode === "competitive_quote" && providerSelections.length > 3) {
    return NextResponse.json(
      { error: "This workflow supports up to 3 providers per round." },
      { status: 400 },
    );
  }

  if (!Array.isArray(fileSelections) || fileSelections.length === 0) {
    return NextResponse.json(
      { error: "Select at least one file to share." },
      { status: 400 },
    );
  }

  const uniqueRelationshipIds = [...new Set(providerSelections.map((p) => p.providerRelationshipId))];
  const uniqueProviderOrgIds = [...new Set(providerSelections.map((p) => p.providerOrgId))];

  if (uniqueRelationshipIds.length !== providerSelections.length) {
    return NextResponse.json(
      { error: "Duplicate providers were selected." },
      { status: 400 },
    );
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError || !memberships?.length) {
    return NextResponse.json(
      { error: "Unable to resolve your organization membership." },
      { status: 403 },
    );
  }

  const membershipOrgIds = memberships.map((m) => m.organization_id);

  const { data: serviceRequest, error: serviceRequestError } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        organization_id,
        part_id,
        title,
        request_type,
        quantity,
        due_date,
        requested_item_name
      `,
    )
    .eq("id", serviceRequestId)
    .single();

  if (
    serviceRequestError ||
    !serviceRequest ||
    !membershipOrgIds.includes(serviceRequest.organization_id)
  ) {
    return NextResponse.json(
      { error: "Service request not found or not accessible." },
      { status: 404 },
    );
  }

  const customerOrgId = serviceRequest.organization_id;

  const { data: relationships, error: relationshipsError } = await supabase
    .from("provider_relationships")
    .select(
      `
        id,
        customer_org_id,
        provider_org_id,
        relationship_status,
        trust_status
      `,
    )
    .in("id", uniqueRelationshipIds);

  if (relationshipsError) {
    return NextResponse.json(
      { error: relationshipsError.message },
      { status: 400 },
    );
  }

  if (!relationships || relationships.length !== uniqueRelationshipIds.length) {
    return NextResponse.json(
      { error: "One or more selected provider relationships are invalid." },
      { status: 400 },
    );
  }

  const relationshipsById = new Map(relationships.map((row) => [row.id, row]));

  for (const selection of providerSelections) {
    const relationship = relationshipsById.get(selection.providerRelationshipId);

    if (!relationship) {
      return NextResponse.json(
        { error: "Selected provider relationship is missing." },
        { status: 400 },
      );
    }

    if (relationship.customer_org_id !== customerOrgId) {
      return NextResponse.json(
        { error: "A selected provider relationship does not belong to this request organization." },
        { status: 403 },
      );
    }

    if (relationship.provider_org_id !== selection.providerOrgId) {
      return NextResponse.json(
        { error: "Provider organization mismatch detected." },
        { status: 400 },
      );
    }

    if (!["invited", "active"].includes(relationship.relationship_status)) {
      return NextResponse.json(
        { error: "A selected provider relationship is not active for routing." },
        { status: 400 },
      );
    }
  }

  const partFileIds = fileSelections
    .filter((file) => file.sourceType === "part_file")
    .map((file) => file.id);

  const requestUploadIds = fileSelections
    .filter((file) => file.sourceType === "service_request_uploaded_file")
    .map((file) => file.id);

  let partFiles: {
    id: string;
    file_name: string;
    file_type: string | null;
    file_size_bytes: number | null;
    asset_category: string | null;
    storage_path: string | null;
  }[] = [];

  let requestUploads: {
    id: string;
    file_name: string;
    file_type: string | null;
    file_size_bytes: number | null;
    asset_category: string | null;
    storage_path: string | null;
  }[] = [];

  if (partFileIds.length > 0) {
    if (!serviceRequest.part_id) {
      return NextResponse.json(
        { error: "Part files cannot be shared on a request without a linked part." },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("part_files")
      .select("id, file_name, file_type, file_size_bytes, asset_category, storage_path")
      .eq("part_id", serviceRequest.part_id)
      .in("id", partFileIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    partFiles = data ?? [];

    if (partFiles.length !== partFileIds.length) {
      return NextResponse.json(
        { error: "One or more selected vault files could not be validated." },
        { status: 400 },
      );
    }
  }

  if (requestUploadIds.length > 0) {
    const { data, error } = await supabase
      .from("service_request_uploaded_files")
      .select("id, file_name, file_type, file_size_bytes, asset_category, storage_path")
      .eq("service_request_id", serviceRequestId)
      .in("id", requestUploadIds);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    requestUploads = data ?? [];

    if (requestUploads.length !== requestUploadIds.length) {
      return NextResponse.json(
        { error: "One or more selected request uploads could not be validated." },
        { status: 400 },
      );
    }
  }

  const { data: latestRound, error: latestRoundError } = await supabase
    .from("provider_quote_rounds")
    .select("round_number")
    .eq("service_request_id", serviceRequestId)
    .order("round_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestRoundError) {
    return NextResponse.json(
      { error: latestRoundError.message },
      { status: 400 },
    );
  }

  const roundNumber = (latestRound?.round_number ?? 0) + 1;
  const nowIso = new Date().toISOString();

  const { data: round, error: roundError } = await supabase
    .from("provider_quote_rounds")
    .insert({
      service_request_id: serviceRequestId,
      customer_org_id: customerOrgId,
      round_number: roundNumber,
      mode,
      status: "published",
      response_deadline: responseDeadline || null,
      target_due_date: targetDueDate || serviceRequest.due_date || null,
      requested_quantity:
        typeof requestedQuantity === "number"
          ? requestedQuantity
          : serviceRequest.quantity ?? null,
      customer_notes: customerNotes || null,
      created_by_user_id: user.id,
      published_at: nowIso,
    })
    .select("id, round_number")
    .single();

  if (roundError || !round) {
    return NextResponse.json(
      { error: roundError?.message || "Failed to create quote round." },
      { status: 400 },
    );
  }

  const packageTitleBase =
    serviceRequest.title ||
    serviceRequest.requested_item_name ||
    `${serviceRequest.request_type || "request"} package`;

  const packageInsertRows = providerSelections.map((selection) => ({
    provider_quote_round_id: round.id,
    service_request_id: serviceRequestId,
    customer_org_id: customerOrgId,
    provider_org_id: selection.providerOrgId,
    provider_relationship_id: selection.providerRelationshipId,
    package_status: "published",
    package_title: `${packageTitleBase} — Round ${round.round_number}`,
    shared_summary: customerNotes || null,
    process_requirements: {},
    target_due_date: targetDueDate || serviceRequest.due_date || null,
    requested_quantity:
      typeof requestedQuantity === "number"
        ? requestedQuantity
        : serviceRequest.quantity ?? null,
    response_deadline: responseDeadline || null,
    published_at: nowIso,
    customer_visible_status:
      mode === "competitive_quote" ? "Quote requested" : "Direct award sent",
    created_by_user_id: user.id,
  }));

  const { data: insertedPackages, error: packagesError } = await supabase
    .from("provider_request_packages")
    .insert(packageInsertRows)
    .select("id, provider_org_id");

  if (packagesError || !insertedPackages?.length) {
    return NextResponse.json(
      { error: packagesError?.message || "Failed to create provider packages." },
      { status: 400 },
    );
  }

  const packageIdByProviderOrgId = new Map(
    insertedPackages.map((row) => [row.provider_org_id, row.id]),
  );

  const providerPackageFiles: Record<string, unknown>[] = [];

  for (const selection of providerSelections) {
    const packageId = packageIdByProviderOrgId.get(selection.providerOrgId);
    if (!packageId) continue;

    for (const partFile of partFiles) {
      providerPackageFiles.push({
        provider_request_package_id: packageId,
        source_type: "part_file",
        source_part_file_id: partFile.id,
        file_name: partFile.file_name,
        file_type: partFile.file_type,
        file_size_bytes: partFile.file_size_bytes,
        asset_category: partFile.asset_category,
        storage_path: partFile.storage_path,
        uploaded_by_org_id: customerOrgId,
        uploaded_by_user_id: user.id,
        provider_uploaded: false,
      });
    }

    for (const upload of requestUploads) {
      providerPackageFiles.push({
        provider_request_package_id: packageId,
        source_type: "service_request_uploaded_file",
        source_service_request_uploaded_file_id: upload.id,
        file_name: upload.file_name,
        file_type: upload.file_type,
        file_size_bytes: upload.file_size_bytes,
        asset_category: upload.asset_category,
        storage_path: upload.storage_path,
        uploaded_by_org_id: customerOrgId,
        uploaded_by_user_id: user.id,
        provider_uploaded: false,
      });
    }
  }

  if (providerPackageFiles.length > 0) {
    const { error: filesError } = await supabase
      .from("provider_package_files")
      .insert(providerPackageFiles);

    if (filesError) {
      return NextResponse.json(
        { error: filesError.message },
        { status: 400 },
      );
    }
  }

  const eventRows = insertedPackages.map((pkg) => ({
    provider_request_package_id: pkg.id,
    actor_org_id: customerOrgId,
    actor_user_id: user.id,
    event_type: "provider_package_published",
    event_payload: {
      mode,
      roundNumber: round.round_number,
      serviceRequestId,
    },
  }));

  const messageRows = insertedPackages.map((pkg) => ({
    provider_request_package_id: pkg.id,
    sender_org_id: customerOrgId,
    sender_user_id: user.id,
    message_type: "system_event",
    message_body:
      mode === "competitive_quote"
        ? "A new quote request package has been published."
        : "A new direct-award provider package has been published.",
    is_system: true,
  }));

  const { error: eventsError } = await supabase
    .from("provider_request_events")
    .insert(eventRows);

  if (eventsError) {
    return NextResponse.json(
      { error: eventsError.message },
      { status: 400 },
    );
  }

  const { error: messagesError } = await supabase
    .from("provider_messages")
    .insert(messageRows);

  if (messagesError) {
    return NextResponse.json(
      { error: messagesError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    roundId: round.id,
    roundNumber: round.round_number,
  });
}
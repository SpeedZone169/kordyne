import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Client from "./Client";
import type {
  ProviderPackageDetailData,
  ProviderPackageDetailFile,
  ProviderPackageDetailQuote,
} from "./types";

type PageProps = {
  params: Promise<{
    packageId: string;
  }>;
};

export default async function ProviderRequestDetailPage({
  params,
}: PageProps) {
  const { packageId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    notFound();
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id);

  if (membershipsError) {
    throw new Error(membershipsError.message);
  }

  const membershipOrgIds = (memberships ?? []).map((m) => m.organization_id);

  if (membershipOrgIds.length === 0) {
    notFound();
  }

  const { data: initialPkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        service_request_id,
        customer_org_id,
        provider_org_id,
        package_status,
        package_title,
        shared_summary,
        target_due_date,
        requested_quantity,
        response_deadline,
        customer_visible_status,
        published_at,
        viewed_at,
        provider_responded_at,
        awarded_at,
        created_at
      `,
    )
    .eq("id", packageId)
    .single();

  if (
    packageError ||
    !initialPkg ||
    !membershipOrgIds.includes(initialPkg.provider_org_id) ||
    !initialPkg.published_at
  ) {
    notFound();
  }

  let pkg = initialPkg;

  if (!initialPkg.viewed_at) {
    const viewedAt = new Date().toISOString();
    const updates: Record<string, string> = {
      viewed_at: viewedAt,
    };

    if (initialPkg.package_status === "published") {
      updates.package_status = "viewed";
      updates.customer_visible_status = "Viewed by provider";
    }

    const { data: updatedPkg, error: updatePkgError } = await supabase
      .from("provider_request_packages")
      .update(updates)
      .eq("id", packageId)
      .select(
        `
          id,
          service_request_id,
          customer_org_id,
          provider_org_id,
          package_status,
          package_title,
          shared_summary,
          target_due_date,
          requested_quantity,
          response_deadline,
          customer_visible_status,
          published_at,
          viewed_at,
          provider_responded_at,
          awarded_at,
          created_at
        `,
      )
      .single();

    if (updatePkgError) {
      throw new Error(updatePkgError.message);
    }

    if (updatedPkg) {
      pkg = updatedPkg;
    }
  }

  const { data: customerOrg, error: customerOrgError } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", pkg.customer_org_id)
    .single();

  if (customerOrgError) {
    throw new Error(customerOrgError.message);
  }

  const { data: serviceRequest, error: serviceRequestError } = await supabase
    .from("service_requests")
    .select(
      `
        id,
        title,
        request_type,
        request_origin,
        requested_item_name,
        requested_item_reference,
        due_date,
        quantity,
        status,
        target_process,
        target_material
      `,
    )
    .eq("id", pkg.service_request_id)
    .maybeSingle();

  if (serviceRequestError) {
    throw new Error(serviceRequestError.message);
  }

  const { data: files, error: filesError } = await supabase
    .from("provider_package_files")
    .select(
      `
        id,
        source_type,
        file_name,
        file_type,
        file_size_bytes,
        asset_category,
        storage_path,
        provider_uploaded,
        shared_at,
        created_at
      `,
    )
    .eq("provider_request_package_id", pkg.id)
    .order("created_at", { ascending: false });

  if (filesError) {
    throw new Error(filesError.message);
  }

  const { data: quotes, error: quotesError } = await supabase
    .from("provider_quotes")
    .select(
      `
        id,
        quote_version,
        status,
        currency_code,
        setup_price,
        unit_price,
        total_price,
        shipping_price,
        estimated_lead_time_days,
        earliest_start_date,
        estimated_completion_date,
        quote_valid_until,
        notes,
        exceptions,
        submitted_at,
        created_at
      `,
    )
    .eq("provider_request_package_id", pkg.id)
    .order("quote_version", { ascending: false });

  if (quotesError) {
    throw new Error(quotesError.message);
  }

  const mappedFiles: ProviderPackageDetailFile[] = (files ?? []).map((file) => ({
    id: file.id,
    sourceType: file.source_type as ProviderPackageDetailFile["sourceType"],
    fileName: file.file_name,
    fileType: file.file_type,
    fileSizeBytes: file.file_size_bytes,
    assetCategory: file.asset_category,
    storagePath: file.storage_path,
    providerUploaded: file.provider_uploaded,
    sharedAt: file.shared_at,
    createdAt: file.created_at,
  }));

  const mappedQuotes: ProviderPackageDetailQuote[] = (quotes ?? []).map(
    (quote) => ({
      id: quote.id,
      quoteVersion: quote.quote_version,
      status: quote.status as ProviderPackageDetailQuote["status"],
      currencyCode: quote.currency_code,
      setupPrice: quote.setup_price,
      unitPrice: quote.unit_price,
      totalPrice: quote.total_price,
      shippingPrice: quote.shipping_price,
      estimatedLeadTimeDays: quote.estimated_lead_time_days,
      earliestStartDate: quote.earliest_start_date,
      estimatedCompletionDate: quote.estimated_completion_date,
      quoteValidUntil: quote.quote_valid_until,
      notes: quote.notes,
      exceptions: quote.exceptions,
      submittedAt: quote.submitted_at,
      createdAt: quote.created_at,
    }),
  );

  const data: ProviderPackageDetailData = {
    package: {
      id: pkg.id,
      serviceRequestId: pkg.service_request_id,
      customerOrgName: customerOrg?.name ?? "Unknown customer",
      packageTitle: pkg.package_title,
      packageStatus:
        pkg.package_status as ProviderPackageDetailData["package"]["packageStatus"],
      customerVisibleStatus: pkg.customer_visible_status,
      sharedSummary: pkg.shared_summary,
      targetDueDate: pkg.target_due_date,
      requestedQuantity: pkg.requested_quantity,
      responseDeadline: pkg.response_deadline,
      publishedAt: pkg.published_at,
      viewedAt: pkg.viewed_at,
      providerRespondedAt: pkg.provider_responded_at,
      awardedAt: pkg.awarded_at,
      createdAt: pkg.created_at,
    },
    request: serviceRequest
      ? {
          id: serviceRequest.id,
          title: serviceRequest.title,
          requestType: serviceRequest.request_type,
          requestOrigin: serviceRequest.request_origin,
          requestedItemName: serviceRequest.requested_item_name,
          requestedItemReference: serviceRequest.requested_item_reference,
          dueDate: serviceRequest.due_date,
          quantity: serviceRequest.quantity,
          status: serviceRequest.status,
          targetProcess: serviceRequest.target_process,
          targetMaterial: serviceRequest.target_material,
        }
      : null,
    files: mappedFiles,
    quotes: mappedQuotes,
  };

  return <Client data={data} />;
}
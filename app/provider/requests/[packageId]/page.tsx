import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Client from "./Client";
import type {
  ProviderInvoiceSummary,
  ProviderPackageDetailData,
  ProviderPackageDetailFile,
  ProviderPackageDetailQuote,
} from "./types";

type PageProps = {
  params: Promise<{
    packageId: string;
  }>;
};

type MembershipRow = {
  organization_id: string;
};

type ProviderInvoiceRow = {
  id: string;
  invoice_number: string;
  invoice_source: "kordyne_generated" | "provider_uploaded";
  status: string;
  currency_code: string | null;
  subtotal_amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  uploaded_file_name: string | null;
  created_at: string;
};

type ProviderPackageFileRow = {
  id: string;
  source_type: string;
  file_name: string;
  file_type: string | null;
  file_size_bytes: number | null;
  asset_category: string | null;
  storage_path: string;
  provider_uploaded: boolean | null;
  shared_at: string | null;
  created_at: string;
};

function getPreviewKind(
  fileName: string,
  fileType: string | null,
): "image" | "pdf" | "cad" | "other" {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  const mime = (fileType || "").toLowerCase();

  if (
    mime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  if (mime === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (["stl", "step", "stp"].includes(extension)) {
    return "cad";
  }

  return "other";
}

function getCandidateBuckets(file: ProviderPackageFileRow) {
  if (file.provider_uploaded) {
    return ["provider-package-files", "provider-files"];
  }

  if (file.source_type === "part_file") {
    return ["part-files"];
  }

  if (file.source_type === "service_request_uploaded_file") {
    return [
      "service-request-files",
      "service-request-uploads",
      "service-request-uploaded-files",
    ];
  }

  return [
    "provider-package-files",
    "part-files",
    "service-request-files",
    "service-request-uploads",
  ];
}

async function createSignedUrlFromCandidateBuckets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: ProviderPackageFileRow,
  downloadFileName?: string,
) {
  const buckets = getCandidateBuckets(file);

  for (const bucket of buckets) {
    const result = await supabase.storage.from(bucket).createSignedUrl(
      file.storage_path,
      60 * 10,
      downloadFileName
        ? {
            download: downloadFileName,
          }
        : undefined,
    );

    if (!result.error && result.data?.signedUrl) {
      return result.data.signedUrl;
    }
  }

  return null;
}

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

  const membershipOrgIds = (memberships as MembershipRow[] | null)?.map(
    (m) => m.organization_id,
  ) ?? [];

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
      .maybeSingle();

    if (updatePkgError) {
      throw new Error(updatePkgError.message);
    }

    if (updatedPkg) {
      pkg = updatedPkg;
    }
  }

  const { data: customerOrg } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", pkg.customer_org_id)
    .maybeSingle();

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
        quote_reference,
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

  const { data: invoicesRaw, error: invoicesError } = await supabase
    .from("provider_invoices")
    .select(
      `
        id,
        invoice_number,
        invoice_source,
        status,
        currency_code,
        subtotal_amount,
        tax_amount,
        total_amount,
        issued_at,
        due_date,
        paid_at,
        uploaded_file_name,
        created_at
      `,
    )
    .eq("provider_request_package_id", pkg.id)
    .order("created_at", { ascending: false });

  if (invoicesError) {
    throw new Error(invoicesError.message);
  }

  const fileRows = (files ?? []) as ProviderPackageFileRow[];

  const mappedFiles: ProviderPackageDetailFile[] = await Promise.all(
    fileRows.map(async (file) => {
      const previewKind = getPreviewKind(file.file_name, file.file_type);

      const [previewUrl, downloadUrl] = await Promise.all([
        previewKind === "pdf" || previewKind === "image"
          ? createSignedUrlFromCandidateBuckets(supabase, file)
          : createSignedUrlFromCandidateBuckets(supabase, file, file.file_name),
        createSignedUrlFromCandidateBuckets(supabase, file, file.file_name),
      ]);

      return {
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
        previewUrl,
        downloadUrl,
        previewKind,
      };
    }),
  );

  const mappedQuotes: ProviderPackageDetailQuote[] = (quotes ?? []).map(
    (quote) => ({
      id: quote.id,
      quoteReference: quote.quote_reference,
      quoteVersion: quote.quote_version,
      status: quote.status,
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

  const mappedInvoices: ProviderInvoiceSummary[] = (
    (invoicesRaw ?? []) as ProviderInvoiceRow[]
  ).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    invoiceSource: invoice.invoice_source,
    status: invoice.status,
    currencyCode: invoice.currency_code,
    subtotalAmount: invoice.subtotal_amount,
    taxAmount: invoice.tax_amount,
    totalAmount: invoice.total_amount,
    issuedAt: invoice.issued_at,
    dueDate: invoice.due_date,
    paidAt: invoice.paid_at,
    uploadedFileName: invoice.uploaded_file_name,
    createdAt: invoice.created_at,
  }));

  const data: ProviderPackageDetailData = {
    package: {
      id: pkg.id,
      providerOrgId: pkg.provider_org_id,
      serviceRequestId: pkg.service_request_id,
      customerOrgName:
        customerOrg?.name ?? `Customer ${pkg.customer_org_id.slice(0, 8)}`,
      packageTitle: pkg.package_title,
      packageStatus: pkg.package_status,
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
    invoices: mappedInvoices,
  };

  return <Client data={data} />;
}
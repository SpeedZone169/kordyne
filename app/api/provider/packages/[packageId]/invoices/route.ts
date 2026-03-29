import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

type CreateInvoiceBody = {
  invoiceSource?: "kordyne_generated" | "provider_uploaded";
  invoiceNumber?: string;
  currencyCode?: string;
  subtotalAmount?: number | null;
  taxAmount?: number | null;
  totalAmount?: number | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  notes?: string | null;
  uploadedFilePath?: string | null;
  uploadedFileName?: string | null;
  uploadedFileType?: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ packageId: string }> },
) {
  const { packageId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: CreateInvoiceBody;

  try {
    body = (await request.json()) as CreateInvoiceBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const invoiceSource = body.invoiceSource;
  const invoiceNumber = String(body.invoiceNumber || "").trim();
  const currencyCode = String(body.currencyCode || "EUR").trim().toUpperCase();
  const subtotalAmount = body.subtotalAmount ?? null;
  const taxAmount = body.taxAmount ?? 0;
  const totalAmount = body.totalAmount ?? null;
  const issuedAt = body.issuedAt || new Date().toISOString();
  const dueDate = body.dueDate || null;
  const notes = body.notes || null;
  const uploadedFilePath = body.uploadedFilePath || null;
  const uploadedFileName = body.uploadedFileName || null;
  const uploadedFileType = body.uploadedFileType || null;

  if (
    invoiceSource !== "kordyne_generated" &&
    invoiceSource !== "provider_uploaded"
  ) {
    return NextResponse.json(
      { error: "Invalid invoice source." },
      { status: 400 },
    );
  }

  if (!invoiceNumber) {
    return NextResponse.json(
      { error: "Invoice number is required." },
      { status: 400 },
    );
  }

  if (invoiceSource === "provider_uploaded" && !uploadedFilePath) {
    return NextResponse.json(
      { error: "Uploaded invoice file is required." },
      { status: 400 },
    );
  }

  const { data: membershipsRaw, error: membershipsError } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  if (membershipsError) {
    return NextResponse.json(
      { error: membershipsError.message },
      { status: 400 },
    );
  }

  const memberships = (membershipsRaw ?? []) as MembershipRow[];

  const { data: pkg, error: packageError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        provider_org_id,
        customer_org_id,
        service_request_id,
        package_status,
        awarded_at
      `,
    )
    .eq("id", packageId)
    .single();

  if (packageError || !pkg) {
    return NextResponse.json(
      { error: "Provider package not found." },
      { status: 404 },
    );
  }

  const canCreate = memberships.some(
    (membership) =>
      membership.organization_id === pkg.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  if (!canCreate) {
    return NextResponse.json(
      { error: "You do not have permission to create invoices for this package." },
      { status: 403 },
    );
  }

  if (pkg.package_status !== "awarded" && !pkg.awarded_at) {
    return NextResponse.json(
      { error: "Invoices can only be created for awarded packages." },
      { status: 400 },
    );
  }

  const { data: latestAcceptedQuote } = await supabase
    .from("provider_quotes")
    .select(
      `
        id,
        quote_reference,
        quote_version,
        status,
        currency_code,
        total_price,
        submitted_at
      `,
    )
    .eq("provider_request_package_id", packageId)
    .in("status", ["accepted", "submitted"])
    .order("quote_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshotJson = {
    invoice: {
      invoiceNumber,
      invoiceSource,
      currencyCode,
      subtotalAmount,
      taxAmount,
      totalAmount,
      issuedAt,
      dueDate,
      notes,
      uploadedFilePath,
      uploadedFileName,
      uploadedFileType,
    },
    quote: latestAcceptedQuote
      ? {
          id: latestAcceptedQuote.id,
          quoteReference: latestAcceptedQuote.quote_reference,
          quoteVersion: latestAcceptedQuote.quote_version,
          status: latestAcceptedQuote.status,
          currencyCode: latestAcceptedQuote.currency_code,
          totalPrice: latestAcceptedQuote.total_price,
          submittedAt: latestAcceptedQuote.submitted_at,
        }
      : null,
  };

  const { data: invoice, error: invoiceError } = await supabase
    .from("provider_invoices")
    .insert({
      provider_request_package_id: pkg.id,
      provider_quote_id: latestAcceptedQuote?.id ?? null,
      provider_org_id: pkg.provider_org_id,
      customer_org_id: pkg.customer_org_id,
      invoice_source: invoiceSource,
      invoice_number: invoiceNumber,
      status: "issued",
      currency_code: currencyCode,
      subtotal_amount: subtotalAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      issued_at: issuedAt,
      due_date: dueDate,
      notes,
      uploaded_file_path: uploadedFilePath,
      uploaded_file_name: uploadedFileName,
      uploaded_file_type: uploadedFileType,
      snapshot_json: snapshotJson,
      created_by_user_id: user.id,
      finalized_at: invoiceSource === "kordyne_generated" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: invoiceError?.message || "Failed to create invoice." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    invoiceId: invoice.id,
  });
}
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  absoluteUrl,
  getOrgNotificationRecipients,
  sendWorkflowEmail,
} from "@/lib/email";

type MembershipRow = {
  organization_id: string;
  role: string;
};

type ExistingInvoiceRow = {
  id: string;
  total_amount: number | null;
  status: string | null;
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

function toPositiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

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
  const uploadedFilePath = body.uploadedFilePath || null;
  const uploadedFileName = body.uploadedFileName || null;
  const uploadedFileType = body.uploadedFileType || null;
  const issuedAt = body.issuedAt || new Date().toISOString();
  const dueDate = body.dueDate || null;
  const notes = body.notes || null;

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

  if (invoiceSource === "provider_uploaded") {
    if (!uploadedFilePath) {
      return NextResponse.json(
        { error: "Uploaded invoice file is required." },
        { status: 400 },
      );
    }

    if (uploadedFileType && uploadedFileType !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF invoice uploads are allowed." },
        { status: 400 },
      );
    }

    if (uploadedFileName && !uploadedFileName.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json(
        { error: "Uploaded invoice file must be a PDF." },
        { status: 400 },
      );
    }
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

  const { data: latestAcceptedQuote, error: quoteError } = await supabase
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

  if (quoteError) {
    return NextResponse.json(
      { error: quoteError.message },
      { status: 400 },
    );
  }

  if (!latestAcceptedQuote || latestAcceptedQuote.total_price == null) {
    return NextResponse.json(
      {
        error:
          "An accepted quote with a total amount is required before invoicing.",
      },
      { status: 400 },
    );
  }

  const fullPoAmount = roundMoney(Number(latestAcceptedQuote.total_price));

  if (!Number.isFinite(fullPoAmount) || fullPoAmount <= 0) {
    return NextResponse.json(
      { error: "The accepted quote total is invalid for invoicing." },
      { status: 400 },
    );
  }

  const { data: existingInvoicesRaw, error: existingInvoicesError } =
    await supabase
      .from("provider_invoices")
      .select("id, total_amount, status")
      .eq("provider_request_package_id", packageId);

  if (existingInvoicesError) {
    return NextResponse.json(
      { error: existingInvoicesError.message },
      { status: 400 },
    );
  }

  const existingInvoices = (existingInvoicesRaw ?? []) as ExistingInvoiceRow[];

  const alreadyInvoicedAmount = roundMoney(
    existingInvoices.reduce((sum, invoice) => {
      const status = (invoice.status || "").toLowerCase();
      if (status === "void" || status === "cancelled" || status === "canceled") {
        return sum;
      }

      const value = Number(invoice.total_amount ?? 0);
      return Number.isFinite(value) ? sum + value : sum;
    }, 0),
  );

  const remainingBeforeInvoice = roundMoney(
    Math.max(fullPoAmount - alreadyInvoicedAmount, 0),
  );

  const currentInvoiceAmount = toPositiveNumber(body.totalAmount);

  if (currentInvoiceAmount == null) {
    return NextResponse.json(
      { error: "Invoice amount is required and must be greater than zero." },
      { status: 400 },
    );
  }

  if (currentInvoiceAmount > remainingBeforeInvoice) {
    return NextResponse.json(
      {
        error: "Invoice amount exceeds the remaining purchase order value.",
        fullPoAmount,
        alreadyInvoicedAmount,
        remainingBeforeInvoice,
      },
      { status: 400 },
    );
  }

  const totalAmount = roundMoney(currentInvoiceAmount);
  const taxAmount = roundMoney(Number(body.taxAmount ?? 0));
  const subtotalAmount =
    body.subtotalAmount != null
      ? roundMoney(Number(body.subtotalAmount))
      : roundMoney(totalAmount - taxAmount);

  if (!Number.isFinite(subtotalAmount) || subtotalAmount < 0) {
    return NextResponse.json(
      { error: "Subtotal amount is invalid." },
      { status: 400 },
    );
  }

  const remainingAfterInvoice = roundMoney(
    Math.max(remainingBeforeInvoice - totalAmount, 0),
  );

  const currencyCode = String(
    body.currencyCode || latestAcceptedQuote.currency_code || "EUR",
  )
    .trim()
    .toUpperCase();

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
      invoiceKind: remainingAfterInvoice === 0 ? "final" : "partial",
    },
    quote: {
      id: latestAcceptedQuote.id,
      quoteReference: latestAcceptedQuote.quote_reference,
      quoteVersion: latestAcceptedQuote.quote_version,
      status: latestAcceptedQuote.status,
      currencyCode: latestAcceptedQuote.currency_code,
      totalPrice: latestAcceptedQuote.total_price,
      submittedAt: latestAcceptedQuote.submitted_at,
    },
    purchaseOrderSummary: {
      fullPoAmount,
      alreadyInvoicedAmount,
      remainingBeforeInvoice,
      currentInvoiceAmount: totalAmount,
      remainingAfterInvoice,
    },
  };

  const { data: invoice, error: invoiceError } = await supabase
    .from("provider_invoices")
    .insert({
      provider_request_package_id: pkg.id,
      provider_quote_id: latestAcceptedQuote.id,
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
      finalized_at:
        invoiceSource === "kordyne_generated" ? new Date().toISOString() : null,
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

  try {
    const [{ data: providerOrg }, { data: serviceRequest }] = await Promise.all([
      supabase
        .from("organizations")
        .select("name")
        .eq("id", pkg.provider_org_id)
        .maybeSingle(),
      supabase
        .from("service_requests")
        .select("id, title, requested_item_name")
        .eq("id", pkg.service_request_id)
        .maybeSingle(),
    ]);

    const recipients = await getOrgNotificationRecipients(pkg.customer_org_id);

    if (recipients.length) {
      await sendWorkflowEmail({
        to: recipients.map((recipient) => recipient.email),
        subject: `Invoice ${invoiceNumber} issued`,
        previewText: "A provider invoice is ready for AP review in Kordyne.",
        eyebrow: "Kordyne invoicing",
        headline: "A provider invoice has been issued",
        intro:
          "A provider issued a new invoice in Kordyne. Review the invoice, receipt details, and AP workflow on the customer side.",
        detailRows: [
          {
            label: "Provider",
            value: providerOrg?.name ?? "Provider",
          },
          {
            label: "Request",
            value:
              serviceRequest?.title ||
              serviceRequest?.requested_item_name ||
              "Manufacturing request",
          },
          {
            label: "Invoice",
            value: invoiceNumber,
          },
          {
            label: "Amount",
            value: `${currencyCode} ${totalAmount.toFixed(2)}`,
          },
          {
            label: "Type",
            value: remainingAfterInvoice === 0 ? "Final" : "Partial",
          },
        ],
        primaryActionLabel: "Open invoice",
        primaryActionUrl: absoluteUrl(`/invoices/${invoice.id}`),
        secondaryActionLabel: "Open request invoices",
        secondaryActionUrl: absoluteUrl(
          `/dashboard/requests/${pkg.service_request_id}/invoices`,
        ),
      });
    }
  } catch (error) {
    console.error("Failed to send invoice notification email:", error);
  }

  return NextResponse.json({
    success: true,
    invoiceId: invoice.id,
    poSummary: {
      fullPoAmount,
      alreadyInvoicedAmount,
      currentInvoiceAmount: totalAmount,
      remainingBeforeInvoice,
      remainingAfterInvoice,
      invoiceKind: remainingAfterInvoice === 0 ? "final" : "partial",
    },
  });
}
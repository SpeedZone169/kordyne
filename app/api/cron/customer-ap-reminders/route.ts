import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  absoluteUrl,
  getOrgNotificationRecipients,
  sendWorkflowEmail,
} from "@/lib/email";

type InvoiceRow = {
  id: string;
  provider_request_package_id: string;
  provider_org_id: string;
  customer_org_id: string;
  invoice_number: string;
  status: string;
  currency_code: string | null;
  total_amount: number | null;
  due_date: string | null;
  paid_at: string | null;
  received_at: string | null;
  approved_at: string | null;
};

type PackageRow = {
  id: string;
  service_request_id: string;
  package_title: string | null;
};

type ServiceRequestRow = {
  id: string;
  title: string | null;
  requested_item_name: string | null;
};

type OrganizationRow = {
  id: string;
  name: string;
};

function formatMoney(value: number | null, currencyCode: string | null) {
  if (value == null || !Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currencyCode || "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function getReminderStage(invoice: Pick<InvoiceRow, "status" | "received_at" | "approved_at">) {
  if (invoice.approved_at || invoice.status === "approved") {
    return {
      label: "Payment pending",
      intro:
        "An approved invoice is now overdue for payment. Review payment reference and settlement status in Kordyne.",
    };
  }

  if (invoice.received_at || invoice.status === "received") {
    return {
      label: "Approval pending",
      intro:
        "A received invoice is now overdue for approval. Review the invoice and continue the AP workflow in Kordyne.",
    };
  }

  return {
    label: "Receipt required",
    intro:
      "A provider invoice is overdue and still needs customer AP action. Review and receipt the invoice in Kordyne.",
  };
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: invoicesRaw, error: invoicesError } = await supabase
    .from("provider_invoices")
    .select(
      `
        id,
        provider_request_package_id,
        provider_org_id,
        customer_org_id,
        invoice_number,
        status,
        currency_code,
        total_amount,
        due_date,
        paid_at,
        received_at,
        approved_at
      `,
    )
    .is("paid_at", null)
    .not("due_date", "is", null)
    .lt("due_date", today);

  if (invoicesError) {
    return NextResponse.json(
      { error: invoicesError.message },
      { status: 500 },
    );
  }

  const allInvoices = (invoicesRaw ?? []) as InvoiceRow[];

  const overdueInvoices = allInvoices.filter((invoice) => {
    const status = (invoice.status || "").toLowerCase();
    return status !== "paid" && status !== "cancelled" && status !== "void";
  });

  if (!overdueInvoices.length) {
    return NextResponse.json({
      success: true,
      processed: 0,
      emailsSent: 0,
      skipped: 0,
      message: "No overdue unpaid customer invoices found.",
    });
  }

  const packageIds = [
    ...new Set(overdueInvoices.map((invoice) => invoice.provider_request_package_id)),
  ];
  const providerOrgIds = [
    ...new Set(overdueInvoices.map((invoice) => invoice.provider_org_id)),
  ];
  const customerOrgIds = [
    ...new Set(overdueInvoices.map((invoice) => invoice.customer_org_id)),
  ];

  const [
    { data: packagesRaw, error: packagesError },
    { data: providerOrgsRaw, error: providerOrgsError },
    { data: customerOrgsRaw, error: customerOrgsError },
  ] = await Promise.all([
    supabase
      .from("provider_request_packages")
      .select("id, service_request_id, package_title")
      .in("id", packageIds),
    supabase
      .from("organizations")
      .select("id, name")
      .in("id", providerOrgIds),
    supabase
      .from("organizations")
      .select("id, name")
      .in("id", customerOrgIds),
  ]);

  if (packagesError) {
    return NextResponse.json(
      { error: packagesError.message },
      { status: 500 },
    );
  }

  if (providerOrgsError) {
    return NextResponse.json(
      { error: providerOrgsError.message },
      { status: 500 },
    );
  }

  if (customerOrgsError) {
    return NextResponse.json(
      { error: customerOrgsError.message },
      { status: 500 },
    );
  }

  const packageRows = (packagesRaw ?? []) as PackageRow[];
  const serviceRequestIds = [
    ...new Set(packageRows.map((pkg) => pkg.service_request_id).filter(Boolean)),
  ];

  const { data: serviceRequestsRaw, error: serviceRequestsError } = await supabase
    .from("service_requests")
    .select("id, title, requested_item_name")
    .in("id", serviceRequestIds);

  if (serviceRequestsError) {
    return NextResponse.json(
      { error: serviceRequestsError.message },
      { status: 500 },
    );
  }

  const packageMap = new Map(
    packageRows.map((pkg) => [pkg.id, pkg]),
  );

  const serviceRequestMap = new Map(
    ((serviceRequestsRaw ?? []) as ServiceRequestRow[]).map((row) => [row.id, row]),
  );

  const providerOrgMap = new Map(
    ((providerOrgsRaw ?? []) as OrganizationRow[]).map((org) => [org.id, org.name]),
  );

  const customerOrgMap = new Map(
    ((customerOrgsRaw ?? []) as OrganizationRow[]).map((org) => [org.id, org.name]),
  );

  let emailsSent = 0;
  let skipped = 0;

  const results = await Promise.allSettled(
    overdueInvoices.map(async (invoice) => {
      const recipients = await getOrgNotificationRecipients(invoice.customer_org_id);

      if (!recipients.length) {
        skipped += 1;
        return;
      }

      const pkg = packageMap.get(invoice.provider_request_package_id);
      const serviceRequest = pkg
        ? serviceRequestMap.get(pkg.service_request_id)
        : null;

      const providerName = providerOrgMap.get(invoice.provider_org_id) ?? "Provider";
      const customerName = customerOrgMap.get(invoice.customer_org_id) ?? "Customer";
      const requestLabel =
        serviceRequest?.title ||
        serviceRequest?.requested_item_name ||
        pkg?.package_title ||
        "Manufacturing request";

      const reminderStage = getReminderStage(invoice);

      await sendWorkflowEmail({
        to: recipients.map((recipient) => recipient.email),
        subject: `Overdue invoice reminder: ${invoice.invoice_number}`,
        previewText: "A customer AP action is overdue in Kordyne.",
        eyebrow: "Kordyne AP reminder",
        headline: reminderStage.label,
        intro: reminderStage.intro,
        detailRows: [
          {
            label: "Customer",
            value: customerName,
          },
          {
            label: "Provider",
            value: providerName,
          },
          {
            label: "Request",
            value: requestLabel,
          },
          {
            label: "Invoice",
            value: invoice.invoice_number,
          },
          {
            label: "Amount",
            value: formatMoney(invoice.total_amount, invoice.currency_code),
          },
          {
            label: "Due date",
            value: invoice.due_date || "—",
          },
        ],
        primaryActionLabel: "Open invoice",
        primaryActionUrl: absoluteUrl(`/invoices/${invoice.id}`),
        secondaryActionLabel: "Open request invoices",
        secondaryActionUrl: pkg
          ? absoluteUrl(`/dashboard/requests/${pkg.service_request_id}/invoices`)
          : absoluteUrl("/dashboard/requests"),
        footerNote:
          "This reminder was sent automatically because the invoice due date has passed and payment has not been recorded.",
      });

      emailsSent += 1;
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send customer AP reminder:", result.reason);
    }
  }

  return NextResponse.json({
    success: true,
    processed: overdueInvoices.length,
    emailsSent,
    skipped,
  });
}
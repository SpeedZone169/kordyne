import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  absoluteUrl,
  getOrgNotificationRecipients,
  sendWorkflowEmail,
} from "@/lib/email";

type OverduePackageRow = {
  id: string;
  provider_org_id: string;
  customer_org_id: string;
  service_request_id: string;
  package_title: string | null;
  package_status: string;
  response_deadline: string | null;
  published_at: string | null;
  provider_responded_at: string | null;
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

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: overduePackagesRaw, error: overduePackagesError } = await supabase
    .from("provider_request_packages")
    .select(
      `
        id,
        provider_org_id,
        customer_org_id,
        service_request_id,
        package_title,
        package_status,
        response_deadline,
        published_at,
        provider_responded_at
      `,
    )
    .in("package_status", ["published", "viewed", "awaiting_provider_response"])
    .not("response_deadline", "is", null)
    .lt("response_deadline", nowIso)
    .is("provider_responded_at", null);

  if (overduePackagesError) {
    return NextResponse.json(
      { error: overduePackagesError.message },
      { status: 500 },
    );
  }

  const overduePackages = (overduePackagesRaw ?? []) as OverduePackageRow[];

  if (!overduePackages.length) {
    return NextResponse.json({
      success: true,
      processed: 0,
      emailsSent: 0,
      skipped: 0,
      message: "No overdue provider responses found.",
    });
  }

  const providerOrgIds = [...new Set(overduePackages.map((pkg) => pkg.provider_org_id))];
  const customerOrgIds = [...new Set(overduePackages.map((pkg) => pkg.customer_org_id))];
  const serviceRequestIds = [...new Set(overduePackages.map((pkg) => pkg.service_request_id))];

  const [
    { data: providerOrgsRaw, error: providerOrgsError },
    { data: customerOrgsRaw, error: customerOrgsError },
    { data: serviceRequestsRaw, error: serviceRequestsError },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name")
      .in("id", providerOrgIds),
    supabase
      .from("organizations")
      .select("id, name")
      .in("id", customerOrgIds),
    supabase
      .from("service_requests")
      .select("id, title, requested_item_name")
      .in("id", serviceRequestIds),
  ]);

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

  if (serviceRequestsError) {
    return NextResponse.json(
      { error: serviceRequestsError.message },
      { status: 500 },
    );
  }

  const providerOrgMap = new Map(
    ((providerOrgsRaw ?? []) as OrganizationRow[]).map((org) => [org.id, org.name]),
  );

  const customerOrgMap = new Map(
    ((customerOrgsRaw ?? []) as OrganizationRow[]).map((org) => [org.id, org.name]),
  );

  const serviceRequestMap = new Map(
    ((serviceRequestsRaw ?? []) as ServiceRequestRow[]).map((row) => [row.id, row]),
  );

  let emailsSent = 0;
  let skipped = 0;

  const results = await Promise.allSettled(
    overduePackages.map(async (pkg) => {
      const recipients = await getOrgNotificationRecipients(pkg.provider_org_id);

      if (!recipients.length) {
        skipped += 1;
        return;
      }

      const serviceRequest = serviceRequestMap.get(pkg.service_request_id);
      const providerName = providerOrgMap.get(pkg.provider_org_id) ?? "Provider";
      const customerName = customerOrgMap.get(pkg.customer_org_id) ?? "Customer";
      const requestLabel =
        serviceRequest?.title ||
        serviceRequest?.requested_item_name ||
        pkg.package_title ||
        "Manufacturing request";

      await sendWorkflowEmail({
        to: recipients.map((recipient) => recipient.email),
        subject: `Overdue response reminder: ${requestLabel}`,
        previewText: "A provider package response deadline has passed.",
        eyebrow: "Kordyne reminder",
        headline: "A provider response is overdue",
        intro:
          "A provider package assigned to your organization is now past its response deadline. Review the package and submit your quote or response as soon as possible.",
        detailRows: [
          {
            label: "Provider",
            value: providerName,
          },
          {
            label: "Customer",
            value: customerName,
          },
          {
            label: "Request",
            value: requestLabel,
          },
          {
            label: "Package",
            value: pkg.package_title ?? "Provider package",
          },
          {
            label: "Deadline",
            value: pkg.response_deadline ?? "—",
          },
        ],
        primaryActionLabel: "Open package",
        primaryActionUrl: absoluteUrl(`/provider/requests/${pkg.id}`),
        secondaryActionLabel: "Open provider portal",
        secondaryActionUrl: absoluteUrl("/providers/login"),
        footerNote:
          "This reminder was sent automatically because the response deadline has passed and no provider response has been recorded yet.",
      });

      emailsSent += 1;
    }),
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send overdue provider reminder:", result.reason);
    }
  }

  return NextResponse.json({
    success: true,
    processed: overduePackages.length,
    emailsSent,
    skipped,
  });
}
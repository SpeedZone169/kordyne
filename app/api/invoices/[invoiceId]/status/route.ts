import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

type StatusBody = {
  status?: "sent" | "viewed" | "paid" | "cancelled";
};

const ALLOWED_STATUSES = new Set(["sent", "viewed", "paid", "cancelled"]);

export async function POST(
  request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const { invoiceId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: StatusBody;

  try {
    body = (await request.json()) as StatusBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const nextStatus = body.status;

  if (!nextStatus || !ALLOWED_STATUSES.has(nextStatus)) {
    return NextResponse.json(
      { error: "Invalid invoice status." },
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

  const { data: invoice, error: invoiceError } = await supabase
    .from("provider_invoices")
    .select(
      `
        id,
        provider_org_id,
        customer_org_id,
        status
      `,
    )
    .eq("id", invoiceId)
    .single();

  if (invoiceError || !invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const isProviderManager = memberships.some(
    (membership) =>
      membership.organization_id === invoice.provider_org_id &&
      ["admin", "engineer"].includes(membership.role),
  );

  const isCustomerMember = memberships.some(
    (membership) => membership.organization_id === invoice.customer_org_id,
  );

  if (nextStatus === "viewed") {
    if (!isCustomerMember && !isProviderManager) {
      return NextResponse.json(
        { error: "You do not have permission to mark this invoice as viewed." },
        { status: 403 },
      );
    }
  } else if (!isProviderManager) {
    return NextResponse.json(
      { error: "Only provider managers can update this invoice status." },
      { status: 403 },
    );
  }

  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "paid") {
    updatePayload.paid_at = new Date().toISOString();
  }

  if (nextStatus !== "paid") {
    updatePayload.paid_at = null;
  }

  const { error: updateError } = await supabase
    .from("provider_invoices")
    .update(updatePayload)
    .eq("id", invoiceId);

  if (updateError) {
    return NextResponse.json(
      { error: updateError.message },
      { status: 400 },
    );
  }

  return NextResponse.json({
    success: true,
    invoiceId,
    status: nextStatus,
  });
}
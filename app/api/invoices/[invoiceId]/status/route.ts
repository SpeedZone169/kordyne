import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type MembershipRow = {
  organization_id: string;
  role: string;
};

type StatusBody = {
  status?:
    | "sent"
    | "viewed"
    | "received"
    | "approved"
    | "paid"
    | "cancelled";
  paymentReference?: string | null;
  apNotes?: string | null;
};

const ALLOWED_STATUSES = new Set([
  "sent",
  "viewed",
  "received",
  "approved",
  "paid",
  "cancelled",
]);

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
  const paymentReference =
    typeof body.paymentReference === "string"
      ? body.paymentReference.trim()
      : null;
  const apNotes =
    typeof body.apNotes === "string" ? body.apNotes.trim() : null;

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
        status,
        paid_at,
        received_at,
        approved_at
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

  const providerControlledStatuses = new Set(["sent", "cancelled"]);
  const customerControlledStatuses = new Set([
    "viewed",
    "received",
    "approved",
    "paid",
  ]);

  if (providerControlledStatuses.has(nextStatus)) {
    if (!isProviderManager) {
      return NextResponse.json(
        { error: "Only provider managers can perform this invoice action." },
        { status: 403 },
      );
    }
  }

  if (customerControlledStatuses.has(nextStatus)) {
    if (!isCustomerMember) {
      return NextResponse.json(
        { error: "Only customer organization members can perform this AP action." },
        { status: 403 },
      );
    }
  }

  if (nextStatus === "approved" && !invoice.received_at) {
    return NextResponse.json(
      { error: "Invoice must be received before it can be approved." },
      { status: 400 },
    );
  }

  if (nextStatus === "paid" && !invoice.approved_at) {
    return NextResponse.json(
      { error: "Invoice must be approved before it can be marked paid." },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();

  const updatePayload: Record<string, string | null> = {
    status: nextStatus,
    updated_at: nowIso,
  };

  if (nextStatus === "sent") {
    if (!invoice.paid_at) {
      updatePayload.issued_at = nowIso;
    }
  }

  if (nextStatus === "viewed") {
    if (!invoice.received_at) {
      updatePayload.received_at = nowIso;
      updatePayload.received_by_user_id = user.id;
    }
  }

  if (nextStatus === "received") {
    if (!invoice.received_at) {
      updatePayload.received_at = nowIso;
    }
    updatePayload.received_by_user_id = user.id;
    updatePayload.ap_notes = apNotes;
  }

  if (nextStatus === "approved") {
    updatePayload.approved_at = nowIso;
    updatePayload.approved_by_user_id = user.id;
    updatePayload.ap_notes = apNotes;
  }

  if (nextStatus === "paid") {
    updatePayload.paid_at = nowIso;
    updatePayload.paid_recorded_by_user_id = user.id;
    updatePayload.ap_notes = apNotes;
    updatePayload.payment_reference = paymentReference;
  }

  if (nextStatus === "cancelled") {
    // Keep audit history intact; do not erase AP fields.
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
import { loadProviderDashboardData } from "../loadProviderDashboardData";
import { createClient } from "@/lib/supabase/server";
import type {
  ProviderScheduleBlock,
  ProviderScheduleBooking,
  ProviderScheduleData,
  ProviderScheduleUnscheduledAward,
  ProviderScheduleWorkCenter,
} from "./types";

type WorkCenterRow = {
  id: string;
  provider_org_id: string;
  name: string;
  code: string | null;
  center_type: string;
  description: string | null;
  location_label: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type WorkCenterCapabilityRow = {
  provider_work_center_id: string;
  provider_capability_id: string;
};

type ScheduleBlockRow = {
  id: string;
  provider_org_id: string;
  provider_work_center_id: string | null;
  block_type: "maintenance" | "downtime" | "holiday" | "internal_hold" | "other";
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  created_at: string;
  updated_at: string;
};

type BookingRow = {
  id: string;
  provider_org_id: string;
  customer_org_id: string | null;
  provider_work_center_id: string | null;
  provider_capability_id: string | null;
  provider_request_package_id: string | null;
  provider_quote_id: string | null;
  service_request_id: string | null;
  booking_status:
    | "unscheduled"
    | "scheduled"
    | "in_progress"
    | "paused"
    | "completed"
    | "cancelled";
  title: string;
  job_reference: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  estimated_hours: number | null;
  setup_hours: number | null;
  run_hours: number | null;
  requested_quantity: number | null;
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

type OrganizationNameRow = {
  id: string;
  name: string;
};

export async function loadProviderScheduleData(): Promise<ProviderScheduleData> {
  const supabase = await createClient();
  const dashboardData = await loadProviderDashboardData();

  if (!dashboardData.organization) {
    return {
      organization: null,
      capabilities: [],
      workCenters: [],
      blocks: [],
      bookings: [],
      unscheduledAwards: [],
      summary: {
        workCenterCount: 0,
        activeWorkCenterCount: 0,
        blockCount: 0,
        bookingCount: 0,
        unscheduledAwardCount: 0,
      },
    };
  }

  const providerOrgId = dashboardData.organization.id;

  const [
    { data: workCentersRaw, error: workCentersError },
    { data: blocksRaw, error: blocksError },
    { data: bookingsRaw, error: bookingsError },
  ] = await Promise.all([
    supabase
      .from("provider_work_centers")
      .select(
        "id, provider_org_id, name, code, center_type, description, location_label, active, created_at, updated_at",
      )
      .eq("provider_org_id", providerOrgId)
      .order("active", { ascending: false })
      .order("name", { ascending: true }),
    supabase
      .from("provider_schedule_blocks")
      .select(
        "id, provider_org_id, provider_work_center_id, block_type, title, notes, starts_at, ends_at, all_day, created_at, updated_at",
      )
      .eq("provider_org_id", providerOrgId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("provider_job_bookings")
      .select(
        "id, provider_org_id, customer_org_id, provider_work_center_id, provider_capability_id, provider_request_package_id, provider_quote_id, service_request_id, booking_status, title, job_reference, notes, starts_at, ends_at, estimated_hours, setup_hours, run_hours, requested_quantity, priority, created_at, updated_at",
      )
      .eq("provider_org_id", providerOrgId)
      .order("starts_at", { ascending: true }),
  ]);

  if (workCentersError) {
    throw new Error(workCentersError.message);
  }

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (bookingsError) {
    throw new Error(bookingsError.message);
  }

  const workCenterRows = (workCentersRaw ?? []) as WorkCenterRow[];
  const blockRows = (blocksRaw ?? []) as ScheduleBlockRow[];
  const bookingRows = (bookingsRaw ?? []) as BookingRow[];

  const workCenterIds = workCenterRows.map((row) => row.id);

  let mappingRows: WorkCenterCapabilityRow[] = [];

  if (workCenterIds.length > 0) {
    const { data: mappingsRaw, error: mappingsError } = await supabase
      .from("provider_work_center_capabilities")
      .select("provider_work_center_id, provider_capability_id")
      .in("provider_work_center_id", workCenterIds);

    if (mappingsError) {
      throw new Error(mappingsError.message);
    }

    mappingRows = (mappingsRaw ?? []) as WorkCenterCapabilityRow[];
  }

  const capabilityMap = new Map(
    dashboardData.capabilities.map((capability) => [capability.id, capability]),
  );

  const mappedCapabilityIdsByCenter = new Map<string, string[]>();

  for (const row of mappingRows) {
    const existing = mappedCapabilityIdsByCenter.get(row.provider_work_center_id) ?? [];
    existing.push(row.provider_capability_id);
    mappedCapabilityIdsByCenter.set(row.provider_work_center_id, existing);
  }

  const workCenters: ProviderScheduleWorkCenter[] = workCenterRows.map((row) => {
    const mappedCapabilityIds = mappedCapabilityIdsByCenter.get(row.id) ?? [];
    const mappedCapabilities = mappedCapabilityIds
      .map((capabilityId) => capabilityMap.get(capabilityId))
      .filter(
        (
          capability,
        ): capability is NonNullable<typeof capability> => Boolean(capability),
      )
      .map((capability) => ({
        id: capability.id,
        processFamily: capability.processFamily,
        processName: capability.processName,
        machineType: capability.machineType,
        active: capability.active,
      }));

    return {
      id: row.id,
      providerOrgId: row.provider_org_id,
      name: row.name,
      code: row.code,
      centerType: row.center_type,
      description: row.description,
      locationLabel: row.location_label,
      active: row.active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      mappedCapabilities,
    };
  });

  const customerOrgIds = [
    ...new Set(
      bookingRows.map((row) => row.customer_org_id).filter((value): value is string => Boolean(value)),
    ),
  ];

  let customerNameMap = new Map<string, string>();

  if (customerOrgIds.length > 0) {
    const { data: customerOrgsRaw, error: customerOrgsError } = await supabase
      .from("organizations")
      .select("id, name")
      .in("id", customerOrgIds);

    if (customerOrgsError) {
      throw new Error(customerOrgsError.message);
    }

    customerNameMap = new Map(
      ((customerOrgsRaw ?? []) as OrganizationNameRow[]).map((org) => [org.id, org.name]),
    );
  }

  const blocks: ProviderScheduleBlock[] = blockRows.map((row) => ({
    id: row.id,
    providerOrgId: row.provider_org_id,
    providerWorkCenterId: row.provider_work_center_id,
    blockType: row.block_type,
    title: row.title,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const bookings: ProviderScheduleBooking[] = bookingRows.map((row) => ({
    id: row.id,
    providerOrgId: row.provider_org_id,
    customerOrgId: row.customer_org_id,
    customerOrgName: row.customer_org_id
      ? customerNameMap.get(row.customer_org_id) ?? "Customer"
      : null,
    providerWorkCenterId: row.provider_work_center_id,
    providerCapabilityId: row.provider_capability_id,
    capabilityName: row.provider_capability_id
      ? capabilityMap.get(row.provider_capability_id)?.processName ?? null
      : null,
    providerRequestPackageId: row.provider_request_package_id,
    providerQuoteId: row.provider_quote_id,
    serviceRequestId: row.service_request_id,
    bookingStatus: row.booking_status,
    title: row.title,
    jobReference: row.job_reference,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    estimatedHours: row.estimated_hours,
    setupHours: row.setup_hours,
    runHours: row.run_hours,
    requestedQuantity: row.requested_quantity,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const bookedPackageIds = new Set(
    bookings
      .map((booking) => booking.providerRequestPackageId)
      .filter((value): value is string => Boolean(value)),
  );

  const unscheduledAwards: ProviderScheduleUnscheduledAward[] = dashboardData.rows
    .filter(
      (row) => row.packageStatus === "awarded" && !bookedPackageIds.has(row.packageId),
    )
    .map((row) => ({
      packageId: row.packageId,
      serviceRequestId: row.serviceRequestId,
      title: row.packageTitle,
      customerOrgName: row.customerOrgName,
      targetDueDate: row.targetDueDate,
      requestedQuantity: row.requestedQuantity,
      latestQuoteStatus: row.latestQuoteStatus,
      latestLeadTimeDays: row.latestLeadTimeDays,
      latestTotalPrice: row.latestTotalPrice,
      latestCurrencyCode: row.latestCurrencyCode,
    }));

  return {
    organization: dashboardData.organization,
    capabilities: dashboardData.capabilities,
    workCenters,
    blocks,
    bookings,
    unscheduledAwards,
    summary: {
      workCenterCount: workCenters.length,
      activeWorkCenterCount: workCenters.filter((center) => center.active).length,
      blockCount: blocks.length,
      bookingCount: bookings.length,
      unscheduledAwardCount: unscheduledAwards.length,
    },
  };
}
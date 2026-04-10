import { loadProviderDashboardData } from "../loadProviderDashboardData";
import { createClient } from "@/lib/supabase/server";
import type {
  ProviderScheduleBlock,
  ProviderScheduleBooking,
  ProviderScheduleData,
  ProviderScheduleRecommendation,
  ProviderScheduleRisk,
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

type ServiceRequestSummaryRow = {
  id: string;
  request_type: string | null;
  target_process: string | null;
  target_material: string | null;
};

type LaneOccupancy = {
  workCenterId: string;
  startsAt: Date;
  endsAt: Date;
  kind: "booking" | "block";
};

function compareNullableDatesAsc(a: string | null, b: string | null) {
  if (a && b) {
    return new Date(a).getTime() - new Date(b).getTime();
  }

  if (a) return -1;
  if (b) return 1;
  return 0;
}

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function toDateInputValue(value: Date) {
  const year = value.getUTCFullYear();
  const month = `${value.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${value.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function diffInDays(start: Date, end: Date) {
  const startDate = startOfDay(start).getTime();
  const endDate = startOfDay(end).getTime();
  return Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
}

function rangesOverlap(
  rangeAStart: Date,
  rangeAEnd: Date,
  rangeBStart: Date,
  rangeBEnd: Date,
) {
  return rangeAStart <= rangeBEnd && rangeAEnd >= rangeBStart;
}

function normalizeText(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function getLeadTimeDays(item: ProviderScheduleUnscheduledAward) {
  const raw = item.latestLeadTimeDays ?? 0;
  return Math.max(raw, 1);
}

function getCapabilityFitScore(
  process: string | null | undefined,
  workCenter: ProviderScheduleWorkCenter,
) {
  const normalizedProcess = normalizeText(process);

  if (!normalizedProcess) {
    return 1;
  }

  const activeMapped = workCenter.mappedCapabilities.filter(
    (capability) => capability.active,
  );

  if (activeMapped.length === 0) {
    return 0;
  }

  const exactMatch = activeMapped.some(
    (capability) =>
      normalizeText(capability.processFamily) === normalizedProcess ||
      normalizeText(capability.processName) === normalizedProcess,
  );

  if (exactMatch) {
    return 3;
  }

  const looseMatch = activeMapped.some((capability) => {
    const family = normalizeText(capability.processFamily);
    const name = normalizeText(capability.processName);

    return (
      family.includes(normalizedProcess) ||
      normalizedProcess.includes(family) ||
      name.includes(normalizedProcess) ||
      normalizedProcess.includes(name)
    );
  });

  if (looseMatch) {
    return 2;
  }

  return 0;
}

function getSuggestedCapability(
  process: string | null | undefined,
  workCenter: ProviderScheduleWorkCenter,
) {
  const activeMapped = workCenter.mappedCapabilities.filter(
    (capability) => capability.active,
  );

  if (activeMapped.length === 0) {
    return null;
  }

  const normalizedProcess = normalizeText(process);

  if (!normalizedProcess) {
    return activeMapped[0];
  }

  const exact =
    activeMapped.find(
      (capability) =>
        normalizeText(capability.processFamily) === normalizedProcess ||
        normalizeText(capability.processName) === normalizedProcess,
    ) ?? null;

  if (exact) {
    return exact;
  }

  const loose =
    activeMapped.find((capability) => {
      const family = normalizeText(capability.processFamily);
      const name = normalizeText(capability.processName);

      return (
        family.includes(normalizedProcess) ||
        normalizedProcess.includes(family) ||
        name.includes(normalizedProcess) ||
        normalizedProcess.includes(name)
      );
    }) ?? null;

  return loose ?? activeMapped[0];
}

function buildLaneOccupancies(
  bookings: ProviderScheduleBooking[],
  blocks: ProviderScheduleBlock[],
) {
  const occupancies: LaneOccupancy[] = [];

  for (const booking of bookings) {
    if (
      !booking.providerWorkCenterId ||
      booking.bookingStatus === "cancelled"
    ) {
      continue;
    }

    const startsAt = parseDate(booking.startsAt);
    const endsAt = parseDate(booking.endsAt);

    if (!startsAt || !endsAt) {
      continue;
    }

    occupancies.push({
      workCenterId: booking.providerWorkCenterId,
      startsAt,
      endsAt,
      kind: "booking",
    });
  }

  for (const block of blocks) {
    if (!block.providerWorkCenterId) {
      continue;
    }

    const startsAt = parseDate(block.startsAt);
    const endsAt = parseDate(block.endsAt);

    if (!startsAt || !endsAt) {
      continue;
    }

    occupancies.push({
      workCenterId: block.providerWorkCenterId,
      startsAt,
      endsAt,
      kind: "block",
    });
  }

  return occupancies;
}

function findEarliestWindowForLane(
  workCenterId: string,
  durationDays: number,
  occupancies: LaneOccupancy[],
  fromDate: Date,
  horizonDays = 180,
) {
  const laneOccupancies = occupancies
    .filter((item) => item.workCenterId === workCenterId)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const candidateStart = startOfDay(addDays(fromDate, offset));
    const candidateEnd = endOfDay(addDays(candidateStart, durationDays - 1));

    const hasConflict = laneOccupancies.some((occupancy) =>
      rangesOverlap(
        candidateStart,
        candidateEnd,
        occupancy.startsAt,
        occupancy.endsAt,
      ),
    );

    if (!hasConflict) {
      return {
        startsAt: candidateStart,
        endsAt: candidateEnd,
      };
    }
  }

  return null;
}

function getRiskLevel(
  suggestedEndDate: Date | null,
  dueDate: Date | null,
): ProviderScheduleRisk {
  if (!suggestedEndDate || !dueDate) {
    return "medium";
  }

  const daysDelta = diffInDays(suggestedEndDate, dueDate);

  if (daysDelta < 0) {
    return "none";
  }

  if (daysDelta === 0) {
    return "low";
  }

  if (daysDelta <= 3) {
    return "medium";
  }

  return "high";
}

function buildRecommendationForAward(
  item: ProviderScheduleUnscheduledAward,
  workCenters: ProviderScheduleWorkCenter[],
  occupancies: LaneOccupancy[],
  today: Date,
): ProviderScheduleRecommendation {
  const durationDays = getLeadTimeDays(item);
  const dueDate = parseDate(item.targetDueDate);
  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  if (activeWorkCenters.length === 0) {
    return {
      packageId: item.packageId,
      suggestedWorkCenterId: null,
      suggestedWorkCenterName: null,
      suggestedCapabilityId: null,
      suggestedCapabilityName: null,
      suggestedStartDate: null,
      suggestedEndDate: null,
      confidence: "low",
      riskLevel: "high",
      isFeasible: false,
      reasons: ["No active work centers are available yet."],
    };
  }

  const rankedCandidates = activeWorkCenters
    .map((workCenter) => {
      const capabilityFitScore = getCapabilityFitScore(
        item.targetProcess,
        workCenter,
      );
      const suggestion = getSuggestedCapability(item.targetProcess, workCenter);
      const window = findEarliestWindowForLane(
        workCenter.id,
        durationDays,
        occupancies,
        today,
      );

      const riskLevel = getRiskLevel(window?.endsAt ?? null, dueDate);
      const dueGapDays =
        window && dueDate ? diffInDays(window.endsAt, dueDate) : 9999;

      return {
        workCenter,
        capabilityFitScore,
        suggestion,
        window,
        riskLevel,
        dueGapDays,
      };
    })
    .sort((a, b) => {
      if (a.capabilityFitScore !== b.capabilityFitScore) {
        return b.capabilityFitScore - a.capabilityFitScore;
      }

      if (a.window && b.window) {
        return a.window.endsAt.getTime() - b.window.endsAt.getTime();
      }

      if (a.window) return -1;
      if (b.window) return 1;

      return a.workCenter.name.localeCompare(b.workCenter.name);
    });

  const best = rankedCandidates[0];

  if (!best || !best.window) {
    return {
      packageId: item.packageId,
      suggestedWorkCenterId: null,
      suggestedWorkCenterName: null,
      suggestedCapabilityId: null,
      suggestedCapabilityName: null,
      suggestedStartDate: null,
      suggestedEndDate: null,
      confidence: "low",
      riskLevel: "high",
      isFeasible: false,
      reasons: [
        "No available slot was found in the current planning horizon.",
      ],
    };
  }

  const reasons: string[] = [];

  if (best.capabilityFitScore >= 3) {
    reasons.push("Exact mapped capability match found for this work.");
  } else if (best.capabilityFitScore === 2) {
    reasons.push("Closest mapped capability match found for this work.");
  } else if (best.suggestion) {
    reasons.push("Suggested lane uses the nearest available mapped capability.");
  } else {
    reasons.push("Suggested lane is based on earliest available active work center.");
  }

  reasons.push(
    `Earliest visible slot starts ${toDateInputValue(best.window.startsAt)}.`,
  );

  if (dueDate) {
    const dueGapDays = diffInDays(best.window.endsAt, dueDate);

    if (dueGapDays < 0) {
      reasons.push("Suggested finish stays ahead of the due date.");
    } else if (dueGapDays === 0) {
      reasons.push("Suggested finish lands on the due date.");
    } else {
      reasons.push("Suggested finish may exceed the due date.");
    }
  }

  const confidence =
    best.capabilityFitScore >= 3 && best.riskLevel !== "high"
      ? "high"
      : best.capabilityFitScore >= 2
        ? "medium"
        : "low";

  return {
    packageId: item.packageId,
    suggestedWorkCenterId: best.workCenter.id,
    suggestedWorkCenterName: best.workCenter.name,
    suggestedCapabilityId: best.suggestion?.id ?? null,
    suggestedCapabilityName: best.suggestion?.processName ?? null,
    suggestedStartDate: toDateInputValue(best.window.startsAt),
    suggestedEndDate: toDateInputValue(best.window.endsAt),
    confidence,
    riskLevel: best.riskLevel,
    isFeasible: true,
    reasons,
  };
}

function getOverloadedLaneCount(
  workCenters: ProviderScheduleWorkCenter[],
  bookings: ProviderScheduleBooking[],
  blocks: ProviderScheduleBlock[],
  rangeStart: Date,
  rangeEnd: Date,
) {
  const occupancies = buildLaneOccupancies(bookings, blocks);
  const rangeDays = Math.max(diffInDays(rangeStart, rangeEnd) + 1, 1);

  let overloaded = 0;

  for (const workCenter of workCenters) {
    let occupiedDays = 0;

    for (const occupancy of occupancies) {
      if (occupancy.workCenterId !== workCenter.id) {
        continue;
      }

      if (
        !rangesOverlap(
          rangeStart,
          rangeEnd,
          occupancy.startsAt,
          occupancy.endsAt,
        )
      ) {
        continue;
      }

      const overlapStart =
        occupancy.startsAt > rangeStart ? occupancy.startsAt : rangeStart;
      const overlapEnd =
        occupancy.endsAt < rangeEnd ? occupancy.endsAt : rangeEnd;

      occupiedDays += diffInDays(overlapStart, overlapEnd) + 1;
    }

    const utilization = Math.min(
      100,
      Math.round((occupiedDays / rangeDays) * 100),
    );

    if (utilization >= 85) {
      overloaded += 1;
    }
  }

  return overloaded;
}

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
      recommendationsByPackageId: {},
      summary: {
        workCenterCount: 0,
        activeWorkCenterCount: 0,
        blockCount: 0,
        bookingCount: 0,
        unscheduledAwardCount: 0,
        dueSoonBookingCount: 0,
        overdueBookingCount: 0,
        overloadedLaneCount: 0,
        underusedLaneCount: 0,
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
    const existing =
      mappedCapabilityIdsByCenter.get(row.provider_work_center_id) ?? [];
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
      bookingRows
        .map((row) => row.customer_org_id)
        .filter((value): value is string => Boolean(value)),
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
      ((customerOrgsRaw ?? []) as OrganizationNameRow[]).map((org) => [
        org.id,
        org.name,
      ]),
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
      .filter((booking) => booking.bookingStatus !== "cancelled")
      .map((booking) => booking.providerRequestPackageId)
      .filter((value): value is string => Boolean(value)),
  );

  const unscheduledAwardRows = dashboardData.rows.filter(
    (row) => row.packageStatus === "awarded" && !bookedPackageIds.has(row.packageId),
  );

  const serviceRequestIds = [
    ...new Set(
      unscheduledAwardRows
        .map((row) => row.serviceRequestId)
        .filter((value): value is string => Boolean(value)),
    ),
  ];

  let serviceRequestMap = new Map<string, ServiceRequestSummaryRow>();

  if (serviceRequestIds.length > 0) {
    const { data: serviceRequestsRaw, error: serviceRequestsError } =
      await supabase
        .from("service_requests")
        .select("id, request_type, target_process, target_material")
        .in("id", serviceRequestIds);

    if (serviceRequestsError) {
      throw new Error(serviceRequestsError.message);
    }

    serviceRequestMap = new Map(
      ((serviceRequestsRaw ?? []) as ServiceRequestSummaryRow[]).map((row) => [
        row.id,
        row,
      ]),
    );
  }

  const unscheduledAwards: ProviderScheduleUnscheduledAward[] =
    unscheduledAwardRows
      .map((row) => {
        const request = serviceRequestMap.get(row.serviceRequestId);

        return {
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
          requestType: request?.request_type ?? null,
          targetProcess: request?.target_process ?? null,
          targetMaterial: request?.target_material ?? null,
        };
      })
      .sort((a, b) => {
        const dateCompare = compareNullableDatesAsc(
          a.targetDueDate,
          b.targetDueDate,
        );

        if (dateCompare !== 0) {
          return dateCompare;
        }

        const titleA = (a.title || a.customerOrgName || "").toLowerCase();
        const titleB = (b.title || b.customerOrgName || "").toLowerCase();

        return titleA.localeCompare(titleB);
      });

  const today = startOfDay(new Date());
  const occupancies = buildLaneOccupancies(bookings, blocks);

  const recommendationsByPackageId: Record<string, ProviderScheduleRecommendation> =
    {};

  for (const award of unscheduledAwards) {
    recommendationsByPackageId[award.packageId] = buildRecommendationForAward(
      award,
      workCenters,
      occupancies,
      today,
    );
  }

  const dueSoonBookingCount = bookings.filter((booking) => {
    if (
      booking.bookingStatus === "completed" ||
      booking.bookingStatus === "cancelled"
    ) {
      return false;
    }

    const endsAt = parseDate(booking.endsAt);

    if (!endsAt) {
      return false;
    }

    const days = diffInDays(today, endsAt);
    return days >= 0 && days <= 7;
  }).length;

  const overdueBookingCount = bookings.filter((booking) => {
    if (
      booking.bookingStatus === "completed" ||
      booking.bookingStatus === "cancelled"
    ) {
      return false;
    }

    const endsAt = parseDate(booking.endsAt);
    return Boolean(endsAt && endsAt < today);
  }).length;

  const rangeStart = today;
  const rangeEnd = endOfDay(addDays(today, 30));

  const overloadedLaneCount = getOverloadedLaneCount(
    workCenters,
    bookings,
    blocks,
    rangeStart,
    rangeEnd,
  );

  const underusedLaneCount = workCenters.filter((center) => {
    if (!center.active) {
      return false;
    }

    const laneOccupancy = occupancies.filter(
      (occupancy) =>
        occupancy.workCenterId === center.id &&
        rangesOverlap(
          rangeStart,
          rangeEnd,
          occupancy.startsAt,
          occupancy.endsAt,
        ),
    );

    if (laneOccupancy.length === 0) {
      return true;
    }

    let occupiedDays = 0;

    for (const occupancy of laneOccupancy) {
      const overlapStart =
        occupancy.startsAt > rangeStart ? occupancy.startsAt : rangeStart;
      const overlapEnd =
        occupancy.endsAt < rangeEnd ? occupancy.endsAt : rangeEnd;

      occupiedDays += diffInDays(overlapStart, overlapEnd) + 1;
    }

    const utilization = Math.min(
      100,
      Math.round((occupiedDays / 31) * 100),
    );

    return utilization <= 20;
  }).length;

  return {
    organization: dashboardData.organization,
    capabilities: dashboardData.capabilities,
    workCenters,
    blocks,
    bookings,
    unscheduledAwards,
    recommendationsByPackageId,
    summary: {
      workCenterCount: workCenters.length,
      activeWorkCenterCount: workCenters.filter((center) => center.active)
        .length,
      blockCount: blocks.length,
      bookingCount: bookings.length,
      unscheduledAwardCount: unscheduledAwards.length,
      dueSoonBookingCount,
      overdueBookingCount,
      overloadedLaneCount,
      underusedLaneCount,
    },
  };
}
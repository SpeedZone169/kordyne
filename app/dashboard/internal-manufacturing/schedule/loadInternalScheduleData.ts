import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  buildOccupancies,
  endOfDay,
  findEarliestWindowForLane,
  getConfidenceFromFitAndRisk,
  getOverloadedLaneCount,
  getRiskLevel,
  getUnderusedLaneCount,
  normalizeText,
  parseDate,
  startOfDay,
  toDateInputValue,
} from "@/lib/planning-core";
import { loadInternalManufacturingData } from "../loadInternalManufacturingData";
import type {
  InternalScheduleAssignment,
  InternalScheduleBacklogItem,
  InternalScheduleBlock,
  InternalScheduleCapabilitySummary,
  InternalScheduleData,
  InternalScheduleRecommendation,
  InternalScheduleResource,
} from "./types";

type ResourceRow = {
  id: string;
  organization_id: string;
  name: string;
  resource_type: string;
  service_domain: string;
  current_status: string;
  active: boolean;
  location_label: string | null;
};

type CapabilityRow = {
  id: string;
  organization_id: string;
  service_domain: string;
  code: string;
  name: string;
  is_active: boolean;
};

type ResourceCapabilityRow = {
  resource_id: string;
  capability_id: string;
};

type JobRow = {
  id: string;
  organization_id: string;
  title: string;
  service_domain: string;
  priority: string;
  status: string;
  routing_decision: string;
  due_at: string | null;
};

type OperationRow = {
  id: string;
  organization_id: string;
  job_id: string;
  sequence_no: number;
  operation_type: string;
  service_domain: string;
  capability_id: string | null;
  status: string;
  estimated_setup_minutes: number | null;
  estimated_run_minutes: number | null;
  required_quantity: number | null;
  notes: string | null;
};

type AssignmentRow = {
  id: string;
  organization_id: string;
  operation_id: string;
  resource_id: string;
  starts_at: string | null;
  ends_at: string | null;
  status: string;
  confidence_score: number | null;
  risk_level: "none" | "low" | "medium" | "high" | null;
  created_by: string;
  created_at: string;
};

type BlockRow = {
  id: string;
  organization_id: string;
  resource_id: string;
  block_type: "maintenance" | "downtime" | "holiday" | "internal_hold" | "other";
  title: string;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  entered_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function getEstimatedTotalMinutes(operation: OperationRow) {
  const setup = operation.estimated_setup_minutes ?? 0;
  const run = operation.estimated_run_minutes ?? 0;
  const total = setup + run;
  return total > 0 ? total : null;
}

function getCapabilityFitScore(
  item: InternalScheduleBacklogItem,
  resource: InternalScheduleResource,
) {
  if (
    item.capabilityId &&
    resource.mappedCapabilities.some((capability) => capability.id === item.capabilityId)
  ) {
    return 4;
  }

  const mappedSameDomain = resource.mappedCapabilities.some(
    (capability) =>
      normalizeText(capability.serviceDomain) === normalizeText(item.serviceDomain),
  );

  if (mappedSameDomain) {
    return 3;
  }

  if (normalizeText(resource.serviceDomain) === normalizeText(item.serviceDomain)) {
    return 2;
  }

  return 0;
}

function getSuggestedCapability(
  item: InternalScheduleBacklogItem,
  resource: InternalScheduleResource,
): InternalScheduleCapabilitySummary | null {
  if (item.capabilityId) {
    const exact =
      resource.mappedCapabilities.find(
        (capability) => capability.id === item.capabilityId,
      ) ?? null;

    if (exact) {
      return exact;
    }
  }

  const sameDomain =
    resource.mappedCapabilities.find(
      (capability) =>
        normalizeText(capability.serviceDomain) === normalizeText(item.serviceDomain),
    ) ?? null;

  return sameDomain ?? resource.mappedCapabilities[0] ?? null;
}

function buildRecommendationForBacklogItem(
  item: InternalScheduleBacklogItem,
  resources: InternalScheduleResource[],
  occupancies: ReturnType<typeof buildOccupancies>,
  today: Date,
): InternalScheduleRecommendation {
  const durationDays = Math.max(1, Math.ceil((item.estimatedTotalMinutes ?? 480) / 480));
  const dueDate = parseDate(item.dueAt);
  const activeResources = resources.filter((resource) => resource.active);

  if (activeResources.length === 0) {
    return {
      operationId: item.operationId,
      suggestedResourceId: null,
      suggestedResourceName: null,
      suggestedCapabilityId: null,
      suggestedCapabilityName: null,
      suggestedStartDate: null,
      suggestedEndDate: null,
      confidence: "low",
      riskLevel: "high",
      isFeasible: false,
      reasons: ["No active internal resources are available yet."],
    };
  }

  const rankedCandidates = activeResources
    .map((resource) => {
      const fitScore = getCapabilityFitScore(item, resource);
      const suggestion = getSuggestedCapability(item, resource);
      const window = findEarliestWindowForLane(
        resource.id,
        durationDays,
        occupancies,
        today,
      );
      const riskLevel = getRiskLevel(window?.endsAt ?? null, dueDate);

      return {
        resource,
        fitScore,
        suggestion,
        window,
        riskLevel,
      };
    })
    .sort((a, b) => {
      if (a.fitScore !== b.fitScore) {
        return b.fitScore - a.fitScore;
      }

      if (a.window && b.window) {
        return a.window.endsAt.getTime() - b.window.endsAt.getTime();
      }

      if (a.window) return -1;
      if (b.window) return 1;

      return a.resource.name.localeCompare(b.resource.name);
    });

  const best = rankedCandidates[0];

  if (!best || !best.window) {
    return {
      operationId: item.operationId,
      suggestedResourceId: null,
      suggestedResourceName: null,
      suggestedCapabilityId: null,
      suggestedCapabilityName: null,
      suggestedStartDate: null,
      suggestedEndDate: null,
      confidence: "low",
      riskLevel: "high",
      isFeasible: false,
      reasons: ["No available internal slot was found in the visible planning horizon."],
    };
  }

  const reasons: string[] = [];

  if (best.fitScore >= 4) {
    reasons.push("Exact mapped capability match found on the suggested internal resource.");
  } else if (best.fitScore >= 3) {
    reasons.push("Suggested internal resource has mapped capability coverage in the same domain.");
  } else if (best.fitScore >= 2) {
    reasons.push("Suggested internal resource matches the service domain.");
  } else {
    reasons.push("Suggested internal resource is the earliest available active lane.");
  }

  reasons.push(
    `Earliest available slot starts ${toDateInputValue(best.window.startsAt)}.`,
  );

  if (dueDate) {
    const end = best.window.endsAt;

    if (end < dueDate) {
      reasons.push("Suggested finish stays ahead of the internal due date.");
    } else if (end.getTime() === dueDate.getTime()) {
      reasons.push("Suggested finish lands on the due date.");
    } else {
      reasons.push("Suggested finish may exceed the due date.");
    }
  }

  return {
    operationId: item.operationId,
    suggestedResourceId: best.resource.id,
    suggestedResourceName: best.resource.name,
    suggestedCapabilityId: best.suggestion?.id ?? null,
    suggestedCapabilityName: best.suggestion?.name ?? null,
    suggestedStartDate: toDateInputValue(best.window.startsAt),
    suggestedEndDate: toDateInputValue(best.window.endsAt),
    confidence: getConfidenceFromFitAndRisk(best.fitScore, best.riskLevel),
    riskLevel: best.riskLevel,
    isFeasible: true,
    reasons,
  };
}

export async function loadInternalScheduleData(): Promise<InternalScheduleData> {
  const base = await loadInternalManufacturingData();

  if (!base.organization) {
    return {
      organization: null,
      resources: [],
      blocks: [],
      assignments: [],
      backlog: [],
      recommendationsByOperationId: {},
      summary: {
        resourceCount: 0,
        activeResourceCount: 0,
        blockCount: 0,
        assignmentCount: 0,
        backlogCount: 0,
        dueSoonAssignmentCount: 0,
        overdueAssignmentCount: 0,
        overloadedResourceCount: 0,
        underusedResourceCount: 0,
      },
      errors: base.errors,
    };
  }

  const supabase = await createClient();
  const organizationId = base.organization.id;
  const errors = [...base.errors];

  const [
    resourcesResult,
    capabilitiesResult,
    jobsResult,
    operationsResult,
    assignmentsResult,
    blocksResult,
  ] = await Promise.all([
    supabase
      .from("internal_resources")
      .select(
        "id, organization_id, name, resource_type, service_domain, current_status, active, location_label",
      )
      .eq("organization_id", organizationId)
      .order("active", { ascending: false })
      .order("name", { ascending: true }),

    supabase
      .from("internal_capabilities")
      .select("id, organization_id, service_domain, code, name, is_active")
      .eq("organization_id", organizationId)
      .order("name", { ascending: true }),

    supabase
      .from("internal_jobs")
      .select(
        "id, organization_id, title, service_domain, priority, status, routing_decision, due_at",
      )
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),

    supabase
      .from("internal_job_operations")
      .select(
        "id, organization_id, job_id, sequence_no, operation_type, service_domain, capability_id, status, estimated_setup_minutes, estimated_run_minutes, required_quantity, notes",
      )
      .eq("organization_id", organizationId)
      .order("sequence_no", { ascending: true }),

    supabase
      .from("internal_operation_assignments")
      .select(
        "id, organization_id, operation_id, resource_id, starts_at, ends_at, status, confidence_score, risk_level, created_by, created_at",
      )
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true }),

    supabase
      .from("internal_schedule_blocks")
      .select(
        "id, organization_id, resource_id, block_type, title, notes, starts_at, ends_at, all_day, entered_by_user_id, created_at, updated_at",
      )
      .eq("organization_id", organizationId)
      .order("starts_at", { ascending: true }),
  ]);

  if (resourcesResult.error) errors.push(resourcesResult.error.message);
  if (capabilitiesResult.error) errors.push(capabilitiesResult.error.message);
  if (jobsResult.error) errors.push(jobsResult.error.message);
  if (operationsResult.error) errors.push(operationsResult.error.message);
  if (assignmentsResult.error) errors.push(assignmentsResult.error.message);
  if (blocksResult.error) errors.push(blocksResult.error.message);

  const resourceRows = (resourcesResult.data ?? []) as ResourceRow[];
  const capabilityRows = (capabilitiesResult.data ?? []) as CapabilityRow[];
  const jobRows = (jobsResult.data ?? []) as JobRow[];
  const operationRows = (operationsResult.data ?? []) as OperationRow[];
  const assignmentRows = (assignmentsResult.data ?? []) as AssignmentRow[];
  const blockRows = (blocksResult.data ?? []) as BlockRow[];

  const resourceIds = resourceRows.map((row) => row.id);

  let resourceCapabilityRows: ResourceCapabilityRow[] = [];

  if (resourceIds.length > 0) {
    const mappingsResult = await supabase
      .from("internal_resource_capabilities")
      .select("resource_id, capability_id")
      .in("resource_id", resourceIds);

    if (mappingsResult.error) {
      errors.push(mappingsResult.error.message);
    } else {
      resourceCapabilityRows = (mappingsResult.data ?? []) as ResourceCapabilityRow[];
    }
  }

  const capabilityById = new Map(capabilityRows.map((row) => [row.id, row]));
  const resourceById = new Map(resourceRows.map((row) => [row.id, row]));
  const jobById = new Map(jobRows.map((row) => [row.id, row]));
  const operationById = new Map(operationRows.map((row) => [row.id, row]));

  const capabilityIdsByResourceId = new Map<string, string[]>();

  for (const row of resourceCapabilityRows) {
    const current = capabilityIdsByResourceId.get(row.resource_id) ?? [];
    current.push(row.capability_id);
    capabilityIdsByResourceId.set(row.resource_id, current);
  }

  const resources: InternalScheduleResource[] = resourceRows.map((row) => {
    const mappedCapabilityIds = capabilityIdsByResourceId.get(row.id) ?? [];

    const mappedCapabilities: InternalScheduleCapabilitySummary[] = mappedCapabilityIds
      .map((capabilityId) => capabilityById.get(capabilityId))
      .filter((capability): capability is CapabilityRow => Boolean(capability))
      .map((capability) => ({
        id: capability.id,
        code: capability.code,
        name: capability.name,
        serviceDomain: capability.service_domain,
        isActive: capability.is_active,
      }));

    return {
      id: row.id,
      organizationId: row.organization_id,
      name: row.name,
      resourceType: row.resource_type,
      serviceDomain: row.service_domain,
      currentStatus: row.current_status,
      active: row.active,
      locationLabel: row.location_label,
      mappedCapabilities,
    };
  });

  const blocks: InternalScheduleBlock[] = blockRows.map((row) => ({
    id: row.id,
    organizationId: row.organization_id,
    resourceId: row.resource_id,
    blockType: row.block_type,
    title: row.title,
    notes: row.notes,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    enteredByUserId: row.entered_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const assignments: InternalScheduleAssignment[] = assignmentRows
    .map((row) => {
      const operation = operationById.get(row.operation_id);
      const resource = resourceById.get(row.resource_id);
      const job = operation ? jobById.get(operation.job_id) : null;
      const capability = operation?.capability_id
        ? capabilityById.get(operation.capability_id)
        : null;

      if (!operation || !resource || !job || !row.starts_at || !row.ends_at) {
        return null;
      }

      return {
        id: row.id,
        organizationId: row.organization_id,
        operationId: row.operation_id,
        jobId: job.id,
        jobTitle: job.title,
        operationSequenceNo: operation.sequence_no,
        operationType: operation.operation_type,
        serviceDomain: operation.service_domain,
        resourceId: row.resource_id,
        resourceName: resource.name,
        capabilityId: operation.capability_id,
        capabilityName: capability?.name ?? null,
        startsAt: row.starts_at,
        endsAt: row.ends_at,
        status: row.status,
        confidenceScore: row.confidence_score,
        riskLevel: row.risk_level,
        createdBy: row.created_by,
        createdAt: row.created_at,
      };
    })
    .filter((item): item is InternalScheduleAssignment => Boolean(item));

  const activeAssignedOperationIds = new Set(
    assignmentRows
      .filter((row) => row.status !== "cancelled")
      .map((row) => row.operation_id),
  );

  const backlog: InternalScheduleBacklogItem[] = operationRows
    .filter((operation) => {
      const job = jobById.get(operation.job_id);

      if (!job) return false;
      if (job.routing_decision === "external_selected") return false;
      if (operation.status === "completed" || operation.status === "cancelled") return false;
      if (activeAssignedOperationIds.has(operation.id)) return false;

      return true;
    })
    .map((operation) => {
      const job = jobById.get(operation.job_id)!;
      const capability = operation.capability_id
        ? capabilityById.get(operation.capability_id)
        : null;

      return {
        operationId: operation.id,
        jobId: job.id,
        jobTitle: job.title,
        serviceDomain: operation.service_domain,
        operationType: operation.operation_type,
        sequenceNo: operation.sequence_no,
        capabilityId: operation.capability_id,
        capabilityName: capability?.name ?? null,
        requiredQuantity: operation.required_quantity,
        estimatedSetupMinutes: operation.estimated_setup_minutes,
        estimatedRunMinutes: operation.estimated_run_minutes,
        estimatedTotalMinutes: getEstimatedTotalMinutes(operation),
        dueAt: job.due_at,
        priority: job.priority,
        jobStatus: job.status,
        routingDecision: job.routing_decision,
        notes: operation.notes,
      };
    })
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }

      if (a.dueAt) return -1;
      if (b.dueAt) return 1;

      return a.jobTitle.localeCompare(b.jobTitle);
    });

  const assignmentOccupancies = buildOccupancies(
    assignments.map((assignment) => ({
      laneId: assignment.resourceId,
      startsAt: assignment.startsAt,
      endsAt: assignment.endsAt,
    })),
    "assignment",
  );

  const blockOccupancies = buildOccupancies(
    blocks.map((block) => ({
      laneId: block.resourceId,
      startsAt: block.startsAt,
      endsAt: block.endsAt,
    })),
    "block",
  );

  const occupancies = [...assignmentOccupancies, ...blockOccupancies];

  const today = startOfDay(new Date());
  const recommendationsByOperationId: Record<string, InternalScheduleRecommendation> = {};

  for (const item of backlog) {
    recommendationsByOperationId[item.operationId] = buildRecommendationForBacklogItem(
      item,
      resources,
      occupancies,
      today,
    );
  }

  const dueSoonAssignmentCount = assignments.filter((assignment) => {
    if (assignment.status === "completed" || assignment.status === "cancelled") {
      return false;
    }

    const endsAt = parseDate(assignment.endsAt);
    if (!endsAt) return false;

    const diff = Math.round((endsAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;

  const overdueAssignmentCount = assignments.filter((assignment) => {
    if (assignment.status === "completed" || assignment.status === "cancelled") {
      return false;
    }

    const endsAt = parseDate(assignment.endsAt);
    return Boolean(endsAt && endsAt < today);
  }).length;

  const activeResourceIds = resources.filter((resource) => resource.active).map((resource) => resource.id);
  const rangeStart = today;
  const rangeEnd = endOfDay(addDays(today, 30));

  const overloadedResourceCount = getOverloadedLaneCount(
    activeResourceIds,
    occupancies,
    rangeStart,
    rangeEnd,
  );

  const underusedResourceCount = getUnderusedLaneCount(
    activeResourceIds,
    occupancies,
    rangeStart,
    rangeEnd,
  );

  return {
    organization: base.organization,
    resources,
    blocks,
    assignments,
    backlog,
    recommendationsByOperationId,
    summary: {
      resourceCount: resources.length,
      activeResourceCount: resources.filter((resource) => resource.active).length,
      blockCount: blocks.length,
      assignmentCount: assignments.length,
      backlogCount: backlog.length,
      dueSoonAssignmentCount,
      overdueAssignmentCount,
      overloadedResourceCount,
      underusedResourceCount,
    },
    errors,
  };
}
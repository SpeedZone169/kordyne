"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { PlanningRisk } from "@/lib/planning-core";
import CreateInternalAssignmentForm from "./CreateInternalAssignmentForm";
import CreateInternalScheduleBlockForm from "./CreateInternalScheduleBlockForm";
import InternalScheduleBlockManagementCard from "./InternalScheduleBlockManagementCard";
import type {
  InternalScheduleAssignment,
  InternalScheduleBacklogItem,
  InternalScheduleBlock,
  InternalScheduleData,
  InternalScheduleResource,
} from "./types";

type Props = {
  data: InternalScheduleData;
};

type ViewMode = "week" | "month" | "twoMonths" | "threeMonths";

type TimelineEntry =
  | {
      kind: "assignment";
      id: string;
      laneId: string;
      title: string;
      subtitle: string;
      startsAt: Date;
      endsAt: Date;
      status: string;
      riskLevel: PlanningRisk | null;
      isHistorical: boolean;
      targetLabel: string | null;
    }
  | {
      kind: "block";
      id: string;
      laneId: string;
      title: string;
      subtitle: string;
      startsAt: Date;
      endsAt: Date;
      blockType: string;
      isHistorical: boolean;
      targetLabel: null;
    };

const DAY_WIDTH = 42;
const LANE_WIDTH = 280;

function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function startOfWeek(value: Date) {
  const date = startOfDay(value);
  const weekday = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - weekday);
  return date;
}

function diffInDays(start: Date, end: Date) {
  const ms = startOfDay(end).getTime() - startOfDay(start).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

function clampDate(value: Date, min: Date, max: Date) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function intersectsRange(
  startDate: Date,
  endDate: Date,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return startDate <= rangeEnd && endDate >= rangeStart;
}

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return startOfDay(date);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";

  const date = typeof value === "string" ? new Date(value) : value;

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-IE", { dateStyle: "medium" }).format(date);
}

function formatDateShort(value: Date) {
  return new Intl.DateTimeFormat("en-IE", {
    day: "numeric",
    month: "short",
  }).format(value);
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("en-IE", {
    weekday: "short",
  }).format(value);
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getViewDays(view: ViewMode) {
  switch (view) {
    case "week":
      return 7;
    case "month":
      return 31;
    case "twoMonths":
      return 62;
    case "threeMonths":
      return 93;
  }
}

function getAssignmentClasses(status: string, isHistorical: boolean) {
  if (isHistorical) {
    return "border border-zinc-300 bg-white text-slate-700";
  }

  if (status === "completed") {
    return "border border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "in_progress") {
    return "border border-slate-950 bg-slate-950 text-white";
  }

  if (status === "paused") {
    return "border border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "cancelled") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  if (status === "confirmed") {
    return "border border-sky-200 bg-sky-50 text-sky-800";
  }

  return "border border-zinc-300 bg-zinc-50 text-slate-800";
}

function getBlockClasses(blockType: string, isHistorical: boolean) {
  if (isHistorical) {
    return "border border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  switch (blockType) {
    case "maintenance":
      return "border border-amber-200 bg-amber-50 text-amber-800";
    case "downtime":
      return "border border-rose-200 bg-rose-50 text-rose-700";
    case "holiday":
      return "border border-sky-200 bg-sky-50 text-sky-700";
    case "internal_hold":
      return "border border-slate-200 bg-slate-100 text-slate-700";
    default:
      return "border border-zinc-300 bg-zinc-50 text-zinc-700";
  }
}

function getConfidenceBadgeClasses(confidence: "low" | "medium" | "high") {
  switch (confidence) {
    case "high":
      return "bg-emerald-100 text-emerald-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

function getRiskBadgeClasses(risk: "none" | "low" | "medium" | "high") {
  switch (risk) {
    case "none":
      return "bg-emerald-100 text-emerald-700";
    case "low":
      return "bg-sky-100 text-sky-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-rose-100 text-rose-700";
  }
}

function buildEntries(
  assignments: InternalScheduleAssignment[],
  blocks: InternalScheduleBlock[],
): TimelineEntry[] {
  const today = startOfDay(new Date());

  const assignmentEntries = assignments.flatMap((assignment) => {
    const startsAt = parseDate(assignment.startsAt);
    const endsAt = parseDate(assignment.endsAt);

    if (!startsAt || !endsAt) {
      return [];
    }

    const entry: TimelineEntry = {
      kind: "assignment",
      id: assignment.id,
      laneId: assignment.resourceId,
      title: assignment.jobTitle,
      subtitle: `${formatLabel(assignment.operationType)} · ${assignment.resourceName}`,
      startsAt,
      endsAt,
      status: assignment.status,
      riskLevel: assignment.riskLevel,
      isHistorical: endsAt < today,
      targetLabel: assignment.capabilityName,
    };

    return [entry];
  });

  const blockEntries = blocks.flatMap((block) => {
    const startsAt = parseDate(block.startsAt);
    const endsAt = parseDate(block.endsAt);

    if (!startsAt || !endsAt) {
      return [];
    }

    const entry: TimelineEntry = {
      kind: "block",
      id: block.id,
      laneId: block.resourceId,
      title: block.title,
      subtitle: formatLabel(block.blockType),
      startsAt,
      endsAt,
      blockType: block.blockType,
      isHistorical: endsAt < today,
      targetLabel: null,
    };

    return [entry];
  });

  return [...assignmentEntries, ...blockEntries];
}

function getUtilizationPercent(
  resourceId: string,
  entries: TimelineEntry[],
  visibleStart: Date,
  visibleEnd: Date,
  rangeDays: number,
) {
  const laneEntries = entries.filter(
    (entry) =>
      entry.laneId === resourceId &&
      intersectsRange(entry.startsAt, entry.endsAt, visibleStart, visibleEnd),
  );

  const occupiedDays = laneEntries.reduce((total, entry) => {
    const entryStart = clampDate(entry.startsAt, visibleStart, visibleEnd);
    const entryEnd = clampDate(entry.endsAt, visibleStart, visibleEnd);
    return total + diffInDays(entryStart, entryEnd) + 1;
  }, 0);

  return Math.min(100, Math.round((occupiedDays / rangeDays) * 100));
}

function getBacklogUrgencyScore(item: InternalScheduleBacklogItem, today: Date) {
  const dueDate = parseDate(item.dueAt);
  const estimatedDays = Math.max(
    1,
    Math.ceil((item.estimatedTotalMinutes ?? 480) / 480),
  );

  if (!dueDate) {
    return 100000 - estimatedDays;
  }

  return diffInDays(today, dueDate) - estimatedDays;
}

export default function Client({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [pageOffset, setPageOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");
  const [capabilityFilter, setCapabilityFilter] = useState("all");

  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);

  const rangeDays = getViewDays(viewMode);
  const visibleStart = addDays(currentWeekStart, pageOffset * rangeDays);
  const visibleEnd = addDays(visibleStart, rangeDays - 1);

  const entries = useMemo(
    () => buildEntries(data.assignments, data.blocks),
    [data.assignments, data.blocks],
  );

  const filteredResources = useMemo(() => {
    return data.resources.filter((resource) => {
      if (resourceFilter !== "all" && resource.id !== resourceFilter) {
        return false;
      }

      if (
        capabilityFilter !== "all" &&
        !resource.mappedCapabilities.some(
          (capability) => capability.id === capabilityFilter,
        )
      ) {
        return false;
      }

      return true;
    });
  }, [capabilityFilter, data.resources, resourceFilter]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (!filteredResources.some((resource) => resource.id === entry.laneId)) {
        return false;
      }

      const haystack = [entry.title, entry.subtitle, entry.targetLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.trim().toLowerCase());
    });
  }, [entries, filteredResources, search]);

  const visibleEntries = useMemo(
    () =>
      filteredEntries.filter((entry) =>
        intersectsRange(entry.startsAt, entry.endsAt, visibleStart, visibleEnd),
      ),
    [filteredEntries, visibleEnd, visibleStart],
  );

  const entriesByLane = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();

    for (const resource of filteredResources) {
      map.set(resource.id, []);
    }

    for (const entry of visibleEntries) {
      const laneEntries = map.get(entry.laneId) ?? [];
      laneEntries.push(entry);
      map.set(entry.laneId, laneEntries);
    }

    return map;
  }, [filteredResources, visibleEntries]);

  const timelineDays = useMemo(
    () =>
      Array.from({ length: rangeDays }, (_, index) =>
        addDays(visibleStart, index),
      ),
    [rangeDays, visibleStart],
  );

  const timelineWidth = rangeDays * DAY_WIDTH;

  const currentWeekVisible = intersectsRange(
    currentWeekStart,
    addDays(currentWeekStart, 6),
    visibleStart,
    visibleEnd,
  );

  const currentWeekLeft =
    diffInDays(
      visibleStart,
      clampDate(currentWeekStart, visibleStart, visibleEnd),
    ) * DAY_WIDTH;

  const currentWeekRightDate = clampDate(
    addDays(currentWeekStart, 6),
    visibleStart,
    visibleEnd,
  );

  const currentWeekWidth =
    (diffInDays(
      clampDate(currentWeekStart, visibleStart, visibleEnd),
      currentWeekRightDate,
    ) +
      1) *
    DAY_WIDTH;

  const dueSoonAssignments = useMemo(() => {
    return data.assignments.filter((assignment) => {
      const endsAt = parseDate(assignment.endsAt);
      if (!endsAt) return false;
      if (
        assignment.status === "completed" ||
        assignment.status === "cancelled"
      ) {
        return false;
      }

      const days = diffInDays(today, endsAt);
      return days >= 0 && days <= 7;
    });
  }, [data.assignments, today]);

  const overdueAssignments = useMemo(() => {
    return data.assignments.filter((assignment) => {
      const endsAt = parseDate(assignment.endsAt);
      if (!endsAt) return false;
      if (
        assignment.status === "completed" ||
        assignment.status === "cancelled"
      ) {
        return false;
      }

      return endsAt < today;
    });
  }, [data.assignments, today]);

  const activeBlocksThisRange = useMemo(() => {
    return data.blocks.filter((block) =>
      intersectsRange(
        parseDate(block.startsAt) ?? today,
        parseDate(block.endsAt) ?? today,
        visibleStart,
        visibleEnd,
      ),
    );
  }, [data.blocks, today, visibleEnd, visibleStart]);

  const allCapabilities = useMemo(
    () =>
      [
        ...new Map(
          data.resources
            .flatMap((resource) => resource.mappedCapabilities)
            .map((capability) => [capability.id, capability]),
        ).values(),
      ].sort((a, b) => a.name.localeCompare(b.name)),
    [data.resources],
  );

  const sortedBacklog = useMemo(() => {
    return [...data.backlog].sort(
      (a, b) => getBacklogUrgencyScore(a, today) - getBacklogUrgencyScore(b, today),
    );
  }, [data.backlog, today]);

  const laneHealth = useMemo(() => {
    return data.resources
      .map((resource) => ({
        resource,
        utilization: getUtilizationPercent(
          resource.id,
          entries,
          visibleStart,
          visibleEnd,
          rangeDays,
        ),
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }, [data.resources, entries, visibleStart, visibleEnd, rangeDays]);

  const overloadedLanes = laneHealth.filter((item) => item.utilization >= 85);

  const planningActions = useMemo(() => {
    const actions: string[] = [];

    if (overdueAssignments.length > 0) {
      actions.push(
        `${overdueAssignments.length} assignment${
          overdueAssignments.length === 1 ? "" : "s"
        } already sit past their visible end date and should be reviewed first.`,
      );
    }

    if (sortedBacklog.length > 0) {
      const topItem = sortedBacklog[0];
      const recommendation = data.recommendationsByOperationId[topItem.operationId];

      if (recommendation?.isFeasible && recommendation.suggestedResourceName) {
        actions.push(
          `Prioritise "${topItem.jobTitle}" next — best current slot is ${recommendation.suggestedResourceName} from ${recommendation.suggestedStartDate}.`,
        );
      } else {
        actions.push(
          `Prioritise "${topItem.jobTitle}" next — it is the most urgent internal backlog item to plan.`,
        );
      }
    }

    if (overloadedLanes.length > 0) {
      actions.push(
        `${overloadedLanes.length} resource lane${
          overloadedLanes.length === 1 ? "" : "s"
        } show high visible utilisation and may need load balancing.`,
      );
    }

    if (activeBlocksThisRange.length > 0) {
      actions.push(
        `${activeBlocksThisRange.length} schedule block${
          activeBlocksThisRange.length === 1 ? "" : "s"
        } affect the visible range and reduce practical internal capacity.`,
      );
    }

    if (actions.length === 0) {
      actions.push(
        "No major internal planning risks detected in the current visible range.",
      );
    }

    return actions;
  }, [
    activeBlocksThisRange.length,
    data.recommendationsByOperationId,
    overdueAssignments.length,
    overloadedLanes.length,
    sortedBacklog,
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Internal scheduling
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Internal factory schedule
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Visualise internal resource lanes, monitor assignment pressure, and
              plan unscheduled internal work before routing externally.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/internal-manufacturing"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Back to overview
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Open setup
            </Link>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-800">
              Some schedule data could not be loaded completely.
            </div>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              {data.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <StatPill label="Resources" value={data.summary.resourceCount} />
          <StatPill label="Blocks" value={data.summary.blockCount} />
          <StatPill label="Assignments" value={data.summary.assignmentCount} />
          <StatPill label="Backlog to plan" value={data.summary.backlogCount} />
          <StatPill
            label="Due in 7 days"
            value={data.summary.dueSoonAssignmentCount}
          />
          <StatPill
            label="High-load lanes"
            value={data.summary.overloadedResourceCount}
          />
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Controls
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Timeline controls
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
              { value: "twoMonths", label: "2 months" },
              { value: "threeMonths", label: "3 months" },
            ].map((option) => {
              const active = viewMode === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setViewMode(option.value as ViewMode)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-slate-950 text-white"
                      : "border border-zinc-300 bg-white text-slate-900 hover:bg-zinc-50"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPageOffset((value) => value - 1)}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => setPageOffset(0)}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Current week
          </button>
          <button
            type="button"
            onClick={() => setPageOffset((value) => value + 1)}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Next
          </button>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search assignment, resource, capability..."
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />

          <select
            value={capabilityFilter}
            onChange={(event) => setCapabilityFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All capabilities</option>
            {allCapabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.name}
              </option>
            ))}
          </select>

          <select
            value={resourceFilter}
            onChange={(event) => setResourceFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All resources</option>
            {data.resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-[22px] border border-zinc-200 bg-[#fafaf9] px-4 py-3 text-sm text-slate-700">
          Visible range: <span className="font-medium">{formatDate(visibleStart)}</span>{" "}
          to <span className="font-medium">{formatDate(visibleEnd)}</span>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_0.85fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Gantt board
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Resource allocation
            </h3>
          </div>

          {filteredResources.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
              No internal resources match your current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="grid min-w-max gap-y-0"
                style={{
                  gridTemplateColumns: `${LANE_WIDTH}px ${timelineWidth}px`,
                }}
              >
                <div className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-white p-4">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                    Resource
                  </div>
                  <div className="mt-2 text-sm text-slate-600">
                    Internal schedulable lanes
                  </div>
                </div>

                <div className="relative border-b border-zinc-200 bg-white">
                  {currentWeekVisible ? (
                    <div
                      className="absolute top-0 bottom-0 z-0 bg-slate-100/80"
                      style={{
                        left: currentWeekLeft,
                        width: currentWeekWidth,
                      }}
                    />
                  ) : null}

                  <div className="relative z-10 flex">
                    {timelineDays.map((day, index) => {
                      const isToday = diffInDays(day, today) === 0;
                      const showMajorLabel =
                        viewMode === "week" ||
                        day.getDate() === 1 ||
                        day.getDay() === 1 ||
                        index === 0;

                      return (
                        <div
                          key={`${day.toISOString()}-${index}`}
                          className="border-l border-zinc-200 px-1 py-3 text-center"
                          style={{ width: DAY_WIDTH }}
                        >
                          <div className="text-[10px] uppercase tracking-[0.12em] text-slate-400">
                            {showMajorLabel ? formatWeekday(day) : ""}
                          </div>
                          <div
                            className={`text-xs font-medium ${
                              isToday ? "text-slate-950" : "text-slate-600"
                            }`}
                          >
                            {day.getDate()}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {showMajorLabel
                              ? day.toLocaleString("en-IE", { month: "short" })
                              : ""}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {filteredResources.map((resource) => {
                  const laneEntries = (entriesByLane.get(resource.id) ?? []).sort(
                    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
                  );

                  const rowHeight = Math.max(88, laneEntries.length * 56 + 20);

                  return (
                    <ScheduleLaneRow
                      key={resource.id}
                      resource={resource}
                      entries={laneEntries}
                      rowHeight={rowHeight}
                      visibleStart={visibleStart}
                      visibleEnd={visibleEnd}
                      today={today}
                      currentWeekVisible={currentWeekVisible}
                      currentWeekLeft={currentWeekLeft}
                      currentWeekWidth={currentWeekWidth}
                      timelineWidth={timelineWidth}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <PlanningHelperPanel
            actions={planningActions}
            overdueAssignments={overdueAssignments}
            dueSoonAssignments={dueSoonAssignments}
            sortedBacklog={sortedBacklog}
            overloadedLanes={overloadedLanes}
            today={today}
          />

          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Operational alerts
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Schedule pressure
            </h3>

            <div className="mt-5 space-y-3">
              <AlertStatCard
                label="Due within 7 days"
                value={data.summary.dueSoonAssignmentCount}
              />
              <AlertStatCard
                label="Overdue assignments"
                value={data.summary.overdueAssignmentCount}
              />
              <AlertStatCard
                label="Blocks in visible range"
                value={activeBlocksThisRange.length}
              />
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Backlog snapshot
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Ready to assign
            </h3>

            {sortedBacklog.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                No internal backlog is waiting for assignment.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {sortedBacklog.slice(0, 5).map((item) => {
                  const recommendation =
                    data.recommendationsByOperationId[item.operationId];

                  return (
                    <div
                      key={item.operationId}
                      className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {item.jobTitle}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {formatLabel(item.operationType)} · seq {item.sequenceNo}
                          </div>
                        </div>

                        {recommendation ? (
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${getConfidenceBadgeClasses(
                              recommendation.confidence,
                            )}`}
                          >
                            {recommendation.confidence} confidence
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-slate-500">
                        <div>Due: {formatDate(item.dueAt)}</div>
                        <div>Quantity: {item.requiredQuantity ?? "—"}</div>
                        <div>
                          Estimated work:{" "}
                          {item.estimatedTotalMinutes
                            ? `${item.estimatedTotalMinutes} mins`
                            : "—"}
                        </div>
                        {recommendation?.suggestedResourceName ? (
                          <div>
                            Suggested resource: {recommendation.suggestedResourceName}
                          </div>
                        ) : null}
                      </div>

                      {recommendation ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${getRiskBadgeClasses(
                              recommendation.riskLevel,
                            )}`}
                          >
                            {recommendation.riskLevel} risk
                          </span>
                          {recommendation.suggestedStartDate ? (
                            <span className="rounded-full bg-zinc-200 px-3 py-1 text-[11px] font-medium text-zinc-700">
                              {recommendation.suggestedStartDate} →{" "}
                              {recommendation.suggestedEndDate}
                            </span>
                          ) : null}
                        </div>
                      ) : null}

                      <CreateInternalAssignmentForm
                        item={item}
                        resources={data.resources}
                        recommendation={recommendation ?? null}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Lane health
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Utilisation by resource
            </h3>

            <div className="mt-5 space-y-3">
              {laneHealth.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                  No internal resources are available yet.
                </div>
              ) : (
                laneHealth.slice(0, 6).map(({ resource, utilization }) => (
                  <div
                    key={resource.id}
                    className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {resource.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatLabel(resource.resourceType)}
                        </div>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          utilization >= 85
                            ? "bg-rose-100 text-rose-700"
                            : utilization <= 20
                              ? "bg-sky-100 text-sky-700"
                              : "bg-zinc-200 text-zinc-700"
                        }`}
                      >
                        {utilization}%
                      </span>
                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-slate-950"
                        style={{ width: `${utilization}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Schedule blocks
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Maintenance, downtime, and internal holds
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Add downtime, calibration, holidays, and internal blocks so the
            schedule reflects real internal capacity.
          </p>

          <div className="mt-6">
            <CreateInternalScheduleBlockForm resources={data.resources} />
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Block management
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Edit and reschedule internal blocks
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Adjust dates, resources, and block types as your internal factory plan changes.
          </p>

          <div className="mt-8 space-y-4">
            {data.blocks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
                No internal schedule blocks added yet.
              </div>
            ) : (
              data.blocks.map((block) => (
                <InternalScheduleBlockManagementCard
                  key={block.id}
                  block={block}
                  resources={data.resources}
                />
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[22px] border border-zinc-200 bg-[#fafaf9] px-4 py-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function AlertStatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function PlanningHelperPanel({
  actions,
  overdueAssignments,
  dueSoonAssignments,
  sortedBacklog,
  overloadedLanes,
  today,
}: {
  actions: string[];
  overdueAssignments: InternalScheduleAssignment[];
  dueSoonAssignments: InternalScheduleAssignment[];
  sortedBacklog: InternalScheduleBacklogItem[];
  overloadedLanes: Array<{
    resource: InternalScheduleResource;
    utilization: number;
  }>;
  today: Date;
}) {
  return (
    <div className="rounded-[32px] border border-slate-950 bg-slate-950 p-6 text-white shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">
        Planning helper
      </p>
      <h3 className="mt-2 text-2xl font-semibold tracking-tight">
        Operator view
      </h3>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Rules-based internal planning guidance for backlog, lane pressure, and
        near-term delivery risk.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            Overdue
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {overdueAssignments.length}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            Due soon
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {dueSoonAssignments.length}
          </div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            High load lanes
          </div>
          <div className="mt-1 text-2xl font-semibold">
            {overloadedLanes.length}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {actions.map((action, index) => (
          <div
            key={`${action}-${index}`}
            className="rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-100"
          >
            {action}
          </div>
        ))}
      </div>

      {sortedBacklog.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Most urgent backlog item</div>
          <div className="mt-2 text-sm text-slate-200">
            {sortedBacklog[0].jobTitle}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Due {formatDate(sortedBacklog[0].dueAt)} ·{" "}
            {formatLabel(sortedBacklog[0].operationType)}
          </div>
        </div>
      ) : null}

      <div className="mt-5 text-xs text-slate-400">
        Reference date: {formatDate(today)}
      </div>
    </div>
  );
}

function ScheduleLaneRow({
  resource,
  entries,
  rowHeight,
  visibleStart,
  visibleEnd,
  today,
  currentWeekVisible,
  currentWeekLeft,
  currentWeekWidth,
  timelineWidth,
}: {
  resource: InternalScheduleResource;
  entries: TimelineEntry[];
  rowHeight: number;
  visibleStart: Date;
  visibleEnd: Date;
  today: Date;
  currentWeekVisible: boolean;
  currentWeekLeft: number;
  currentWeekWidth: number;
  timelineWidth: number;
}) {
  return (
    <>
      <div className="sticky left-0 z-10 border-r border-b border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-950">{resource.name}</div>
        <div className="mt-1 text-sm text-slate-500">
          {formatLabel(resource.resourceType)} · {formatLabel(resource.serviceDomain)}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {resource.mappedCapabilities.slice(0, 2).map((capability) => (
            <span
              key={capability.id}
              className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700"
            >
              {capability.name}
            </span>
          ))}
          {resource.mappedCapabilities.length > 2 ? (
            <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
              +{resource.mappedCapabilities.length - 2} more
            </span>
          ) : null}
        </div>
      </div>

      <div
        className="relative border-b border-zinc-200 bg-white"
        style={{ height: rowHeight }}
      >
        {currentWeekVisible ? (
          <div
            className="absolute top-0 bottom-0 z-0 bg-slate-100/80"
            style={{
              left: currentWeekLeft,
              width: currentWeekWidth,
            }}
          />
        ) : null}

        <div className="absolute inset-0 z-0 flex">
          {Array.from({ length: Math.floor(timelineWidth / DAY_WIDTH) }).map(
            (_, index) => (
              <div
                key={`${resource.id}-grid-${index}`}
                className="border-l border-zinc-200"
                style={{ width: DAY_WIDTH }}
              />
            ),
          )}
        </div>

        <div className="relative z-10 h-full">
          {entries.length === 0 ? (
            <div className="flex h-full items-center px-4 text-sm text-slate-400">
              No scheduled items visible in this range.
            </div>
          ) : (
            entries.map((entry, index) => {
              const renderStart = clampDate(entry.startsAt, visibleStart, visibleEnd);
              const renderEnd = clampDate(entry.endsAt, visibleStart, visibleEnd);

              const left = diffInDays(visibleStart, renderStart) * DAY_WIDTH;
              const width = (diffInDays(renderStart, renderEnd) + 1) * DAY_WIDTH;

              return (
                <div
                  key={entry.id}
                  className={`absolute flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm ${
                    entry.kind === "assignment"
                      ? getAssignmentClasses(entry.status, entry.isHistorical)
                      : getBlockClasses(entry.blockType, entry.isHistorical)
                  }`}
                  style={{
                    left,
                    width: Math.max(width, 92),
                    top: 12 + index * 56,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {entry.title}
                    </div>
                    <div className="truncate text-xs opacity-80">
                      {entry.subtitle}
                    </div>
                  </div>

                  <div className="hidden shrink-0 xl:flex xl:flex-col xl:items-end">
                    <span className="text-[10px] font-medium opacity-80">
                      {formatDateShort(renderStart)} - {formatDateShort(renderEnd)}
                    </span>
                    {entry.targetLabel ? (
                      <span className="mt-1 text-[10px] opacity-70">
                        {entry.targetLabel}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {entries.some(
          (entry) =>
            entry.endsAt >= today &&
            diffInDays(today, entry.endsAt) <= 7 &&
            !entry.isHistorical,
        ) ? (
          <div className="absolute right-3 top-3 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
            Due soon
          </div>
        ) : null}
      </div>
    </>
  );
}
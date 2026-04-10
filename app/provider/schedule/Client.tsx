"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatCurrencyValue, formatLeadTime } from "@/lib/providers";
import type {
  ProviderScheduleBlock,
  ProviderScheduleBooking,
  ProviderScheduleData,
  ProviderScheduleWorkCenter,
} from "./types";

type Props = {
  data: ProviderScheduleData;
};

type ViewMode = "week" | "month" | "twoMonths" | "threeMonths";

type ScheduleRecommendation = {
  packageId: string;
  suggestedWorkCenterId: string | null;
  suggestedWorkCenterName: string | null;
  suggestedCapabilityId: string | null;
  suggestedCapabilityName: string | null;
  suggestedStartDate: string | null;
  suggestedEndDate: string | null;
  confidence: "low" | "medium" | "high";
  riskLevel: "none" | "low" | "medium" | "high";
  isFeasible: boolean;
  reasons: string[];
};

type ExtendedUnscheduledAward = ProviderScheduleData["unscheduledAwards"][number] & {
  requestType?: string | null;
  targetProcess?: string | null;
  targetMaterial?: string | null;
};

type ExtendedScheduleData = ProviderScheduleData & {
  recommendationsByPackageId?: Record<string, ScheduleRecommendation>;
  summary: ProviderScheduleData["summary"] & {
    dueSoonBookingCount?: number;
    overdueBookingCount?: number;
    overloadedLaneCount?: number;
    underusedLaneCount?: number;
  };
};

type TimelineEntry =
  | {
      kind: "booking";
      id: string;
      laneId: string;
      title: string;
      subtitle: string;
      startsAt: Date;
      endsAt: Date;
      status: string;
      priority: string;
      href: string | null;
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
      href: null;
      isHistorical: boolean;
      targetLabel: string | null;
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

function formatCenterTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatBlockTypeLabel(value: string) {
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

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toInputDateValue(value?: string | null) {
  if (!value) return getTodayInputValue();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return getTodayInputValue();
  }

  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${date.getUTCDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shiftInputDateValue(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function getBookingClasses(status: string, priority: string, isHistorical: boolean) {
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

  if (priority === "urgent") {
    return "border border-rose-300 bg-rose-50 text-rose-700";
  }

  if (priority === "high") {
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

function buildEntries(
  bookings: ProviderScheduleBooking[],
  blocks: ProviderScheduleBlock[],
) {
  const today = startOfDay(new Date());

  const bookingEntries: TimelineEntry[] = bookings
    .filter((booking) => Boolean(booking.providerWorkCenterId))
    .map((booking) => {
      const startsAt = parseDate(booking.startsAt) ?? today;
      const endsAt = parseDate(booking.endsAt) ?? startsAt;

      return {
        kind: "booking",
        id: booking.id,
        laneId: booking.providerWorkCenterId as string,
        title: booking.title,
        subtitle: booking.customerOrgName || booking.capabilityName || "Scheduled work",
        startsAt,
        endsAt,
        status: booking.bookingStatus,
        priority: booking.priority,
        href: booking.providerRequestPackageId
          ? `/provider/requests/${booking.providerRequestPackageId}`
          : null,
        isHistorical: endsAt < today,
        targetLabel: booking.capabilityName,
      };
    });

  const blockEntries: TimelineEntry[] = blocks
    .filter((block) => Boolean(block.providerWorkCenterId))
    .map((block) => {
      const startsAt = parseDate(block.startsAt) ?? today;
      const endsAt = parseDate(block.endsAt) ?? startsAt;

      return {
        kind: "block",
        id: block.id,
        laneId: block.providerWorkCenterId as string,
        title: block.title,
        subtitle: formatBlockTypeLabel(block.blockType),
        startsAt,
        endsAt,
        blockType: block.blockType,
        href: null,
        isHistorical: endsAt < today,
        targetLabel: null,
      };
    });

  return [...bookingEntries, ...blockEntries];
}

function getUtilizationPercent(
  workCenterId: string,
  entries: TimelineEntry[],
  visibleStart: Date,
  visibleEnd: Date,
  rangeDays: number,
) {
  const laneEntries = entries.filter(
    (entry) =>
      entry.laneId === workCenterId &&
      intersectsRange(entry.startsAt, entry.endsAt, visibleStart, visibleEnd),
  );

  const occupiedDays = laneEntries.reduce((total, entry) => {
    const entryStart = clampDate(entry.startsAt, visibleStart, visibleEnd);
    const entryEnd = clampDate(entry.endsAt, visibleStart, visibleEnd);
    return total + diffInDays(entryStart, entryEnd) + 1;
  }, 0);

  return Math.min(100, Math.round((occupiedDays / rangeDays) * 100));
}

function getDaysUntil(today: Date, date: Date) {
  return diffInDays(today, date);
}

function getAwardUrgencyScore(item: ExtendedUnscheduledAward, today: Date) {
  const dueDate = parseDate(item.targetDueDate);
  const leadDays = item.latestLeadTimeDays ?? 0;

  if (!dueDate) {
    return 100000 - leadDays;
  }

  const daysUntilDue = getDaysUntil(today, dueDate);
  return daysUntilDue - leadDays;
}

function getConfidenceBadgeClasses(confidence: ScheduleRecommendation["confidence"]) {
  switch (confidence) {
    case "high":
      return "bg-emerald-100 text-emerald-700";
    case "medium":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-zinc-200 text-zinc-700";
  }
}

function getRiskBadgeClasses(risk: ScheduleRecommendation["riskLevel"]) {
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

export default function Client({ data }: Props) {
  const extendedData = data as ExtendedScheduleData;
  const recommendationsByPackageId = extendedData.recommendationsByPackageId ?? {};
  const unscheduledAwards =
    extendedData.unscheduledAwards as ExtendedUnscheduledAward[];

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [pageOffset, setPageOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "completed" | "blocks"
  >("all");
  const [capabilityFilter, setCapabilityFilter] = useState("all");
  const [workCenterFilter, setWorkCenterFilter] = useState("all");

  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);

  const rangeDays = getViewDays(viewMode);
  const visibleStart = addDays(currentWeekStart, pageOffset * rangeDays);
  const visibleEnd = addDays(visibleStart, rangeDays - 1);

  const entries = useMemo(
    () => buildEntries(data.bookings, data.blocks),
    [data.bookings, data.blocks],
  );

  const filteredWorkCenters = useMemo(() => {
    return data.workCenters.filter((workCenter) => {
      if (workCenterFilter !== "all" && workCenter.id !== workCenterFilter) {
        return false;
      }

      if (
        capabilityFilter !== "all" &&
        !workCenter.mappedCapabilities.some(
          (capability) => capability.id === capabilityFilter,
        )
      ) {
        return false;
      }

      return true;
    });
  }, [capabilityFilter, data.workCenters, workCenterFilter]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (!filteredWorkCenters.some((workCenter) => workCenter.id === entry.laneId)) {
        return false;
      }

      if (statusFilter === "active") {
        if (entry.kind === "booking" && entry.status === "completed") return false;
        if (entry.kind === "block" && entry.isHistorical) return false;
      }

      if (statusFilter === "completed") {
        if (entry.kind !== "booking" || entry.status !== "completed") return false;
      }

      if (statusFilter === "blocks" && entry.kind !== "block") {
        return false;
      }

      const haystack = [entry.title, entry.subtitle, entry.targetLabel]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.trim().toLowerCase());
    });
  }, [entries, filteredWorkCenters, search, statusFilter]);

  const visibleEntries = useMemo(
    () =>
      filteredEntries.filter((entry) =>
        intersectsRange(entry.startsAt, entry.endsAt, visibleStart, visibleEnd),
      ),
    [filteredEntries, visibleEnd, visibleStart],
  );

  const entriesByLane = useMemo(() => {
    const map = new Map<string, TimelineEntry[]>();

    for (const workCenter of filteredWorkCenters) {
      map.set(workCenter.id, []);
    }

    for (const entry of visibleEntries) {
      const laneEntries = map.get(entry.laneId) ?? [];
      laneEntries.push(entry);
      map.set(entry.laneId, laneEntries);
    }

    return map;
  }, [filteredWorkCenters, visibleEntries]);

  const timelineDays = useMemo(
    () => Array.from({ length: rangeDays }, (_, index) => addDays(visibleStart, index)),
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
    diffInDays(visibleStart, clampDate(currentWeekStart, visibleStart, visibleEnd)) *
    DAY_WIDTH;

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

  const dueSoonBookings = useMemo(() => {
    return data.bookings.filter((booking) => {
      const endsAt = parseDate(booking.endsAt);
      if (!endsAt) return false;
      if (booking.bookingStatus === "completed" || booking.bookingStatus === "cancelled") {
        return false;
      }
      const days = diffInDays(today, endsAt);
      return days >= 0 && days <= 7;
    });
  }, [data.bookings, today]);

  const overdueBookings = useMemo(() => {
    return data.bookings.filter((booking) => {
      const endsAt = parseDate(booking.endsAt);
      if (!endsAt) return false;
      if (booking.bookingStatus === "completed" || booking.bookingStatus === "cancelled") {
        return false;
      }
      return endsAt < today;
    });
  }, [data.bookings, today]);

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
      [...data.capabilities]
        .filter((capability) => capability.active)
        .sort((a, b) => a.processName.localeCompare(b.processName)),
    [data.capabilities],
  );

  const sortedBookings = useMemo(() => {
    return [...data.bookings].sort((a, b) => {
      const aActive =
        a.bookingStatus !== "completed" && a.bookingStatus !== "cancelled";
      const bActive =
        b.bookingStatus !== "completed" && b.bookingStatus !== "cancelled";

      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }

      return new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime();
    });
  }, [data.bookings]);

  const sortedBlocks = useMemo(() => {
    return [...data.blocks].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
    );
  }, [data.blocks]);

  const sortedUnscheduledAwards = useMemo(() => {
    return [...unscheduledAwards].sort(
      (a, b) => getAwardUrgencyScore(a, today) - getAwardUrgencyScore(b, today),
    );
  }, [today, unscheduledAwards]);

  const laneHealth = useMemo(() => {
    return data.workCenters
      .map((workCenter) => ({
        workCenter,
        utilization: getUtilizationPercent(
          workCenter.id,
          entries,
          visibleStart,
          visibleEnd,
          rangeDays,
        ),
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }, [data.workCenters, entries, visibleStart, visibleEnd, rangeDays]);

  const overloadedLanes = laneHealth.filter((item) => item.utilization >= 85);

  const planningActions = useMemo(() => {
    const actions: string[] = [];

    if (overdueBookings.length > 0) {
      actions.push(
        `${overdueBookings.length} booking${
          overdueBookings.length === 1 ? "" : "s"
        } already sit past end date and should be rescheduled or completed first.`,
      );
    }

    if (sortedUnscheduledAwards.length > 0) {
      const topItem = sortedUnscheduledAwards[0];
      const recommendation = recommendationsByPackageId[topItem.packageId];

      if (recommendation?.isFeasible && recommendation.suggestedWorkCenterName) {
        actions.push(
          `Prioritise "${topItem.title || "Awarded package"}" next — best current slot is ${recommendation.suggestedWorkCenterName} from ${recommendation.suggestedStartDate}.`,
        );
      } else {
        actions.push(
          `Prioritise "${topItem.title || "Awarded package"}" next — it is the most urgent backlog item to plan.`,
        );
      }
    }

    if (overloadedLanes.length > 0) {
      actions.push(
        `${overloadedLanes.length} lane${
          overloadedLanes.length === 1 ? "" : "s"
        } show high visible utilisation. Review load balancing before adding more work there.`,
      );
    }

    if (activeBlocksThisRange.length > 0) {
      actions.push(
        `${activeBlocksThisRange.length} block${
          activeBlocksThisRange.length === 1 ? "" : "s"
        } affect the visible range and may reduce practical capacity.`,
      );
    }

    if (actions.length === 0) {
      actions.push("No major planning risks detected in the current visible range.");
    }

    return actions;
  }, [
    activeBlocksThisRange.length,
    overdueBookings.length,
    overloadedLanes.length,
    recommendationsByPackageId,
    sortedUnscheduledAwards,
  ]);

  return (
    <div className="space-y-8">
      <section className="rounded-[34px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
              Scheduling
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950 lg:text-5xl">
              Provider schedule
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Plan work, manage live bookings, and keep awarded backlog moving
              through real work center lanes.
            </p>
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

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <StatPill label="Work centers" value={data.summary.workCenterCount} />
          <StatPill label="Bookings" value={data.summary.bookingCount} />
          <StatPill label="Blocks" value={data.summary.blockCount} />
          <StatPill
            label="Backlog to plan"
            value={data.summary.unscheduledAwardCount}
          />
          <StatPill
            label="Due in 7 days"
            value={extendedData.summary.dueSoonBookingCount ?? dueSoonBookings.length}
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
              Current week anchored timeline
            </h3>
          </div>

          <div className="flex flex-wrap gap-2">
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
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search booking, customer, block..."
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "active" | "completed" | "blocks",
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All timeline items</option>
            <option value="active">Active work only</option>
            <option value="completed">Completed bookings</option>
            <option value="blocks">Blocks only</option>
          </select>

          <select
            value={capabilityFilter}
            onChange={(event) => setCapabilityFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All capabilities</option>
            {allCapabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.processName}
              </option>
            ))}
          </select>

          <select
            value={workCenterFilter}
            onChange={(event) => setWorkCenterFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All work centers</option>
            {data.workCenters.map((workCenter) => (
              <option key={workCenter.id} value={workCenter.id}>
                {workCenter.name}
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
              Work center allocation
            </h3>
          </div>

          {filteredWorkCenters.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-zinc-300 bg-[#fafaf9] p-10 text-center text-sm text-slate-600">
              No work centers match your filters yet.
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
                    Work center
                  </div>
                  <div className="mt-2 text-sm text-slate-600">Mapped production lanes</div>
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

                {filteredWorkCenters.map((workCenter) => {
                  const laneEntries = (entriesByLane.get(workCenter.id) ?? []).sort(
                    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
                  );

                  const rowHeight = Math.max(88, laneEntries.length * 56 + 20);

                  return (
                    <ScheduleLaneRow
                      key={workCenter.id}
                      workCenter={workCenter}
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
            overdueBookings={overdueBookings}
            dueSoonBookings={dueSoonBookings}
            sortedUnscheduledAwards={sortedUnscheduledAwards}
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
                value={extendedData.summary.dueSoonBookingCount ?? dueSoonBookings.length}
              />
              <AlertStatCard
                label="Overdue bookings"
                value={extendedData.summary.overdueBookingCount ?? overdueBookings.length}
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
              Ready to schedule
            </h3>

            {sortedUnscheduledAwards.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                No awarded work is waiting for scheduling.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {sortedUnscheduledAwards.slice(0, 4).map((item) => {
                  const recommendation = recommendationsByPackageId[item.packageId];

                  return (
                    <Link
                      key={item.packageId}
                      href={`/provider/requests/${item.packageId}`}
                      className="block rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 transition hover:border-zinc-300"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {item.title || "Awarded package"}
                          </div>
                          <div className="mt-1 text-sm text-slate-600">
                            {item.customerOrgName}
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
                        <div>Due: {formatDate(item.targetDueDate)}</div>
                        <div>Quantity: {item.requestedQuantity ?? "—"}</div>
                        <div>Lead time: {formatLeadTime(item.latestLeadTimeDays ?? null)}</div>
                        {recommendation?.suggestedWorkCenterName ? (
                          <div>
                            Suggested lane: {recommendation.suggestedWorkCenterName}
                          </div>
                        ) : null}
                      </div>
                    </Link>
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
              Utilisation by work center
            </h3>

            <div className="mt-5 space-y-3">
              {laneHealth.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                  No work centers are available yet.
                </div>
              ) : (
                laneHealth.slice(0, 6).map(({ workCenter, utilization }) => (
                  <div
                    key={workCenter.id}
                    className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-950">
                          {workCenter.name}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {formatCenterTypeLabel(workCenter.centerType)}
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
            Backlog to plan
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Turn awarded work into bookings
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Awarded packages should move into scheduled work with real dates, work
            centers, and optional capability assignment.
          </p>

          <div className="mt-8 space-y-4">
            {sortedUnscheduledAwards.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
                No awarded packages are waiting for booking creation.
              </div>
            ) : (
              sortedUnscheduledAwards.map((item) => (
                <AwardBookingCard
                  key={item.packageId}
                  item={item}
                  providerOrgId={data.organization?.id ?? ""}
                  workCenters={data.workCenters}
                  recommendation={recommendationsByPackageId[item.packageId] ?? null}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Schedule blocks
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Maintenance, downtime, and internal holds
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Add downtime, calibration, holidays, and internal blocks so the
            schedule reflects real operational capacity.
          </p>

          {data.organization ? (
            <div className="mt-6">
              <CreateScheduleBlockForm
                providerOrgId={data.organization.id}
                workCenters={data.workCenters}
              />
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            {sortedBlocks.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
                No schedule blocks added yet.
              </div>
            ) : (
              sortedBlocks.map((block) => (
                <ScheduleBlockManagementCard
                  key={block.id}
                  block={block}
                  workCenters={data.workCenters}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Booking management
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Edit and reschedule booked work
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Adjust work centers, dates, priority, and live status. Use the quick
          shift controls to move a booking earlier or later without re-entering
          everything.
        </p>

        <div className="mt-8 space-y-4">
          {sortedBookings.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
              No bookings created yet.
            </div>
          ) : (
            sortedBookings.map((booking) => (
              <BookingManagementCard
                key={booking.id}
                booking={booking}
                workCenters={data.workCenters}
              />
            ))
          )}
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
  overdueBookings,
  dueSoonBookings,
  sortedUnscheduledAwards,
  overloadedLanes,
  today,
}: {
  actions: string[];
  overdueBookings: ProviderScheduleBooking[];
  dueSoonBookings: ProviderScheduleBooking[];
  sortedUnscheduledAwards: ExtendedUnscheduledAward[];
  overloadedLanes: Array<{
    workCenter: ProviderScheduleWorkCenter;
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
        Rules-based schedule guidance for backlog, lane pressure, and short-term
        delivery risk. This gives you the helper now and leaves room for AI later.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            Overdue
          </div>
          <div className="mt-1 text-2xl font-semibold">{overdueBookings.length}</div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            Due soon
          </div>
          <div className="mt-1 text-2xl font-semibold">{dueSoonBookings.length}</div>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-slate-300">
            High load lanes
          </div>
          <div className="mt-1 text-2xl font-semibold">{overloadedLanes.length}</div>
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

      {sortedUnscheduledAwards.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold">Most urgent backlog item</div>
          <div className="mt-2 text-sm text-slate-200">
            {sortedUnscheduledAwards[0].title || "Awarded package"}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Due {formatDate(sortedUnscheduledAwards[0].targetDueDate)} ·{" "}
            {sortedUnscheduledAwards[0].customerOrgName}
          </div>
        </div>
      ) : null}

      {overdueBookings.length > 0 ? (
        <div className="mt-5 rounded-[18px] border border-rose-400/30 bg-rose-500/10 p-4">
          <div className="text-sm font-semibold text-rose-200">
            Immediate attention
          </div>
          <div className="mt-2 space-y-2">
            {overdueBookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="text-sm text-rose-100">
                {booking.title} · ended {formatDate(booking.endsAt)}
              </div>
            ))}
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
  workCenter,
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
  workCenter: ProviderScheduleWorkCenter;
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
        <div className="text-sm font-semibold text-slate-950">{workCenter.name}</div>
        <div className="mt-1 text-sm text-slate-500">
          {workCenter.code ? `${workCenter.code} · ` : ""}
          {formatCenterTypeLabel(workCenter.centerType)}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {workCenter.mappedCapabilities.slice(0, 2).map((capability) => (
            <span
              key={capability.id}
              className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700"
            >
              {capability.processName}
            </span>
          ))}
          {workCenter.mappedCapabilities.length > 2 ? (
            <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
              +{workCenter.mappedCapabilities.length - 2} more
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
          {Array.from({ length: Math.floor(timelineWidth / DAY_WIDTH) }).map((_, index) => (
            <div
              key={`${workCenter.id}-grid-${index}`}
              className="border-l border-zinc-200"
              style={{ width: DAY_WIDTH }}
            />
          ))}
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
              const width =
                (diffInDays(renderStart, renderEnd) + 1) * DAY_WIDTH;

              const content = (
                <>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{entry.title}</div>
                    <div className="truncate text-xs opacity-80">{entry.subtitle}</div>
                  </div>

                  <div className="hidden shrink-0 xl:flex xl:flex-col xl:items-end">
                    <span className="text-[10px] font-medium opacity-80">
                      {formatDateShort(renderStart)} - {formatDateShort(renderEnd)}
                    </span>
                    {entry.targetLabel ? (
                      <span className="mt-1 text-[10px] opacity-70">{entry.targetLabel}</span>
                    ) : null}
                  </div>
                </>
              );

              const commonProps = {
                className: `absolute flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm transition hover:shadow-md ${
                  entry.kind === "booking"
                    ? getBookingClasses(entry.status, entry.priority, entry.isHistorical)
                    : getBlockClasses(entry.blockType, entry.isHistorical)
                }`,
                style: {
                  left,
                  width: Math.max(width, 92),
                  top: 12 + index * 56,
                },
              };

              if (entry.kind === "booking" && entry.href) {
                return (
                  <Link key={entry.id} href={entry.href} {...commonProps}>
                    {content}
                  </Link>
                );
              }

              return (
                <div key={entry.id} {...commonProps}>
                  {content}
                </div>
              );
            })
          )}
        </div>

        {entries.some(
          (entry) =>
            entry.kind === "booking" &&
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

function AwardBookingCard({
  item,
  providerOrgId,
  workCenters,
  recommendation,
}: {
  item: ExtendedUnscheduledAward;
  providerOrgId: string;
  workCenters: ProviderScheduleWorkCenter[];
  recommendation: ScheduleRecommendation | null;
}) {
  const router = useRouter();

  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  const defaultWorkCenterId =
    recommendation?.suggestedWorkCenterId && activeWorkCenters.some((workCenter) => workCenter.id === recommendation.suggestedWorkCenterId)
      ? recommendation.suggestedWorkCenterId
      : activeWorkCenters[0]?.id ?? "";

  const [providerWorkCenterId, setProviderWorkCenterId] = useState(defaultWorkCenterId);
  const [providerCapabilityId, setProviderCapabilityId] = useState(
    recommendation?.suggestedCapabilityId ?? "",
  );
  const [startDate, setStartDate] = useState(
    recommendation?.suggestedStartDate ?? getTodayInputValue(),
  );
  const [endDate, setEndDate] = useState(
    recommendation?.suggestedEndDate ??
      addDays(new Date(), Math.max((item.latestLeadTimeDays ?? 5) - 1, 0))
        .toISOString()
        .slice(0, 10),
  );
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">(
    recommendation?.riskLevel === "high" ? "high" : "normal",
  );
  const [title, setTitle] = useState(item.title || "Scheduled job");
  const [notes, setNotes] = useState(
    recommendation?.reasons?.length
      ? `Suggested plan:\n- ${recommendation.reasons.join("\n- ")}`
      : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedWorkCenter = activeWorkCenters.find(
    (workCenter) => workCenter.id === providerWorkCenterId,
  );

  const mappedCapabilities = useMemo(() => {
    if (!selectedWorkCenter) return [];
    return selectedWorkCenter.mappedCapabilities;
  }, [selectedWorkCenter]);

  useEffect(() => {
    if (
      providerCapabilityId &&
      !mappedCapabilities.some((capability) => capability.id === providerCapabilityId)
    ) {
      setProviderCapabilityId(mappedCapabilities[0]?.id ?? "");
    }

    if (!providerCapabilityId && mappedCapabilities.length > 0) {
      const recommendedStillValid =
        recommendation?.suggestedCapabilityId &&
        mappedCapabilities.some(
          (capability) => capability.id === recommendation.suggestedCapabilityId,
        );

      setProviderCapabilityId(
        recommendedStillValid
          ? (recommendation?.suggestedCapabilityId ?? mappedCapabilities[0].id)
          : mappedCapabilities[0].id,
      );
    }
  }, [mappedCapabilities, providerCapabilityId, recommendation?.suggestedCapabilityId]);

  async function handleCreateBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/provider/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerOrgId,
          providerWorkCenterId,
          providerCapabilityId: providerCapabilityId || null,
          providerRequestPackageId: item.packageId,
          title,
          notes,
          priority,
          startDate,
          endDate,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create booking.");
      }

      setSuccess("Booking created.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleCreateBooking}
      className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-950">
            {item.title || "Awarded package"}
          </div>
          <div className="mt-1 text-sm text-slate-500">{item.customerOrgName}</div>
        </div>

        <Link
          href={`/provider/requests/${item.packageId}`}
          className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
        >
          Open package
        </Link>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        <div>Due: {formatDate(item.targetDueDate)}</div>
        <div>Quantity: {item.requestedQuantity ?? "—"}</div>
        <div>Lead time: {formatLeadTime(item.latestLeadTimeDays ?? null)}</div>
        <div>
          Latest total:{" "}
          {formatCurrencyValue(item.latestTotalPrice, item.latestCurrencyCode ?? undefined)}
        </div>
        {item.targetProcess ? <div>Target process: {item.targetProcess}</div> : null}
        {item.targetMaterial ? <div>Target material: {item.targetMaterial}</div> : null}
      </div>

      {recommendation ? (
        <div className="mt-5 rounded-[20px] border border-zinc-200 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getConfidenceBadgeClasses(
                recommendation.confidence,
              )}`}
            >
              {recommendation.confidence} confidence
            </span>
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${getRiskBadgeClasses(
                recommendation.riskLevel,
              )}`}
            >
              {recommendation.riskLevel} risk
            </span>
            {recommendation.isFeasible ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                Auto-filled from helper
              </span>
            ) : null}
          </div>

          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <div>
              Suggested lane: {recommendation.suggestedWorkCenterName || "No suggestion"}
            </div>
            <div>
              Suggested capability:{" "}
              {recommendation.suggestedCapabilityName || "No mapped capability"}
            </div>
            <div>
              Suggested window: {recommendation.suggestedStartDate || "—"} to{" "}
              {recommendation.suggestedEndDate || "—"}
            </div>
          </div>

          {recommendation.reasons.length > 0 ? (
            <div className="mt-3 space-y-2">
              {recommendation.reasons.map((reason) => (
                <div
                  key={reason}
                  className="rounded-[14px] border border-zinc-200 bg-[#fafaf9] px-3 py-2 text-xs text-slate-600"
                >
                  {reason}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {activeWorkCenters.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a work center first in Capabilities before creating bookings.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Work center</label>
              <select
                value={providerWorkCenterId}
                onChange={(event) => setProviderWorkCenterId(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                {activeWorkCenters.map((workCenter) => (
                  <option key={workCenter.id} value={workCenter.id}>
                    {workCenter.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Capability</label>
              <select
                value={providerCapabilityId}
                onChange={(event) => setProviderCapabilityId(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                {mappedCapabilities.length === 0 ? (
                  <option value="">No mapped capability selected</option>
                ) : (
                  mappedCapabilities.map((capability) => (
                    <option key={capability.id} value={capability.id}>
                      {capability.processName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Booking title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Priority</label>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as "low" | "normal" | "high" | "urgent",
                  )
                }
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
              placeholder="Setup notes, shift assumptions, delivery context..."
              className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </div>
        </>
      )}

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-5">
        <button
          type="submit"
          disabled={saving || activeWorkCenters.length === 0}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Creating booking..." : "Create booking"}
        </button>
      </div>
    </form>
  );
}

function CreateScheduleBlockForm({
  providerOrgId,
  workCenters,
}: {
  providerOrgId: string;
  workCenters: ProviderScheduleWorkCenter[];
}) {
  const router = useRouter();

  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  const [providerWorkCenterId, setProviderWorkCenterId] = useState(
    activeWorkCenters[0]?.id ?? "",
  );
  const [blockType, setBlockType] = useState<
    "maintenance" | "downtime" | "holiday" | "internal_hold" | "other"
  >("maintenance");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [endDate, setEndDate] = useState(getTodayInputValue());
  const [notes, setNotes] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/provider/schedule-blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerOrgId,
          providerWorkCenterId,
          blockType,
          title,
          startDate,
          endDate,
          notes,
          allDay,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create schedule block.");
      }

      setSuccess("Schedule block created.");
      setTitle("");
      setStartDate(getTodayInputValue());
      setEndDate(getTodayInputValue());
      setNotes("");
      setAllDay(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create schedule block.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6"
    >
      {activeWorkCenters.length === 0 ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add an active work center first in Capabilities before creating schedule blocks.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Work center</label>
              <select
                value={providerWorkCenterId}
                onChange={(event) => setProviderWorkCenterId(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                {activeWorkCenters.map((workCenter) => (
                  <option key={workCenter.id} value={workCenter.id}>
                    {workCenter.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Block type</label>
              <select
                value={blockType}
                onChange={(event) =>
                  setBlockType(
                    event.target.value as
                      | "maintenance"
                      | "downtime"
                      | "holiday"
                      | "internal_hold"
                      | "other",
                  )
                }
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              >
                <option value="maintenance">Maintenance</option>
                <option value="downtime">Downtime</option>
                <option value="holiday">Holiday</option>
                <option value="internal_hold">Internal hold</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Quarterly calibration"
              className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Start date</label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">End date</label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Calibration notes, replacement parts, external engineer visit..."
              className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
            />
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(event) => setAllDay(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300"
            />
            All-day block
          </label>
        </>
      )}

      {error ? (
        <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={saving || activeWorkCenters.length === 0}
        className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Creating block..." : "Create schedule block"}
      </button>
    </form>
  );
}

function ScheduleBlockManagementCard({
  block,
  workCenters,
}: {
  block: ProviderScheduleBlock;
  workCenters: ProviderScheduleWorkCenter[];
}) {
  const router = useRouter();
  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  const [providerWorkCenterId, setProviderWorkCenterId] = useState(
    block.providerWorkCenterId ?? activeWorkCenters[0]?.id ?? "",
  );
  const [blockType, setBlockType] = useState<
    "maintenance" | "downtime" | "holiday" | "internal_hold" | "other"
  >(block.blockType);
  const [title, setTitle] = useState(block.title);
  const [startDate, setStartDate] = useState(toInputDateValue(block.startsAt));
  const [endDate, setEndDate] = useState(toInputDateValue(block.endsAt));
  const [notes, setNotes] = useState(block.notes ?? "");
  const [allDay, setAllDay] = useState(block.allDay);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/provider/schedule-blocks/${block.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerWorkCenterId,
          blockType,
          title,
          startDate,
          endDate,
          notes,
          allDay,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update schedule block.");
      }

      setSuccess("Schedule block updated.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update schedule block.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/provider/schedule-blocks/${block.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete schedule block.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete schedule block.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-950">{block.title}</div>
          <div className="mt-1 text-sm text-slate-500">
            {formatBlockTypeLabel(block.blockType)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setStartDate((value) => shiftInputDateValue(value, -1));
              setEndDate((value) => shiftInputDateValue(value, -1));
            }}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Earlier 1 day
          </button>

          <button
            type="button"
            onClick={() => {
              setStartDate((value) => shiftInputDateValue(value, 1));
              setEndDate((value) => shiftInputDateValue(value, 1));
            }}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Later 1 day
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Work center</label>
          <select
            value={providerWorkCenterId}
            onChange={(event) => setProviderWorkCenterId(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {activeWorkCenters.map((workCenter) => (
              <option key={workCenter.id} value={workCenter.id}>
                {workCenter.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Block type</label>
          <select
            value={blockType}
            onChange={(event) =>
              setBlockType(
                event.target.value as
                  | "maintenance"
                  | "downtime"
                  | "holiday"
                  | "internal_hold"
                  | "other",
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="maintenance">Maintenance</option>
            <option value="downtime">Downtime</option>
            <option value="holiday">Holiday</option>
            <option value="internal_hold">Internal hold</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Title</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
        />
      </div>

      <label className="mt-4 inline-flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={allDay}
          onChange={(event) => setAllDay(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        All-day block
      </label>

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save block"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete block"}
        </button>
      </div>
    </form>
  );
}

function BookingManagementCard({
  booking,
  workCenters,
}: {
  booking: ProviderScheduleBooking;
  workCenters: ProviderScheduleWorkCenter[];
}) {
  const router = useRouter();
  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  const [providerWorkCenterId, setProviderWorkCenterId] = useState(
    booking.providerWorkCenterId ?? activeWorkCenters[0]?.id ?? "",
  );
  const [providerCapabilityId, setProviderCapabilityId] = useState(
    booking.providerCapabilityId ?? "",
  );
  const [title, setTitle] = useState(booking.title);
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">(
    booking.priority,
  );
  const [bookingStatus, setBookingStatus] = useState<
    | "unscheduled"
    | "scheduled"
    | "in_progress"
    | "paused"
    | "completed"
    | "cancelled"
  >(booking.bookingStatus);
  const [startDate, setStartDate] = useState(toInputDateValue(booking.startsAt));
  const [endDate, setEndDate] = useState(toInputDateValue(booking.endsAt));
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedWorkCenter = activeWorkCenters.find(
    (workCenter) => workCenter.id === providerWorkCenterId,
  );

  const mappedCapabilities = useMemo(() => {
    if (!selectedWorkCenter) return [];
    return selectedWorkCenter.mappedCapabilities;
  }, [selectedWorkCenter]);

  useEffect(() => {
    if (
      providerCapabilityId &&
      !mappedCapabilities.some((capability) => capability.id === providerCapabilityId)
    ) {
      setProviderCapabilityId(mappedCapabilities[0]?.id ?? "");
    }

    if (!providerCapabilityId && mappedCapabilities.length > 0) {
      setProviderCapabilityId(mappedCapabilities[0].id);
    }
  }, [mappedCapabilities, providerCapabilityId]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/provider/bookings/${booking.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerWorkCenterId,
          providerCapabilityId: providerCapabilityId || null,
          title,
          priority,
          bookingStatus,
          startDate,
          endDate,
          notes,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to update booking.");
      }

      setSuccess("Booking updated.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update booking.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/provider/bookings/${booking.id}`, {
        method: "DELETE",
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to delete booking.");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete booking.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-950">{booking.title}</div>
          <div className="mt-1 text-sm text-slate-500">
            {booking.customerOrgName || booking.capabilityName || "Scheduled work"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {booking.providerRequestPackageId ? (
            <Link
              href={`/provider/requests/${booking.providerRequestPackageId}`}
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Open package
            </Link>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setStartDate((value) => shiftInputDateValue(value, -1));
              setEndDate((value) => shiftInputDateValue(value, -1));
            }}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Earlier 1 day
          </button>

          <button
            type="button"
            onClick={() => {
              setStartDate((value) => shiftInputDateValue(value, 1));
              setEndDate((value) => shiftInputDateValue(value, 1));
            }}
            className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
          >
            Later 1 day
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
        <div>Current start: {formatDate(booking.startsAt)}</div>
        <div>Current end: {formatDate(booking.endsAt)}</div>
        <div>Quantity: {booking.requestedQuantity ?? "—"}</div>
        <div>Reference: {booking.jobReference || "—"}</div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Work center</label>
          <select
            value={providerWorkCenterId}
            onChange={(event) => setProviderWorkCenterId(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {activeWorkCenters.map((workCenter) => (
              <option key={workCenter.id} value={workCenter.id}>
                {workCenter.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Capability</label>
          <select
            value={providerCapabilityId}
            onChange={(event) => setProviderCapabilityId(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            {mappedCapabilities.length === 0 ? (
              <option value="">No mapped capability selected</option>
            ) : (
              mappedCapabilities.map((capability) => (
                <option key={capability.id} value={capability.id}>
                  {capability.processName}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Booking title</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Priority</label>
          <select
            value={priority}
            onChange={(event) =>
              setPriority(
                event.target.value as "low" | "normal" | "high" | "urgent",
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Status</label>
          <select
            value={bookingStatus}
            onChange={(event) =>
              setBookingStatus(
                event.target.value as
                  | "unscheduled"
                  | "scheduled"
                  | "in_progress"
                  | "paused"
                  | "completed"
                  | "cancelled",
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="unscheduled">Unscheduled</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <label className="text-sm font-medium text-slate-700">Notes</label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
        />
      </div>

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save booking"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50 disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete booking"}
        </button>
      </div>
    </form>
  );
}
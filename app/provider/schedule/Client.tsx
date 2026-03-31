"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
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
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
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

function formatBlockTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

export default function Client({ data }: Props) {
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
              Real bookings, maintenance blocks, and capability-mapped work center lanes
              powered by your scheduling backend foundation.
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

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Work centers</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {data.summary.workCenterCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Active work centers</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {data.summary.activeWorkCenterCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Bookings</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {data.summary.bookingCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Schedule blocks</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {data.summary.blockCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Unscheduled awards</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {data.summary.unscheduledAwardCount}
            </div>
          </div>
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
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Use the filters below to move across historical and future work while keeping
              the current week easy to find.
            </p>
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

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                  <div className="mt-2 text-sm text-slate-600">Capability mapped lanes</div>
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
          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Schedule alerts
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Operational awareness
            </h3>

            <div className="mt-5 space-y-3">
              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <div className="text-sm text-slate-500">Due within 7 days</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">
                  {dueSoonBookings.length}
                </div>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <div className="text-sm text-slate-500">Overdue bookings</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">
                  {overdueBookings.length}
                </div>
              </div>

              <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4">
                <div className="text-sm text-slate-500">Blocks in this range</div>
                <div className="mt-1 text-2xl font-semibold text-slate-950">
                  {activeBlocksThisRange.length}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Unscheduled awarded work
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Backlog to plan
            </h3>

            {data.unscheduledAwards.length === 0 ? (
              <div className="mt-5 rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                No awarded packages are waiting to be turned into schedule bookings.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {data.unscheduledAwards.slice(0, 6).map((item) => (
                  <Link
                    key={item.packageId}
                    href={`/provider/requests/${item.packageId}`}
                    className="block rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 transition hover:border-zinc-300"
                  >
                    <div className="text-sm font-semibold text-slate-950">
                      {item.title || "Awarded package"}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {item.customerOrgName}
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600">
                      <div>Due: {formatDate(item.targetDueDate)}</div>
                      <div>Quantity: {item.requestedQuantity ?? "—"}</div>
                      <div>
                        Lead time: {formatLeadTime(item.latestLeadTimeDays ?? null)}
                      </div>
                      <div>
                        Latest total:{" "}
                        {formatCurrencyValue(
                          item.latestTotalPrice,
                          item.latestCurrencyCode ?? undefined,
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[32px] border border-zinc-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Work center status
            </p>
            <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              Lane summary
            </h3>

            <div className="mt-5 space-y-3">
              {data.workCenters.length === 0 ? (
                <div className="rounded-[20px] border border-dashed border-zinc-300 bg-[#fafaf9] p-5 text-sm text-slate-600">
                  No work centers have been added yet.
                </div>
              ) : (
                data.workCenters.slice(0, 6).map((workCenter) => {
                  const utilization = getUtilizationPercent(
                    workCenter.id,
                    entries,
                    visibleStart,
                    visibleEnd,
                    rangeDays,
                  );

                  return (
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
                            {workCenter.centerType.replace("_", " ")}
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            workCenter.active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-200 text-zinc-700"
                          }`}
                        >
                          {workCenter.active ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="mt-3 text-sm text-slate-600">
                        {workCenter.mappedCapabilities.length} mapped capabilities
                      </div>

                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200">
                        <div
                          className="h-full rounded-full bg-slate-950"
                          style={{ width: `${utilization}%` }}
                        />
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Approx. visible utilization: {utilization}%
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Work center setup
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Add and map work centers
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Create real scheduling lanes and map them to the capabilities already in your
            provider profile.
          </p>

          {data.organization ? (
            <div className="mt-6">
              <CreateWorkCenterForm providerOrgId={data.organization.id} />
            </div>
          ) : null}

          <div className="mt-8 space-y-4">
            {data.workCenters.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
                No work centers added yet. Start by creating a machine, work cell,
                design station, or inspection lane.
              </div>
            ) : (
              data.workCenters.map((workCenter) => (
                <WorkCenterCapabilityCard
                  key={workCenter.id}
                  workCenter={workCenter}
                  capabilities={data.capabilities}
                />
              ))
            )}
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Booking creation
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Turn awarded work into real bookings
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Awarded packages should move into scheduled work with dates, work centers,
            and optional capability assignment.
          </p>

          <div className="mt-8 space-y-4">
            {data.unscheduledAwards.length === 0 ? (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fafaf9] p-6 text-sm text-slate-600">
                No awarded packages are waiting for booking creation.
              </div>
            ) : (
              data.unscheduledAwards.map((item) => (
                <AwardBookingCard
                  key={item.packageId}
                  item={item}
                  providerOrgId={data.organization?.id ?? ""}
                  workCenters={data.workCenters}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Schedule blocks
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Maintenance, downtime, and internal holds
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Add machine downtime, calibration, holidays, and internal blocks so the Gantt
          reflects real operational capacity.
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
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
          Booking management
        </p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
          Edit and reschedule booked work
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Adjust work centers, dates, priority, and live status. Use the quick shift
          controls to move a job earlier or later without re-entering everything.
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
          {workCenter.centerType.replace("_", " ")}
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

function CreateWorkCenterForm({ providerOrgId }: { providerOrgId: string }) {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [centerType, setCenterType] = useState("machine");
  const [description, setDescription] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/provider/work-centers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerOrgId,
          name,
          code,
          centerType,
          description,
          locationLabel,
          active,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to create work center.");
      }

      setSuccess("Work center created.");
      setName("");
      setCode("");
      setCenterType("machine");
      setDescription("");
      setLocationLabel("");
      setActive(true);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create work center.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Haas UMC-750"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Code</label>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="CNC-01"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Center type</label>
          <select
            value={centerType}
            onChange={(event) => setCenterType(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="machine">Machine</option>
            <option value="work_cell">Work cell</option>
            <option value="manual_station">Manual station</option>
            <option value="inspection_station">Inspection station</option>
            <option value="design_station">Design station</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Location</label>
          <input
            value={locationLabel}
            onChange={(event) => setLocationLabel(event.target.value)}
            placeholder="Bay A / Room 2"
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Description</label>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          placeholder="5-axis milling center for precision aluminium and prototype parts."
          className="w-full rounded-[20px] border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
        />
      </div>

      <label className="inline-flex items-center gap-3 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
        Active work center
      </label>

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
        disabled={saving}
        className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Creating..." : "Create work center"}
      </button>
    </form>
  );
}

function WorkCenterCapabilityCard({
  workCenter,
  capabilities,
}: {
  workCenter: ProviderScheduleWorkCenter;
  capabilities: ProviderScheduleData["capabilities"];
}) {
  const router = useRouter();
  const activeCapabilities = capabilities.filter((capability) => capability.active);

  const unmappedCapabilities = activeCapabilities.filter(
    (capability) =>
      !workCenter.mappedCapabilities.some((mapped) => mapped.id === capability.id),
  );

  const [selectedCapabilityId, setSelectedCapabilityId] = useState(
    unmappedCapabilities[0]?.id ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!unmappedCapabilities.some((capability) => capability.id === selectedCapabilityId)) {
      setSelectedCapabilityId(unmappedCapabilities[0]?.id ?? "");
    }
  }, [selectedCapabilityId, unmappedCapabilities]);

  async function addMapping() {
    if (!selectedCapabilityId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/provider/work-centers/${workCenter.id}/capabilities`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            providerCapabilityId: selectedCapabilityId,
          }),
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to add capability mapping.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add capability mapping.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeMapping(capabilityId: string) {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/provider/work-centers/${workCenter.id}/capabilities/${capabilityId}`,
        {
          method: "DELETE",
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to remove capability mapping.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to remove capability mapping.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-lg font-semibold text-slate-950">{workCenter.name}</div>
          <div className="mt-1 text-sm text-slate-500">
            {workCenter.code ? `${workCenter.code} · ` : ""}
            {workCenter.centerType.replace("_", " ")}
          </div>
          {workCenter.locationLabel ? (
            <div className="mt-1 text-sm text-slate-500">{workCenter.locationLabel}</div>
          ) : null}
        </div>

        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            workCenter.active
              ? "bg-emerald-100 text-emerald-700"
              : "bg-zinc-200 text-zinc-700"
          }`}
        >
          {workCenter.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="mt-5">
        <div className="text-sm font-medium text-slate-700">Mapped capabilities</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {workCenter.mappedCapabilities.length === 0 ? (
            <span className="text-sm text-slate-500">No mapped capabilities yet.</span>
          ) : (
            workCenter.mappedCapabilities.map((capability) => (
              <button
                key={capability.id}
                type="button"
                onClick={() => removeMapping(capability.id)}
                disabled={saving}
                className="rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-zinc-50 disabled:opacity-60"
                title="Remove mapping"
              >
                {capability.processName} ×
              </button>
            ))
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto]">
        <select
          value={selectedCapabilityId}
          onChange={(event) => setSelectedCapabilityId(event.target.value)}
          disabled={saving || unmappedCapabilities.length === 0}
          className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none disabled:bg-zinc-50"
        >
          {unmappedCapabilities.length === 0 ? (
            <option value="">All active capabilities already mapped</option>
          ) : (
            unmappedCapabilities.map((capability) => (
              <option key={capability.id} value={capability.id}>
                {capability.processName}
              </option>
            ))
          )}
        </select>

        <button
          type="button"
          onClick={addMapping}
          disabled={saving || !selectedCapabilityId}
          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add mapping"}
        </button>
      </div>

      {error ? (
        <div className="mt-4 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}

function AwardBookingCard({
  item,
  providerOrgId,
  workCenters,
}: {
  item: ProviderScheduleData["unscheduledAwards"][number];
  providerOrgId: string;
  workCenters: ProviderScheduleWorkCenter[];
}) {
  const router = useRouter();

  const activeWorkCenters = workCenters.filter((workCenter) => workCenter.active);

  const [providerWorkCenterId, setProviderWorkCenterId] = useState(
    activeWorkCenters[0]?.id ?? "",
  );
  const [providerCapabilityId, setProviderCapabilityId] = useState("");
  const [startDate, setStartDate] = useState(getTodayInputValue());
  const [endDate, setEndDate] = useState(
    addDays(
      new Date(),
      Math.max((item.latestLeadTimeDays ?? 5) - 1, 0),
    )
      .toISOString()
      .slice(0, 10),
  );
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">(
    "normal",
  );
  const [title, setTitle] = useState(item.title || "Scheduled job");
  const [notes, setNotes] = useState("");
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
      setProviderCapabilityId(mappedCapabilities[0].id);
    }
  }, [mappedCapabilities, providerCapabilityId]);

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
      </div>

      {activeWorkCenters.length === 0 ? (
        <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add a work center first before creating bookings.
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
              <label className="text-sm font-medium text-slate-700">
                Capability
              </label>
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
              rows={3}
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
          Add an active work center first before creating schedule blocks.
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
      const response = await fetch(
        `/api/provider/schedule-blocks/${block.id}`,
        {
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
        },
      );

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
      const response = await fetch(
        `/api/provider/schedule-blocks/${block.id}`,
        {
          method: "DELETE",
        },
      );

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
  const [priority, setPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >(booking.priority);
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
      const response = await fetch(
        `/api/provider/bookings/${booking.id}`,
        {
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
        },
      );

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
      const response = await fetch(
        `/api/provider/bookings/${booking.id}`,
        {
          method: "DELETE",
        },
      );

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
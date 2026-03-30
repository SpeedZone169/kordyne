"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  getProviderPackageStatusLabel,
  providerPackageStatusTones,
} from "@/lib/providers";
import type {
  ProviderCapabilityRow,
  ProviderDashboardData,
  ProviderInboxRow,
} from "../types";

type Props = {
  data: ProviderDashboardData;
};

type ViewMode = "week" | "month" | "twoMonths" | "threeMonths";

type ScheduleLane = {
  id: string;
  type: "capability" | "unmapped";
  title: string;
  subtitle: string;
  capability?: ProviderCapabilityRow;
};

type ScheduleItem = {
  id: string;
  laneId: string;
  packageId: string;
  title: string;
  customerName: string;
  packageStatus: string;
  customerVisibleStatus: string | null;
  requestedQuantity: number | null;
  latestQuoteStatus: string | null;
  latestLeadTimeDays: number | null;
  startDate: Date;
  endDate: Date;
  targetDueDate: Date | null;
  isHistorical: boolean;
};

const DAY_WIDTH = 44;
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

function formatDate(value?: Date | string | null) {
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

function toneClasses(
  tone: "neutral" | "info" | "success" | "warning" | "danger",
) {
  switch (tone) {
    case "info":
      return "bg-sky-100 text-sky-700";
    case "success":
      return "bg-emerald-100 text-emerald-700";
    case "warning":
      return "bg-amber-100 text-amber-700";
    case "danger":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
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

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return startOfDay(date);
}

function getPlanningStart(row: ProviderInboxRow) {
  return (
    parseDate(row.awardedAt) ||
    parseDate(row.providerRespondedAt) ||
    parseDate(row.latestQuoteSubmittedAt) ||
    parseDate(row.publishedAt) ||
    parseDate(row.createdAt) ||
    startOfDay(new Date())
  );
}

function getPlanningEnd(row: ProviderInboxRow, startDate: Date) {
  const targetDueDate = parseDate(row.targetDueDate);
  const leadTimeDays =
    row.latestLeadTimeDays && row.latestLeadTimeDays > 0
      ? row.latestLeadTimeDays
      : null;

  if (targetDueDate) {
    return targetDueDate;
  }

  if (leadTimeDays) {
    return addDays(startDate, Math.max(leadTimeDays - 1, 0));
  }

  return addDays(startDate, 6);
}

function getItemBarClasses(item: ScheduleItem) {
  if (item.isHistorical) {
    return "border border-zinc-300 bg-white text-slate-700";
  }

  if (item.packageStatus === "awarded") {
    return "border border-slate-950 bg-slate-950 text-white";
  }

  if (item.packageStatus === "not_awarded") {
    return "border border-zinc-300 bg-zinc-100 text-zinc-600";
  }

  if (item.packageStatus === "cancelled" || item.packageStatus === "closed") {
    return "border border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border border-sky-200 bg-sky-50 text-sky-800";
}

function buildLanes(
  capabilities: ProviderCapabilityRow[],
  rows: ProviderInboxRow[],
): ScheduleLane[] {
  const activeCapabilities = capabilities.filter((capability) => capability.active);

  if (activeCapabilities.length === 0) {
    return [
      {
        id: "unmapped",
        type: "unmapped",
        title: "General planning",
        subtitle: "No active capabilities yet",
      },
    ];
  }

  const capabilityLanes: ScheduleLane[] = activeCapabilities.map((capability) => ({
    id: capability.id,
    type: "capability",
    title: capability.processName,
    subtitle:
      capability.machineType ||
      capability.materialFamily ||
      capability.materialName ||
      "Capability lane",
    capability,
  }));

  if (activeCapabilities.length === 1 || rows.length === 0) {
    return capabilityLanes;
  }

  return [
    ...capabilityLanes,
    {
      id: "unmapped",
      type: "unmapped",
      title: "Unmapped work",
      subtitle: "Requests awaiting explicit capability mapping",
    },
  ];
}

function buildItems(
  rows: ProviderInboxRow[],
  capabilities: ProviderCapabilityRow[],
): ScheduleItem[] {
  const activeCapabilities = capabilities.filter((capability) => capability.active);
  const today = startOfDay(new Date());

  return rows.map((row) => {
    const startDate = getPlanningStart(row);
    const endDate = getPlanningEnd(row, startDate);

    let laneId = "unmapped";

    if (activeCapabilities.length === 1) {
      laneId = activeCapabilities[0].id;
    }

    return {
      id: row.packageId,
      laneId,
      packageId: row.packageId,
      title: row.packageTitle || "Provider package",
      customerName: row.customerOrgName,
      packageStatus: row.packageStatus,
      customerVisibleStatus: row.customerVisibleStatus,
      requestedQuantity: row.requestedQuantity,
      latestQuoteStatus: row.latestQuoteStatus,
      latestLeadTimeDays: row.latestLeadTimeDays,
      startDate,
      endDate,
      targetDueDate: parseDate(row.targetDueDate),
      isHistorical: endDate < today,
    };
  });
}

export default function Client({ data }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [pageOffset, setPageOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "awarded" | "historical"
  >("all");
  const [laneFilter, setLaneFilter] = useState("all");

  const today = useMemo(() => startOfDay(new Date()), []);
  const currentWeekStart = useMemo(() => startOfWeek(today), [today]);

  const rangeDays = getViewDays(viewMode);
  const visibleStart = addDays(currentWeekStart, pageOffset * rangeDays);
  const visibleEnd = addDays(visibleStart, rangeDays - 1);

  const lanes = useMemo(
    () => buildLanes(data.capabilities, data.rows),
    [data.capabilities, data.rows],
  );

  const allItems = useMemo(
    () => buildItems(data.rows, data.capabilities),
    [data.rows, data.capabilities],
  );

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (laneFilter !== "all" && item.laneId !== laneFilter) {
        return false;
      }

      if (statusFilter === "active" && item.isHistorical) {
        return false;
      }

      if (statusFilter === "awarded" && item.packageStatus !== "awarded") {
        return false;
      }

      if (statusFilter === "historical" && !item.isHistorical) {
        return false;
      }

      const haystack = [
        item.title,
        item.customerName,
        item.customerVisibleStatus,
        item.latestQuoteStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(search.trim().toLowerCase());
    });
  }, [allItems, laneFilter, search, statusFilter]);

  const visibleItems = useMemo(
    () =>
      filteredItems.filter((item) =>
        intersectsRange(item.startDate, item.endDate, visibleStart, visibleEnd),
      ),
    [filteredItems, visibleEnd, visibleStart],
  );

  const itemsByLane = useMemo(() => {
    const map = new Map<string, ScheduleItem[]>();

    for (const lane of lanes) {
      map.set(lane.id, []);
    }

    for (const item of visibleItems) {
      const laneItems = map.get(item.laneId) ?? [];
      laneItems.push(item);
      map.set(item.laneId, laneItems);
    }

    return map;
  }, [lanes, visibleItems]);

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

  const visibleAwardedCount = visibleItems.filter(
    (item) => item.packageStatus === "awarded",
  ).length;

  const visibleHistoricalCount = visibleItems.filter(
    (item) => item.isHistorical,
  ).length;

  const visibleActiveCount = visibleItems.filter(
    (item) => !item.isHistorical,
  ).length;

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
              Plan work across capability lanes with historical context, current-week
              visibility, and longer-range planning views. This foundation uses your
              existing provider capabilities and request data.
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

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Visible items</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {visibleItems.length}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Visible active work</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {visibleActiveCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Visible awarded work</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {visibleAwardedCount}
            </div>
          </div>

          <div className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-5">
            <div className="text-sm text-slate-500">Historical items</div>
            <div className="mt-2 text-3xl font-semibold text-slate-950">
              {visibleHistoricalCount}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Timeline controls
            </p>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              Current week anchored planning
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              The highlighted band keeps the current week visible inside every view.
              Use previous and next to browse history and future work while keeping a
              quick path back to now.
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

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.3fr_0.9fr_0.9fr]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search request, package, customer..."
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          />

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as "all" | "active" | "awarded" | "historical",
              )
            }
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All items</option>
            <option value="active">Current + future</option>
            <option value="awarded">Awarded only</option>
            <option value="historical">Historical only</option>
          </select>

          <select
            value={laneFilter}
            onChange={(event) => setLaneFilter(event.target.value)}
            className="w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none"
          >
            <option value="all">All lanes</option>
            {lanes.map((lane) => (
              <option key={lane.id} value={lane.id}>
                {lane.title}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-[22px] border border-zinc-200 bg-[#fafaf9] px-4 py-3 text-sm text-slate-700">
          Visible range: <span className="font-medium">{formatDate(visibleStart)}</span>{" "}
          to <span className="font-medium">{formatDate(visibleEnd)}</span>
        </div>

        <div className="mt-8 overflow-x-auto">
          <div
            className="grid min-w-max gap-y-0"
            style={{
              gridTemplateColumns: `${LANE_WIDTH}px ${timelineWidth}px`,
            }}
          >
            <div className="sticky left-0 z-20 border-b border-r border-zinc-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Capability lane
              </div>
              <div className="mt-2 text-sm text-slate-600">Planning surface</div>
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
                        {showMajorLabel ? day.toLocaleString("en-IE", { month: "short" }) : ""}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {lanes.map((lane) => {
              const laneItems = itemsByLane.get(lane.id) ?? [];

              return (
                <FragmentRow
                  key={lane.id}
                  lane={lane}
                  laneItems={laneItems}
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
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Scheduling notes
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Current foundation
          </h3>
          <div className="mt-5 space-y-3">
            <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
              Current lanes come from your active provider capabilities.
            </div>
            <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
              Current bars are derived from existing request and quote timing until
              dedicated booking tables are added.
            </div>
            <div className="rounded-[20px] border border-zinc-200 bg-[#fafaf9] p-4 text-sm text-slate-700">
              Next we will connect awarded work to explicit capability bookings,
              work centers, and editable schedule bars.
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Next operational step
          </p>
          <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            Move from inferred timing to real bookings
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The next backend step is to create provider work centers and booking records so
            this Gantt becomes a true execution schedule, not just a planning projection.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/provider/capabilities"
              className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-zinc-50"
            >
              Review capabilities
            </Link>
            <Link
              href="/provider/requests"
              className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
            >
              Review request management
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function FragmentRow({
  lane,
  laneItems,
  visibleStart,
  visibleEnd,
  today,
  currentWeekVisible,
  currentWeekLeft,
  currentWeekWidth,
  timelineWidth,
}: {
  lane: ScheduleLane;
  laneItems: ScheduleItem[];
  visibleStart: Date;
  visibleEnd: Date;
  today: Date;
  currentWeekVisible: boolean;
  currentWeekLeft: number;
  currentWeekWidth: number;
  timelineWidth: number;
}) {
  const rowHeight = Math.max(88, laneItems.length * 58 + 24);

  return (
    <>
      <div className="sticky left-0 z-10 border-r border-b border-zinc-200 bg-white p-4">
        <div className="text-sm font-semibold text-slate-950">{lane.title}</div>
        <div className="mt-1 text-sm text-slate-500">{lane.subtitle}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
            {lane.type === "capability" ? "Capability lane" : "Planning lane"}
          </span>
          <span className="rounded-full border border-zinc-200 bg-[#f5f5f3] px-3 py-1 text-xs font-medium text-slate-700">
            {laneItems.length} visible
          </span>
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
              key={`${lane.id}-grid-${index}`}
              className="border-l border-zinc-200"
              style={{ width: DAY_WIDTH }}
            />
          ))}
        </div>

        <div className="relative z-10 h-full">
          {laneItems.length === 0 ? (
            <div className="flex h-full items-center px-4 text-sm text-slate-400">
              No items visible in this range.
            </div>
          ) : (
            laneItems.map((item, index) => {
              const renderStart = clampDate(item.startDate, visibleStart, visibleEnd);
              const renderEnd = clampDate(item.endDate, visibleStart, visibleEnd);

              const left = diffInDays(visibleStart, renderStart) * DAY_WIDTH;
              const width =
                (diffInDays(renderStart, renderEnd) + 1) * DAY_WIDTH;

              const statusTone =
                providerPackageStatusTones[
                  item.packageStatus as keyof typeof providerPackageStatusTones
                ] ?? "neutral";

              const dueSoon =
                item.targetDueDate &&
                diffInDays(today, item.targetDueDate) >= 0 &&
                diffInDays(today, item.targetDueDate) <= 7 &&
                !item.isHistorical;

              return (
                <Link
                  key={item.id}
                  href={`/provider/requests/${item.packageId}`}
                  className={`absolute flex items-center gap-3 rounded-2xl px-3 py-2 shadow-sm transition hover:shadow-md ${getItemBarClasses(
                    item,
                  )}`}
                  style={{
                    left,
                    width: Math.max(width, 92),
                    top: 12 + index * 58,
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">
                      {item.title}
                    </div>
                    <div className="truncate text-xs opacity-80">
                      {item.customerName}
                    </div>
                  </div>

                  <div className="hidden shrink-0 xl:flex xl:flex-col xl:items-end">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${toneClasses(
                        statusTone,
                      )}`}
                    >
                      {getProviderPackageStatusLabel(
                        item.packageStatus as Parameters<
                          typeof getProviderPackageStatusLabel
                        >[0],
                      )}
                    </span>
                    <span className="mt-1 text-[10px] opacity-80">
                      {formatDateShort(renderStart)} - {formatDateShort(renderEnd)}
                    </span>
                  </div>

                  {dueSoon ? (
                    <div className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Due soon
                    </div>
                  ) : null}
                </Link>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
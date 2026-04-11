"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { InternalScheduleBlock, InternalScheduleResource } from "./types";

type Props = {
  block: InternalScheduleBlock;
  resources: InternalScheduleResource[];
};

function fieldClasses() {
  return "w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none";
}

function toInputDateValue(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 10);

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
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

function formatBlockTypeLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function InternalScheduleBlockManagementCard({
  block,
  resources,
}: Props) {
  const router = useRouter();
  const activeResources = resources.filter((resource) => resource.active);

  const [resourceId, setResourceId] = useState(
    block.resourceId ?? activeResources[0]?.id ?? "",
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
        `/api/internal-manufacturing/schedule-blocks/${block.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resourceId,
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
        `/api/internal-manufacturing/schedule-blocks/${block.id}`,
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
    <form
      onSubmit={handleSave}
      className="rounded-[24px] border border-zinc-200 bg-[#fafaf9] p-6"
    >
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
          <label className="text-sm font-medium text-slate-700">Resource</label>
          <select
            value={resourceId}
            onChange={(event) => setResourceId(event.target.value)}
            className={fieldClasses()}
          >
            {activeResources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {resource.name}
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
            className={fieldClasses()}
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
          className={fieldClasses()}
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Start date</label>
          <input
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
            className={fieldClasses()}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">End date</label>
          <input
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
            className={fieldClasses()}
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
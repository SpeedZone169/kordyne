"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { InternalScheduleResource } from "./types";

type Props = {
  resources: InternalScheduleResource[];
};

function fieldClasses() {
  return "w-full rounded-full border border-zinc-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none";
}

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateInternalScheduleBlockForm({ resources }: Props) {
  const router = useRouter();

  const activeResources = resources.filter((resource) => resource.active);

  const [resourceId, setResourceId] = useState(activeResources[0]?.id ?? "");
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
      const response = await fetch("/api/internal-manufacturing/schedule-blocks", {
        method: "POST",
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
      {activeResources.length === 0 ? (
        <div className="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Add an active internal resource first before creating schedule blocks.
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Calibration / machine service"
              className={fieldClasses()}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Maintenance notes, downtime reason, internal hold context..."
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
        disabled={saving || activeResources.length === 0}
        className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {saving ? "Creating block..." : "Create schedule block"}
      </button>
    </form>
  );
}
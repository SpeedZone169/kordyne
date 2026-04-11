"use client";

import Link from "next/link";
import UpdateResourceStatusForm from "./UpdateResourceStatusForm";
import type {
  InternalManufacturingData,
  InternalManufacturingJob,
  InternalManufacturingResource,
} from "./types";

type ClientProps = {
  data: InternalManufacturingData;
};

function statusBadgeClasses(status: string) {
  switch (status) {
    case "running":
    case "in_progress":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "blocked":
    case "offline":
      return "border-rose-200 bg-rose-50 text-rose-700";
    case "maintenance":
    case "paused":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "queued":
    case "planned":
    case "ready":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "completed":
    case "complete":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-zinc-200 bg-zinc-50 text-slate-600";
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function SummaryCard(props: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-[28px] border border-zinc-200 bg-white p-7 shadow-sm">
      <div className="text-[15px] font-medium text-slate-600">{props.label}</div>
      <div className="mt-5 text-5xl font-semibold tracking-tight text-[#0b1633]">
        {props.value}
      </div>
      <p className="mt-4 max-w-[18rem] text-[15px] leading-8 text-slate-600">
        {props.hint}
      </p>
    </div>
  );
}

function SectionCard(props: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-[22px] font-semibold tracking-tight text-[#0b1633]">
            {props.title}
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-8 text-slate-600">
            {props.description}
          </p>
        </div>
        {props.action ? <div>{props.action}</div> : null}
      </div>

      <div className="mt-8">{props.children}</div>
    </section>
  );
}

function ResourceRow({
  resource,
  canManage,
}: {
  resource: InternalManufacturingResource;
  canManage: boolean;
}) {
  return (
    <div className="rounded-[26px] border border-zinc-200 bg-[#fcfcfb] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-[#0b1633]">
            {resource.name}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {resource.resourceType.replaceAll("_", " ")} ·{" "}
            {resource.serviceDomain.replaceAll("_", " ")}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {resource.capabilityCodes.length > 0 ? (
              resource.capabilityCodes.map((code) => (
                <span
                  key={code}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-slate-600"
                >
                  {code}
                </span>
              ))
            ) : (
              <span className="text-sm text-slate-500">
                No capabilities mapped yet.
              </span>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[28rem]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Status
            </div>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusBadgeClasses(
                  resource.derivedStatus,
                )}`}
              >
                {resource.derivedStatus.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Availability
            </div>
            <div className="mt-3 text-sm font-medium text-[#0b1633]">
              {resource.active ? "Active" : "Inactive"}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Source: {resource.statusSource.replaceAll("_", " ")}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Last change
            </div>
            <div className="mt-3 text-sm font-medium text-[#0b1633]">
              {formatDateTime(resource.latestStatusAt)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              {resource.locationLabel || "No location set"}
            </div>
          </div>
        </div>
      </div>

      {canManage ? (
        <UpdateResourceStatusForm
          resourceId={resource.id}
          resourceName={resource.name}
        />
      ) : null}
    </div>
  );
}

function JobRow({ job }: { job: InternalManufacturingJob }) {
  return (
    <div className="rounded-[26px] border border-zinc-200 bg-[#fcfcfb] p-5">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="text-[17px] font-semibold text-[#0b1633]">
            {job.title}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {job.serviceDomain.replaceAll("_", " ")} · qty {job.requiredQuantity} ·{" "}
            {job.jobType.replaceAll("_", " ")}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:min-w-[34rem]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Job status
            </div>
            <div className="mt-3">
              <span
                className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusBadgeClasses(
                  job.status,
                )}`}
              >
                {job.status.replaceAll("_", " ")}
              </span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Routing
            </div>
            <div className="mt-3 text-sm font-medium text-[#0b1633]">
              {job.routingDecision.replaceAll("_", " ")}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Confidence:{" "}
              {job.routingConfidence == null
                ? "—"
                : `${Math.round(job.routingConfidence * 100)}%`}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Due
            </div>
            <div className="mt-3 text-sm font-medium text-[#0b1633]">
              {formatDateTime(job.dueAt)}
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Priority: {job.priority}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Client({ data }: ClientProps) {
  const { organization, summary, resources, capabilities, jobs, recentStatusEvents, errors } =
    data;

  const canManage =
    organization?.organizationType === "customer" &&
    organization?.membershipRole === "admin";

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Internal Manufacturing
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#0b1633]">
              Factory workspace
            </h1>
            <p className="mt-4 max-w-3xl text-[16px] leading-8 text-slate-600">
              Monitor internal resources, capabilities, recent status changes, and
              routing-ready jobs before sending work out to external vendors.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 lg:items-end">
            <div className="rounded-[24px] border border-zinc-200 bg-[#fcfcfb] px-5 py-4">
              <div className="text-sm font-semibold text-[#0b1633]">
                {organization?.name ?? "No organization"}
              </div>
              <div className="mt-2 text-sm text-slate-500">
                {(organization?.organizationType ?? "unknown").replaceAll("_", " ")} ·
                role {organization?.membershipRole ?? "—"} · plan{" "}
                {organization?.plan ?? "—"}
              </div>
            </div>

            {canManage ? (
              <Link
                href="/dashboard/internal-manufacturing/setup"
                className="inline-flex items-center justify-center rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a]"
              >
                Manage Resources & Capabilities
              </Link>
            ) : null}
          </div>
        </div>

        <Link
  href="/dashboard/internal-manufacturing/schedule"
  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-[#fcfcfb] px-5 py-3 text-sm font-semibold text-[#0b1633] transition hover:bg-zinc-50"
>
  Open schedule
</Link>

        {errors.length > 0 ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
            <div className="text-sm font-semibold text-amber-800">
              Some data could not be loaded completely.
            </div>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              {errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-6">
        <SummaryCard
          label="Resources"
          value={summary.resourceCount}
          hint="Internal machines, cells, and schedulable service capacity."
        />
        <SummaryCard
          label="Active resources"
          value={summary.activeResourceCount}
          hint="Resources currently available for internal planning and execution."
        />
        <SummaryCard
          label="Capabilities"
          value={summary.capabilityCount}
          hint="Process and material capabilities mapped to internal capacity."
        />
        <SummaryCard
          label="Jobs"
          value={summary.jobCount}
          hint="Internal jobs tracked for in-house routing and execution."
        />
        <SummaryCard
          label="Queued / in progress"
          value={summary.queuedOrInProgressJobCount}
          hint="Jobs currently planned, queued, or already moving through work."
        />
        <SummaryCard
          label="Overdue jobs"
          value={summary.overdueJobCount}
          hint="Internal jobs that have passed their due date and need attention."
        />
      </section>

      {canManage ? (
        <section className="rounded-[32px] border border-zinc-200 bg-white p-7 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-[22px] font-semibold tracking-tight text-[#0b1633]">
                Factory setup
              </h2>
              <p className="mt-3 max-w-3xl text-[15px] leading-8 text-slate-600">
                Add resources, define capabilities, map them together, and prepare
                the internal factory model that powers routing and scheduling.
              </p>
            </div>

            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-[#fcfcfb] px-5 py-3 text-sm font-semibold text-[#0b1633] transition hover:bg-zinc-50"
            >
              Open setup
            </Link>
          </div>
        </section>
      ) : null}

      <section className="grid gap-8 xl:grid-cols-[1.35fr_0.95fr]">
        <SectionCard
          title="Resources"
          description="Your internal equipment, work cells, and service capacity available for customer-owned manufacturing."
          action={
            <span className="rounded-full border border-zinc-200 bg-[#fcfcfb] px-4 py-2 text-sm font-medium text-slate-600">
              {resources.length} total
            </span>
          }
        >
          <div className="space-y-4">
            {resources.length > 0 ? (
              resources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  canManage={canManage}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fcfcfb] p-6 text-sm text-slate-500">
                No resources added yet.
              </div>
            )}
          </div>
        </SectionCard>

        <div className="space-y-8">
          <SectionCard
            title="Capabilities"
            description="Capability codes mapped to your internal resource pool."
            action={
              canManage ? (
                <Link
                  href="/dashboard/internal-manufacturing/setup"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-[#fcfcfb] px-4 py-2 text-sm font-medium text-[#0b1633] transition hover:bg-zinc-50"
                >
                  Manage setup
                </Link>
              ) : null
            }
          >
            <div className="space-y-4">
              {capabilities.length > 0 ? (
                capabilities.map((capability) => (
                  <div
                    key={capability.id}
                    className="rounded-[24px] border border-zinc-200 bg-[#fcfcfb] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[16px] font-semibold text-[#0b1633]">
                          {capability.name}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {capability.code} ·{" "}
                          {capability.serviceDomain.replaceAll("_", " ")}
                        </div>
                      </div>

                      <span className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                        {capability.resourceCount} resources
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fcfcfb] p-6 text-sm text-slate-500">
                  No capabilities added yet.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Recent status events"
            description="Latest manual or system status changes across internal resources."
          >
            <div className="space-y-4">
              {recentStatusEvents.length > 0 ? (
                recentStatusEvents.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className="rounded-[24px] border border-zinc-200 bg-[#fcfcfb] p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[16px] font-semibold text-[#0b1633]">
                          {event.resourceName}
                        </div>
                        <div className="mt-2 text-sm text-slate-500">
                          {event.source.replaceAll("_", " ")} ·{" "}
                          {event.reasonCode ?? "no reason code"}
                        </div>
                        {event.reasonDetail ? (
                          <div className="mt-3 text-sm leading-7 text-slate-600">
                            {event.reasonDetail}
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${statusBadgeClasses(
                            event.status,
                          )}`}
                        >
                          {event.status.replaceAll("_", " ")}
                        </span>
                        <div className="mt-3 text-sm text-slate-500">
                          {formatDateTime(event.effectiveAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fcfcfb] p-6 text-sm text-slate-500">
                  No status events yet.
                </div>
              )}
            </div>
          </SectionCard>
        </div>
      </section>

      <SectionCard
        title="Internal jobs"
        description="Jobs that can be routed to internal capacity before outsourcing."
        action={
          <span className="rounded-full border border-zinc-200 bg-[#fcfcfb] px-4 py-2 text-sm font-medium text-slate-600">
            {jobs.length} total
          </span>
        }
      >
        <div className="space-y-4">
          {jobs.length > 0 ? (
            jobs.map((job) => <JobRow key={job.id} job={job} />)
          ) : (
            <div className="rounded-[24px] border border-dashed border-zinc-300 bg-[#fcfcfb] p-6 text-sm text-slate-500">
              No internal jobs yet.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
import Link from "next/link";
import AddCapabilityForm from "../AddCapabilityForm";
import AddResourceForm from "../AddResourceForm";
import MapCapabilityForm from "../MapCapabilityForm";
import { loadInternalManufacturingData } from "../loadInternalManufacturingData";

export const dynamic = "force-dynamic";

function SetupStat(props: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-[24px] border border-zinc-200 bg-[#fcfcfb] p-5">
      <div className="text-sm font-medium text-slate-600">{props.label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-[#0b1633]">
        {props.value}
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{props.hint}</p>
    </div>
  );
}

export default async function InternalManufacturingSetupPage() {
  const data = await loadInternalManufacturingData();
  const { organization, resources, capabilities, errors } = data;

  const canManage =
    organization?.organizationType === "customer" &&
    organization?.membershipRole === "admin";

  return (
    <div className="space-y-8">
      <section className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
              Internal Manufacturing Setup
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[#0b1633]">
              Manage resources & capabilities
            </h1>
            <p className="mt-4 max-w-3xl text-[16px] leading-8 text-slate-600">
              Configure the internal factory model that powers internal routing,
              future scheduling, and machine integration readiness.
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

            <Link
              href="/dashboard/internal-manufacturing"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-[#fcfcfb] px-5 py-3 text-sm font-semibold text-[#0b1633] transition hover:bg-zinc-50"
            >
              Back to overview
            </Link>
          </div>
        </div>

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

      <section className="grid gap-5 md:grid-cols-3">
        <SetupStat
          label="Resources"
          value={resources.length}
          hint="Machines, work cells, operators, and other internal capacity."
        />
        <SetupStat
          label="Capabilities"
          value={capabilities.length}
          hint="Process and material capabilities available inside your organization."
        />
        <SetupStat
          label="Mappings"
          value={resources.reduce((sum, item) => sum + item.capabilityCount, 0)}
          hint="Current resource-to-capability links used for routing and planning."
        />
      </section>

      {canManage ? (
        <>
          <section className="grid gap-8 xl:grid-cols-2">
            <AddResourceForm organizationId={organization.id} />
            <AddCapabilityForm organizationId={organization.id} />
          </section>

          <section className="grid gap-8 xl:grid-cols-2">
            <MapCapabilityForm resources={resources} capabilities={capabilities} />

            <div className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
              <div>
                <h3 className="text-[20px] font-semibold tracking-tight text-[#0b1633]">
                  Next setup steps
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  This setup workspace is the right home for the remaining factory
                  configuration pieces.
                </p>
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[22px] border border-zinc-200 bg-[#fcfcfb] p-4">
                  <div className="text-[16px] font-semibold text-[#0b1633]">
                    Manual status tools
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Add contextual resource status updates without cluttering the
                    overview page.
                  </p>
                </div>

                <div className="rounded-[22px] border border-zinc-200 bg-[#fcfcfb] p-4">
                  <div className="text-[16px] font-semibold text-[#0b1633]">
                    Constraints & materials
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Define supported materials, size limits, tolerances, and other
                    planning constraints.
                  </p>
                </div>

                <div className="rounded-[22px] border border-zinc-200 bg-[#fcfcfb] p-4">
                  <div className="text-[16px] font-semibold text-[#0b1633]">
                    Live integrations
                  </div>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    Later connect supported printers and factory systems for live
                    status, queue, and utilization updates.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[28px] border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-[18px] font-semibold text-[#0b1633]">
            Management actions unavailable
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            Only customer organization admins can manage internal resources and
            capability mappings from this page.
          </p>
        </section>
      )}
    </div>
  );
}
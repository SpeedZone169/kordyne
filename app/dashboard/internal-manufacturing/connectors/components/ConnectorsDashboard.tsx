"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { InternalResourceConnectionsData } from "../types";
import type { InternalManufacturingCapability } from "../../types";
import MachineActionPanel from "./MachineActionPanel";
import CredentialProfilesPanel from "./CredentialProfilesPanel";
import {
  type FleetCategory,
  type ViewMode,
  buildMachineRow,
  formatLabel,
} from "./connectorUi";
import MachineGrid from "./MachineGrid";
import MachineTable from "./MachineTable";

type Props = {
  data: InternalResourceConnectionsData;
  capabilities?: InternalManufacturingCapability[];
};

function getDefaultOrganizationId(
  data: InternalResourceConnectionsData,
  selectedResourceId: string | null,
) {
  const selectedResource =
    data.resources.find((resource) => resource.id === selectedResourceId) ?? null;

  return (
    selectedResource?.organizationId ??
    data.resources[0]?.organizationId ??
    data.credentialProfiles[0]?.organizationId ??
    null
  );
}

function sideButtonClasses(active: boolean) {
  return active
    ? "bg-[#234f90] text-white border border-[#3566b2]"
    : "bg-transparent text-slate-300 border border-transparent hover:bg-white/[0.04] hover:text-white";
}

function providerPillClasses(active: boolean) {
  return active
    ? "bg-[#234f90] text-white border border-[#3566b2]"
    : "bg-white/[0.04] text-slate-300 border border-white/10 hover:bg-white/[0.08]";
}

function darkInputClasses() {
  return "w-full rounded-[10px] border border-white/10 bg-[#0b1628] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/10";
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/10 bg-[#111e32] px-5 py-4 shadow-[0_10px_24px_rgba(2,8,23,0.22)]">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {title}
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-400">{subtitle}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function ConnectorsDashboard({
  data,
  capabilities = [],
}: Props) {
  const router = useRouter();

  const connectionsByResourceId = useMemo(() => {
    const map = new Map<string, (typeof data.connections)[number]>();

    for (const connection of data.connections) {
      if (connection.resourceId) {
        map.set(connection.resourceId, connection);
      }
    }

    return map;
  }, [data.connections]);

  const machines = useMemo(
    () =>
      data.resources.map((resource) =>
        buildMachineRow(resource, connectionsByResourceId.get(resource.id) ?? null),
      ),
    [data.resources, connectionsByResourceId],
  );

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    machines.find((machine) => machine.connection)?.resource.id ??
      machines[0]?.resource.id ??
      null,
  );

  const [activeCategory, setActiveCategory] =
    useState<FleetCategory>("All equipment");
  const [activeProvider, setActiveProvider] = useState<string>("All providers");
  const [activeStatus, setActiveStatus] = useState<string>("All statuses");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  useEffect(() => {
    if (
      selectedResourceId &&
      machines.some((machine) => machine.resource.id === selectedResourceId)
    ) {
      return;
    }

    setSelectedResourceId(
      machines.find((machine) => machine.connection)?.resource.id ??
        machines[0]?.resource.id ??
        null,
    );
  }, [machines, selectedResourceId]);

  const filteredMachines = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return machines.filter((machine) => {
      if (activeCategory !== "All equipment" && machine.category !== activeCategory) {
        return false;
      }

      if (activeProvider !== "All providers" && machine.providerLabel !== activeProvider) {
        return false;
      }

      if (activeStatus !== "All statuses" && machine.currentStatus !== activeStatus) {
        return false;
      }

      if (!normalizedSearch) return true;

      const searchable = [
        machine.resource.name,
        machine.connection?.displayName ?? "",
        machine.externalMachineLabel ?? "",
        machine.providerLabel,
        machine.technology,
        machine.location,
        machine.currentJobName ?? "",
        machine.currentMaterial ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(normalizedSearch);
    });
  }, [activeCategory, activeProvider, activeStatus, machines, search]);

  const selectedMachine =
    filteredMachines.find((machine) => machine.resource.id === selectedResourceId) ??
    machines.find((machine) => machine.resource.id === selectedResourceId) ??
    null;

  const providers = useMemo(
    () => [...new Set(machines.map((machine) => machine.providerLabel))].sort(),
    [machines],
  );

  const connectedCount = machines.filter((machine) => machine.connection).length;
  const runningCount = machines.filter((machine) => machine.currentStatus === "running").length;
  const idleCount = machines.filter((machine) => machine.currentStatus === "idle").length;
  const attentionCount = machines.filter(
    (machine) =>
      machine.currentStatus === "blocked" ||
      machine.currentStatus === "offline" ||
      machine.currentStatus === "maintenance" ||
      machine.connection?.lastSyncStatus === "error",
  ).length;

  const selectedConnection = selectedMachine?.connection ?? null;

  return (
    <div className="min-h-[calc(100vh-88px)] w-full bg-[#09111d]">
      <div className="w-full px-4 py-5 xl:px-6 2xl:px-8">
        <div className="grid min-h-[calc(100vh-128px)] gap-0 overflow-hidden rounded-[20px] border border-white/10 bg-[#08111f] shadow-[0_24px_60px_rgba(2,8,23,0.34)] xl:grid-cols-[220px_minmax(0,1fr)_400px] 2xl:grid-cols-[240px_minmax(0,1fr)_420px]">
          <aside className="border-r border-white/10 bg-[#091523] px-4 py-5">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#17355e] text-lg font-bold text-sky-300">
                K
              </div>
              <div>
                <div className="text-lg font-semibold tracking-wide text-white">
                  KORDYNE
                </div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Fleet command
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Categories
              </div>

              <div className="mt-3 space-y-2">
                {(
                  [
                    "All equipment",
                    "3D printers",
                    "CNC",
                    "Inspection & QA",
                    "Finishing",
                    "General",
                  ] as FleetCategory[]
                ).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={`flex w-full items-center justify-between rounded-[12px] px-4 py-3 text-left text-sm transition ${sideButtonClasses(
                      activeCategory === category,
                    )}`}
                  >
                    <span>{category}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        activeCategory === category
                          ? "bg-white/15 text-white"
                          : "bg-white/[0.05] text-slate-400"
                      }`}
                    >
                      {category === "All equipment"
                        ? machines.length
                        : machines.filter((m) => m.category === category).length}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Providers
              </div>

              <div className="mt-3 flex flex-wrap gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setActiveProvider("All providers")}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition ${providerPillClasses(
                    activeProvider === "All providers",
                  )}`}
                >
                  All providers
                </button>

                {providers.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setActiveProvider(provider)}
                    className={`rounded-full px-3 py-2 text-xs font-medium transition ${providerPillClasses(
                      activeProvider === provider,
                    )}`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18),_transparent_34%),linear-gradient(180deg,_#08111f_0%,_#0a1424_100%)] px-5 py-5 2xl:px-6">
            <section className="rounded-[20px] border border-white/10 bg-[#0c1728] px-6 py-6 shadow-[0_18px_40px_rgba(2,8,23,0.32)]">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                    Internal connectors
                  </div>
                  <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
                    Dashboard
                  </h1>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                    Connect provider accounts, discover one or many machines, and manage
                    machine health from a cleaner operational workspace.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/internal-manufacturing"
                    className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Back to overview
                  </Link>
                  <Link
                    href="/dashboard/internal-manufacturing/setup"
                    className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Setup
                  </Link>
                  <Link
                    href="/dashboard/internal-manufacturing/schedule"
                    className="rounded-full bg-[#2472ef] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3380fb]"
                  >
                    Schedule
                  </Link>
                </div>
              </div>

              {data.errors.length > 0 ? (
                <div className="mt-5 rounded-[14px] border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                  <div className="text-sm font-semibold text-amber-300">
                    Some connector data could not be loaded completely.
                  </div>
                  <div className="mt-2 space-y-1 text-sm text-amber-200">
                    {data.errors.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Fleet Status" value={connectedCount} subtitle="Connected devices" />
              <StatCard title="Active Prints" value={runningCount} subtitle="Running now" />
              <StatCard title="Idle" value={idleCount} subtitle="Ready for work" />
              <StatCard title="API Health" value={attentionCount} subtitle="Need attention" />
            </section>

            <section className="mt-5 rounded-[20px] border border-white/10 bg-[#0c1728] p-6 shadow-[0_18px_40px_rgba(2,8,23,0.32)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-white">
                    Active machines
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-400">
                    Browse machine state, provider health, and connection status in one place.
                  </p>
                </div>

                <div className="flex rounded-full border border-white/10 bg-white/[0.05] p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      viewMode === "grid"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      viewMode === "table"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-300"
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px]">
                <Field label="Search">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search machine, provider, material, job..."
                    className={darkInputClasses()}
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={activeStatus}
                    onChange={(event) => setActiveStatus(event.target.value)}
                    className={darkInputClasses()}
                  >
                    <option value="All statuses">All statuses</option>
                    {[
                      "idle",
                      "queued",
                      "running",
                      "paused",
                      "blocked",
                      "maintenance",
                      "offline",
                      "complete",
                    ].map((status) => (
                      <option key={status} value={status}>
                        {formatLabel(status)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Reset">
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("All equipment");
                      setActiveProvider("All providers");
                      setActiveStatus("All statuses");
                    }}
                    className="inline-flex w-full items-center justify-center rounded-[10px] border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-medium text-white transition hover:bg-white/[0.08]"
                  >
                    Reset filters
                  </button>
                </Field>
              </div>

              <div className="mt-5 text-sm text-slate-400">
                Showing{" "}
                <span className="font-semibold text-white">{filteredMachines.length}</span>{" "}
                machine{filteredMachines.length === 1 ? "" : "s"}
              </div>

              {filteredMachines.length === 0 ? (
                <div className="mt-5 rounded-[16px] border border-dashed border-white/10 bg-white/[0.03] px-6 py-12 text-center text-sm text-slate-400">
                  No machines match the current filters.
                </div>
              ) : viewMode === "grid" ? (
                <MachineGrid
                  filteredMachines={filteredMachines}
                  selectedResourceId={selectedResourceId}
                  setSelectedResourceId={setSelectedResourceId}
                />
              ) : (
                <MachineTable
                  filteredMachines={filteredMachines}
                  selectedResourceId={selectedResourceId}
                  setSelectedResourceId={setSelectedResourceId}
                />
              )}
            </section>
          </main>

          <aside className="border-l border-white/10 bg-[#0b1626] px-5 py-5">
            <section className="rounded-[20px] border border-white/10 bg-[#0d192b] p-5 shadow-[0_18px_40px_rgba(2,8,23,0.28)]">
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500">
                Add new device
              </div>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Connector workspace
              </h3>
              <p className="mt-2 text-sm leading-7 text-slate-400">
                Connect a provider, discover machines, and link them cleanly to internal resources.
              </p>
            </section>

            <div className="mt-5 space-y-5">
              {data.canManageConnectors ? (
                <>
                  <MachineActionPanel
                    resource={selectedMachine?.resource ?? null}
                    existingConnection={selectedConnection}
                    resources={data.resources}
                    credentialProfiles={data.credentialProfiles}
                    capabilities={capabilities}
                    selectedResourceId={selectedResourceId}
                    onSelectedResourceChange={setSelectedResourceId}
                    defaultOrganizationId={getDefaultOrganizationId(data, selectedResourceId)}
                    onSaved={() => router.refresh()}
                    onDeleted={() => router.refresh()}
                  />

                  <CredentialProfilesPanel
                    organizationId={getDefaultOrganizationId(data, selectedResourceId)}
                    profiles={data.credentialProfiles}
                    onSaved={() => router.refresh()}
                  />
                </>
              ) : (
                <div className="rounded-[20px] border border-white/10 bg-[#0d192b] p-6 shadow-[0_18px_40px_rgba(2,8,23,0.28)]">
                  <div className="text-sm text-slate-300">
                    You are signed in as{" "}
                    <span className="font-semibold text-white">
                      {data.viewerRole ?? "viewer"}
                    </span>
                    . Connector setup and provider credentials can be managed only by
                    organization admins.
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
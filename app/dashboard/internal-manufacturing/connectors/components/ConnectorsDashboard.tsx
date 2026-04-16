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

function SidebarButton({
  active,
  label,
  count,
  onClick,
  theme,
}: {
  active: boolean;
  label: string;
  count?: number;
  onClick: () => void;
  theme: "dark" | "light";
}) {
  const dark = theme === "dark";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-sm transition ${
        active
          ? dark
            ? "bg-[#2a5ca3] text-white"
            : "bg-[#0b1633] text-white"
          : dark
            ? "text-slate-300 hover:bg-white/5 hover:text-white"
            : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" ? (
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] ${
            active
              ? dark
                ? "bg-white/15 text-white"
                : "bg-white/15 text-white"
              : dark
                ? "bg-white/5 text-slate-400"
                : "bg-slate-100 text-slate-500"
          }`}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  theme,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  theme: "dark" | "light";
}) {
  const dark = theme === "dark";

  return (
    <div
      className={`rounded-2xl border px-5 py-4 ${
        dark
          ? "border-white/10 bg-[#0f1e34] shadow-[0_10px_30px_rgba(2,8,23,0.25)]"
          : "border-slate-200 bg-white shadow-sm"
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
          dark ? "text-slate-400" : "text-slate-400"
        }`}
      >
        {title}
      </div>
      <div
        className={`mt-3 text-3xl font-semibold tracking-tight ${
          dark ? "text-white" : "text-slate-950"
        }`}
      >
        {value}
      </div>
      <div className={`mt-1 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
        {subtitle}
      </div>
    </div>
  );
}

function SectionField({
  label,
  children,
  theme,
}: {
  label: string;
  children: React.ReactNode;
  theme: "dark" | "light";
}) {
  return (
    <div className="space-y-2">
      <label
        className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
          theme === "dark" ? "text-slate-500" : "text-slate-400"
        }`}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function themedInputClasses(theme: "dark" | "light") {
  return theme === "dark"
    ? "w-full rounded-xl border border-white/10 bg-[#0d192c] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-500/40 focus:ring-4 focus:ring-sky-500/10"
    : "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0b1633]/20 focus:ring-4 focus:ring-[#0b1633]/5";
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
  const [contentTheme, setContentTheme] = useState<"dark" | "light">("dark");

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

  const dark = contentTheme === "dark";
  const selectedConnection = selectedMachine?.connection ?? null;

  return (
    <div
      className={`min-h-[calc(100vh-90px)] w-full ${
        dark
          ? "bg-[#07101d]"
          : "bg-[#f4f7fb]"
      }`}
    >
      <div className="mx-auto w-full max-w-[1800px] px-6 py-6 xl:px-8">
        <div className="mb-4 flex items-center justify-end">
          <div
            className={`inline-flex rounded-full border p-1 ${
              dark
                ? "border-white/10 bg-white/5"
                : "border-slate-200 bg-white"
            }`}
          >
            <button
              type="button"
              onClick={() => setContentTheme("dark")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                dark
                  ? "bg-[#1f6feb] text-white"
                  : "text-slate-600"
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setContentTheme("light")}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !dark
                  ? "bg-[#0b1633] text-white"
                  : "text-slate-300"
              }`}
            >
              Light
            </button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[250px_minmax(0,1fr)_420px]">
          <aside
            className={`rounded-[28px] border px-5 py-6 ${
              dark
                ? "border-white/10 bg-[#091423]"
                : "border-slate-200 bg-white shadow-sm"
            }`}
          >
            <div className="flex items-center gap-3 px-2">
              <div
                className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${
                  dark
                    ? "bg-[#16345c] text-sky-300"
                    : "bg-[#0b1633] text-white"
                }`}
              >
                K
              </div>
              <div>
                <div className={`text-lg font-semibold tracking-wide ${dark ? "text-white" : "text-slate-950"}`}>
                  KORDYNE
                </div>
                <div className={`text-[11px] uppercase tracking-[0.24em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
                  Fleet command
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
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
                  <SidebarButton
                    key={category}
                    active={activeCategory === category}
                    label={category}
                    count={
                      category === "All equipment"
                        ? machines.length
                        : machines.filter((m) => m.category === category).length
                    }
                    onClick={() => setActiveCategory(category)}
                    theme={contentTheme}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className={`px-2 text-[11px] font-semibold uppercase tracking-[0.24em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
                Providers
              </div>

              <div className="mt-3 flex flex-wrap gap-2 px-2">
                <button
                  type="button"
                  onClick={() => setActiveProvider("All providers")}
                  className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                    activeProvider === "All providers"
                      ? dark
                        ? "bg-[#2a5ca3] text-white"
                        : "bg-[#0b1633] text-white"
                      : dark
                        ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  All providers
                </button>

                {providers.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => setActiveProvider(provider)}
                    className={`rounded-full px-3 py-2 text-xs font-medium transition ${
                      activeProvider === provider
                        ? dark
                          ? "bg-[#2a5ca3] text-white"
                          : "bg-[#0b1633] text-white"
                        : dark
                          ? "border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {provider}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <main className="space-y-6">
            <section
              className={`rounded-[28px] border px-6 py-6 ${
                dark
                  ? "border-white/10 bg-[radial-gradient(circle_at_top,_rgba(30,64,175,0.18),_transparent_35%),linear-gradient(180deg,_#08111f_0%,_#0a1526_100%)] shadow-[0_20px_50px_rgba(2,8,23,0.45)]"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
                    Internal connectors
                  </div>
                  <h1 className={`mt-3 text-4xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>
                    Dashboard
                  </h1>
                  <p className={`mt-3 max-w-3xl text-sm leading-7 ${dark ? "text-slate-400" : "text-slate-600"}`}>
                    Connect provider accounts, discover one or many machines, and manage
                    machine health from a cleaner operational workspace.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/dashboard/internal-manufacturing"
                    className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                      dark
                        ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Back to overview
                  </Link>
                  <Link
                    href="/dashboard/internal-manufacturing/setup"
                    className={`rounded-full px-5 py-3 text-sm font-medium transition ${
                      dark
                        ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Setup
                  </Link>
                  <Link
                    href="/dashboard/internal-manufacturing/schedule"
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                      dark
                        ? "bg-[#1f6feb] text-white hover:bg-[#2b7cff]"
                        : "bg-[#0b1633] text-white hover:bg-[#13224a]"
                    }`}
                  >
                    Schedule
                  </Link>
                </div>
              </div>

              {data.errors.length > 0 ? (
                <div className={`mt-5 rounded-2xl px-4 py-3 ${
                  dark
                    ? "border border-amber-500/20 bg-amber-500/10"
                    : "border border-amber-200 bg-amber-50"
                }`}>
                  <div className={`text-sm font-semibold ${dark ? "text-amber-300" : "text-amber-800"}`}>
                    Some connector data could not be loaded completely.
                  </div>
                  <div className={`mt-2 space-y-1 text-sm ${dark ? "text-amber-200" : "text-amber-700"}`}>
                    {data.errors.map((error) => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Fleet Status" value={connectedCount} subtitle="Connected devices" theme={contentTheme} />
              <StatCard title="Active Prints" value={runningCount} subtitle="Running now" theme={contentTheme} />
              <StatCard title="Idle" value={idleCount} subtitle="Ready for work" theme={contentTheme} />
              <StatCard title="API Health" value={attentionCount} subtitle="Need attention" theme={contentTheme} />
            </section>

            <section
              className={`rounded-[28px] border p-6 ${
                dark
                  ? "border-white/10 bg-[linear-gradient(180deg,_#0c1728_0%,_#0a1422_100%)] shadow-[0_20px_50px_rgba(2,8,23,0.45)]"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <h2 className={`text-3xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>
                    Active machines
                  </h2>
                  <p className={`mt-2 text-sm leading-7 ${dark ? "text-slate-400" : "text-slate-600"}`}>
                    Browse machine state, provider health, and connection status in one place.
                  </p>
                </div>

                <div
                  className={`flex rounded-full border p-1 ${
                    dark
                      ? "border-white/10 bg-white/5"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      viewMode === "grid"
                        ? dark
                          ? "bg-white text-slate-950 shadow-sm"
                          : "bg-white text-slate-950 shadow-sm"
                        : dark
                          ? "text-slate-300"
                          : "text-slate-600"
                    }`}
                  >
                    Grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("table")}
                    className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                      viewMode === "table"
                        ? dark
                          ? "bg-white text-slate-950 shadow-sm"
                          : "bg-white text-slate-950 shadow-sm"
                        : dark
                          ? "text-slate-300"
                          : "text-slate-600"
                    }`}
                  >
                    Table
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_220px_220px]">
                <SectionField label="Search" theme={contentTheme}>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search machine, provider, material, job..."
                    className={themedInputClasses(contentTheme)}
                  />
                </SectionField>

                <SectionField label="Status" theme={contentTheme}>
                  <select
                    value={activeStatus}
                    onChange={(event) => setActiveStatus(event.target.value)}
                    className={themedInputClasses(contentTheme)}
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
                </SectionField>

                <SectionField label="Reset" theme={contentTheme}>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      setActiveCategory("All equipment");
                      setActiveProvider("All providers");
                      setActiveStatus("All statuses");
                    }}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition ${
                      dark
                        ? "border border-white/10 bg-white/5 text-white hover:bg-white/10"
                        : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    Reset filters
                  </button>
                </SectionField>
              </div>

              <div className={`mt-5 text-sm ${dark ? "text-slate-400" : "text-slate-500"}`}>
                Showing{" "}
                <span className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                  {filteredMachines.length}
                </span>{" "}
                machine{filteredMachines.length === 1 ? "" : "s"}
              </div>

              {filteredMachines.length === 0 ? (
                <div
                  className={`mt-5 rounded-3xl px-6 py-12 text-center text-sm ${
                    dark
                      ? "border border-dashed border-white/10 bg-white/[0.03] text-slate-400"
                      : "border border-dashed border-slate-300 bg-slate-50 text-slate-600"
                  }`}
                >
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

          <aside className="space-y-5">
            <section
              className={`rounded-[28px] border p-5 ${
                dark
                  ? "border-white/10 bg-[linear-gradient(180deg,_#0c1728_0%,_#0a1422_100%)] shadow-[0_20px_50px_rgba(2,8,23,0.35)]"
                  : "border-slate-200 bg-white shadow-sm"
              }`}
            >
              <div className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${dark ? "text-slate-500" : "text-slate-400"}`}>
                Add new device
              </div>
              <h3 className={`mt-2 text-2xl font-semibold tracking-tight ${dark ? "text-white" : "text-slate-950"}`}>
                Connector workspace
              </h3>
              <p className={`mt-2 text-sm leading-7 ${dark ? "text-slate-400" : "text-slate-600"}`}>
                Connect a provider, discover machines, and link them cleanly to internal resources.
              </p>
            </section>

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
              <div
                className={`rounded-[28px] border p-6 ${
                  dark
                    ? "border-white/10 bg-[#0f1b2d] shadow-[0_20px_50px_rgba(2,8,23,0.35)]"
                    : "border-slate-200 bg-white shadow-sm"
                }`}
              >
                <div className={`text-sm ${dark ? "text-slate-300" : "text-slate-600"}`}>
                  You are signed in as{" "}
                  <span className={`font-semibold ${dark ? "text-white" : "text-slate-900"}`}>
                    {data.viewerRole ?? "viewer"}
                  </span>
                  . Connector setup and provider credentials can be managed only by
                  organization admins.
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
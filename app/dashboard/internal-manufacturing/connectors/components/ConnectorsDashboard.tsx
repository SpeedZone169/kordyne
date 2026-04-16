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
  inputClasses,
} from "./connectorUi";
import { Field } from "./uiBits";
import MachineStats from "./MachineStats";
import ConnectorsSidebar from "./ConnectorsSidebar";
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

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-slate-200 bg-white px-7 py-7 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Internal connectors
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Fleet command
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              Connect provider accounts, discover one or many machines, and manage
              machine health from a cleaner operational workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/internal-manufacturing"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Back to overview
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/setup"
              className="rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Setup
            </Link>
            <Link
              href="/dashboard/internal-manufacturing/schedule"
              className="rounded-full bg-[#0b1633] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#13224a]"
            >
              Schedule
            </Link>
          </div>
        </div>

        {data.errors.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <div className="text-sm font-semibold text-amber-800">
              Some connector data could not be loaded completely.
            </div>
            <div className="mt-2 space-y-1 text-sm text-amber-700">
              {data.errors.map((error) => (
                <div key={error}>{error}</div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1.6fr)_360px]">
        <ConnectorsSidebar
          machinesLength={machines.length}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          providers={providers}
          activeProvider={activeProvider}
          setActiveProvider={setActiveProvider}
          machines={machines}
        />

        <section className="space-y-5">
          <MachineStats
            connectedCount={connectedCount}
            runningCount={runningCount}
            idleCount={idleCount}
            attentionCount={attentionCount}
          />

          <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-950">
                  Active machines
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Browse machine state, provider health, and connection status in one
                  place.
                </p>
              </div>

              <div className="flex rounded-full border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    viewMode === "grid"
                      ? "bg-white text-slate-950 shadow-sm"
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
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-600"
                  }`}
                >
                  Table
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(180px,220px)_minmax(180px,220px)]">
              <Field label="Search">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search machine, provider, material, job..."
                  className={inputClasses()}
                />
              </Field>

              <Field label="Status">
                <select
                  value={activeStatus}
                  onChange={(event) => setActiveStatus(event.target.value)}
                  className={inputClasses()}
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
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Reset filters
                </button>
              </Field>
            </div>

            <div className="mt-5 text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-900">{filteredMachines.length}</span>{" "}
              machine{filteredMachines.length === 1 ? "" : "s"}
            </div>

            {filteredMachines.length === 0 ? (
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-600">
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
          </div>
        </section>

        <aside className="space-y-5 xl:sticky xl:top-6 xl:self-start">
          {data.canManageConnectors ? (
            <>
              <MachineActionPanel
                resource={selectedMachine?.resource ?? null}
                existingConnection={selectedMachine?.connection ?? null}
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
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-600">
                You are signed in as{" "}
                <span className="font-semibold text-slate-900">
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
  );
}
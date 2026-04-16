"use client";

import type { InternalResourceConnection } from "../types";
import {
  formatDateTime,
  formatLabel,
  getStatusBadgeClasses,
} from "./connectorUi";

type MachineTableItem = {
  resource: { id: string; name: string };
  connection: Pick<
    InternalResourceConnection,
    "displayName" | "lastSyncAt"
  > | null;
  providerLabel: string;
  technology: string;
  currentStatus: string;
  externalMachineLabel: string | null;
  currentMaterial: string | null;
  currentJobName: string | null;
  rawVendorStatus: string | null;
};

export default function MachineTable({
  filteredMachines,
  selectedResourceId,
  setSelectedResourceId,
}: {
  filteredMachines: MachineTableItem[];
  selectedResourceId: string | null;
  setSelectedResourceId: (value: string) => void;
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="min-w-full border-separate border-spacing-y-2">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-slate-400">
            <th className="px-4 py-2">Machine</th>
            <th className="px-4 py-2">Provider</th>
            <th className="px-4 py-2">Technology</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Vendor</th>
            <th className="px-4 py-2">Job</th>
            <th className="px-4 py-2">Material</th>
            <th className="px-4 py-2">Last sync</th>
          </tr>
        </thead>
        <tbody>
          {filteredMachines.map((machine) => {
            const selected = selectedResourceId === machine.resource.id;

            return (
              <tr
                key={machine.resource.id}
                onClick={() => setSelectedResourceId(machine.resource.id)}
                className={`cursor-pointer ${selected ? "text-white" : "text-slate-900"}`}
              >
                <td
                  className={`rounded-l-3xl px-4 py-4 ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  <div className="font-semibold">
                    {machine.connection?.displayName ?? machine.resource.name}
                  </div>
                  <div
                    className={`mt-1 text-xs ${
                      selected ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {machine.externalMachineLabel ?? machine.resource.name}
                  </div>
                </td>

                <td
                  className={`px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {machine.providerLabel}
                </td>

                <td
                  className={`px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {machine.technology}
                </td>

                <td
                  className={`px-4 py-4 ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                      selected
                        ? "bg-white/10 text-white"
                        : getStatusBadgeClasses(machine.currentStatus)
                    }`}
                  >
                    {formatLabel(machine.currentStatus)}
                  </span>
                </td>

                <td
                  className={`px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {machine.rawVendorStatus ?? "—"}
                </td>

                <td
                  className={`px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {machine.currentJobName ?? "—"}
                </td>

                <td
                  className={`px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {machine.currentMaterial ?? "—"}
                </td>

                <td
                  className={`rounded-r-3xl px-4 py-4 text-sm ${
                    selected ? "bg-[#0f172a]" : "bg-white"
                  }`}
                >
                  {formatDateTime(machine.connection?.lastSyncAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
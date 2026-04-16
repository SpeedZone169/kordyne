import type { InternalConnectorProviderKey, InternalConnectorResource } from "../types";
import type { DiscoveredMachine } from "./connectorUi";

export function inferCapabilitySeed(machine: DiscoveredMachine) {
  const technology = getDiscoveredMachineTechnology(machine);
  const lower = technology.toLowerCase();

  if (lower.includes("sla")) {
    return { code: "sla", name: "SLA Printing", serviceDomain: "additive" };
  }

  if (lower.includes("sls")) {
    return { code: "sls", name: "SLS Printing", serviceDomain: "additive" };
  }

  if (lower.includes("fdm") || lower.includes("fff")) {
    return { code: "fdm", name: "FDM Printing", serviceDomain: "additive" };
  }

  if (lower.includes("composite")) {
    return {
      code: "composite_fff",
      name: "Composite / FFF Printing",
      serviceDomain: "additive",
    };
  }

  if (lower.includes("scanning")) {
    return { code: "scanning", name: "Scanning", serviceDomain: "scanning" };
  }

  if (lower.includes("cnc")) {
    return { code: "cnc", name: "CNC Machining", serviceDomain: "cnc" };
  }

  return {
    code: "additive",
    name: "Additive Manufacturing",
    serviceDomain: "additive",
  };
}

export function getDiscoveredMachineId(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") return machine.item.serial;
  return machine.item.id;
}

export function getDiscoveredMachineName(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return machine.item.alias || machine.item.serial;
  }

  return machine.item.name;
}

export function getDiscoveredMachineModel(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") return machine.item.machineTypeId;
  if (machine.providerKey === "ultimaker") return machine.item.printerType;
  return machine.item.model;
}

export function getDiscoveredMachineTechnology(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    const value = (machine.item.machineTypeId || "").toLowerCase();
    if (value.includes("form")) return "SLA";
    if (value.includes("fuse")) return "SLS";
    return "Additive";
  }

  if (machine.providerKey === "ultimaker") return machine.item.technology || "FDM";
  if (machine.providerKey === "markforged") return machine.item.technology || "Composite / FFF";
  return machine.item.technology || "Additive";
}

export function getDiscoveredMachineStatus(machine: DiscoveredMachine) {
  return machine.item.mappedStatus;
}

export function getDiscoveredMachineSubtitle(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return `${machine.item.serial} · ${machine.item.machineTypeId || "Unknown model"}`;
  }

  if (machine.providerKey === "ultimaker") {
    return `${machine.item.id} · ${machine.item.printerType || "Ultimaker cluster"}`;
  }

  if (machine.providerKey === "markforged") {
    return `${machine.item.serial || machine.item.id} · ${machine.item.model || "Markforged device"}`;
  }

  return `${machine.item.serial || machine.item.id} · ${machine.item.model || "Stratasys machine"}`;
}

export function getDiscoveredMachineMetaLines(machine: DiscoveredMachine) {
  if (machine.providerKey === "formlabs") {
    return [
      `Status: ${machine.item.rawStatus || "—"}`,
      `Group: ${machine.item.groupName || "—"}`,
      `Material: ${machine.item.currentPrintMaterial || "—"}`,
      `Last ping: ${formatDateTime(machine.item.lastPingedAt)}`,
    ];
  }

  if (machine.providerKey === "ultimaker") {
    return [
      `Cluster: ${machine.item.clusterName || machine.item.clusterId}`,
      `Technology: ${machine.item.technology || "—"}`,
      `Material: ${machine.item.material || "—"}`,
      `Status: ${machine.item.rawStatus || "—"}`,
    ];
  }

  if (machine.providerKey === "markforged") {
    return [
      `Serial: ${machine.item.serial || "—"}`,
      `Technology: ${machine.item.technology || "—"}`,
      `Location: ${machine.item.locationName || "—"}`,
      `Job: ${machine.item.currentJobName || "—"}`,
    ];
  }

  return [
    `Serial: ${machine.item.serial || "—"}`,
    `Technology: ${machine.item.technology || "—"}`,
    `Location: ${machine.item.locationName || "—"}`,
    `Job: ${machine.item.currentJobName || "—"}`,
  ];
}

export function createAutoMetadata(machine: DiscoveredMachine): Record<string, unknown> {
  return {
    technology: getDiscoveredMachineTechnology(machine),
    model: getDiscoveredMachineModel(machine),
    providerDiscoveredName: getDiscoveredMachineName(machine),
    providerDiscoveredId: getDiscoveredMachineId(machine),
    discoveredFrom: machine.providerKey,
  };
}

export function createDefaultDisplayName(
  resource: InternalConnectorResource | null,
  machine: DiscoveredMachine | null,
  providerKey: InternalConnectorProviderKey,
) {
  if (machine && resource?.name) {
    return `${resource.name} · ${getDiscoveredMachineName(machine)}`;
  }

  if (machine) {
    return getDiscoveredMachineName(machine);
  }

  if (resource) {
    return `${resource.name} Connector`;
  }

  return `${formatProviderLabel(providerKey)} Connector`;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatProviderLabel(value: string) {
  if (value === "mtconnect") return "MTConnect";
  if (value === "opc_ua") return "OPC UA";
  return formatLabel(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
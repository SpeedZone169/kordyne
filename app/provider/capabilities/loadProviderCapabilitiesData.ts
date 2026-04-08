import { loadProviderDashboardData } from "../loadProviderDashboardData";
import { createClient } from "@/lib/supabase/server";
import type { ProviderCapabilityRow } from "../types";
import type {
  ProviderCapabilitiesData,
  ProviderCapabilitiesWorkCenter,
} from "./types";

type WorkCenterRow = {
  id: string;
  provider_org_id: string;
  name: string;
  code: string | null;
  center_type: string;
  description: string | null;
  location_label: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type WorkCenterCapabilityRow = {
  provider_work_center_id: string;
  provider_capability_id: string;
};

export async function loadProviderCapabilitiesData(): Promise<ProviderCapabilitiesData> {
  const supabase = await createClient();
  const dashboardData = await loadProviderDashboardData();

  if (!dashboardData.organization) {
    return {
      organization: null,
      capabilities: [],
      workCenters: [],
      stats: {
        activeCapabilityCount: 0,
        inactiveCapabilityCount: 0,
        processFamilyCount: 0,
        leadTimeNotesCount: 0,
        workCenterCount: 0,
        activeWorkCenterCount: 0,
        mappedWorkCenterCount: 0,
        unmappedCapabilityCount: 0,
      },
    };
  }

  const providerOrgId = dashboardData.organization.id;

  const { data: workCentersRaw, error: workCentersError } = await supabase
    .from("provider_work_centers")
    .select(
      "id, provider_org_id, name, code, center_type, description, location_label, active, created_at, updated_at",
    )
    .eq("provider_org_id", providerOrgId)
    .order("active", { ascending: false })
    .order("name", { ascending: true });

  if (workCentersError) {
    throw new Error(workCentersError.message);
  }

  const workCenterRows = (workCentersRaw ?? []) as WorkCenterRow[];
  const workCenterIds = workCenterRows.map((row) => row.id);

  let mappingRows: WorkCenterCapabilityRow[] = [];

  if (workCenterIds.length > 0) {
    const { data: mappingsRaw, error: mappingsError } = await supabase
      .from("provider_work_center_capabilities")
      .select("provider_work_center_id, provider_capability_id")
      .in("provider_work_center_id", workCenterIds);

    if (mappingsError) {
      throw new Error(mappingsError.message);
    }

    mappingRows = (mappingsRaw ?? []) as WorkCenterCapabilityRow[];
  }

  const capabilityMap = new Map<string, ProviderCapabilityRow>(
    dashboardData.capabilities.map((capability) => [capability.id, capability]),
  );

  const mappedCapabilityIdsByCenter = new Map<string, string[]>();

  for (const row of mappingRows) {
    const existing =
      mappedCapabilityIdsByCenter.get(row.provider_work_center_id) ?? [];
    existing.push(row.provider_capability_id);
    mappedCapabilityIdsByCenter.set(row.provider_work_center_id, existing);
  }

  const workCenters: ProviderCapabilitiesWorkCenter[] = workCenterRows.map(
    (row) => {
      const mappedCapabilityIds = mappedCapabilityIdsByCenter.get(row.id) ?? [];

      const mappedCapabilities = mappedCapabilityIds
        .map((capabilityId) => capabilityMap.get(capabilityId))
        .filter(
          (
            capability,
          ): capability is NonNullable<typeof capability> => Boolean(capability),
        )
        .map((capability) => ({
          id: capability.id,
          processFamily: capability.processFamily,
          processName: capability.processName,
          machineType: capability.machineType,
          active: capability.active,
        }));

      return {
        id: row.id,
        providerOrgId: row.provider_org_id,
        name: row.name,
        code: row.code,
        centerType: row.center_type,
        description: row.description,
        locationLabel: row.location_label,
        active: row.active,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        mappedCapabilities,
      };
    },
  );

  const processFamilyCount = new Set(
    dashboardData.capabilities
      .map((capability) => capability.processFamily)
      .filter(Boolean),
  ).size;

  const activeCapabilityCount = dashboardData.capabilities.filter(
    (capability) => capability.active,
  ).length;

  const inactiveCapabilityCount =
    dashboardData.capabilities.length - activeCapabilityCount;

  const leadTimeNotesCount = dashboardData.capabilities.filter((capability) =>
    Boolean(capability.leadTimeNotes?.trim()),
  ).length;

  const mappedCapabilityIds = new Set(
    mappingRows.map((row) => row.provider_capability_id),
  );

  const unmappedCapabilityCount = dashboardData.capabilities.filter(
    (capability) => capability.active && !mappedCapabilityIds.has(capability.id),
  ).length;

  const mappedWorkCenterCount = workCenters.filter(
    (workCenter) => workCenter.mappedCapabilities.length > 0,
  ).length;

  return {
    organization: dashboardData.organization,
    capabilities: dashboardData.capabilities,
    workCenters,
    stats: {
      activeCapabilityCount,
      inactiveCapabilityCount,
      processFamilyCount,
      leadTimeNotesCount,
      workCenterCount: workCenters.length,
      activeWorkCenterCount: workCenters.filter((center) => center.active).length,
      mappedWorkCenterCount,
      unmappedCapabilityCount,
    },
  };
}
import Client from "./Client";
import { loadInternalResourceConnectionsData } from "./loadInternalResourceConnectionsData";
import { loadInternalManufacturingData } from "../loadInternalManufacturingData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingConnectorsPage() {
  const [connectorData, manufacturingData] = await Promise.all([
    loadInternalResourceConnectionsData(),
    loadInternalManufacturingData(),
  ]);

  return (
    <Client
      data={connectorData}
      capabilities={manufacturingData.capabilities}
    />
  );
}
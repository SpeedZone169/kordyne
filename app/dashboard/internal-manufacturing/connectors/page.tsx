import Client from "./Client";
import { loadInternalResourceConnectionsData } from "./loadInternalResourceConnectionsData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingConnectorsPage() {
  const connectorData = await loadInternalResourceConnectionsData();

  return <Client data={connectorData} />;
}

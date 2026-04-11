import Client from "./Client";
import { loadInternalResourceConnectionsData } from "./loadInternalResourceConnectionsData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingConnectorsPage() {
  const data = await loadInternalResourceConnectionsData();

  return <Client data={data} />;
}
import { redirect } from "next/navigation";
import Client from "./Client";
import { loadInternalResourceConnectionsData } from "./loadInternalResourceConnectionsData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingConnectorsPage() {
  const connectorData = await loadInternalResourceConnectionsData();

  if (connectorData.errors.includes("Unauthorized.")) {
    redirect("/login");
  }

  return <Client data={connectorData} />;
}

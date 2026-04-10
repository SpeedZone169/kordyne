import Client from "./Client";
import { loadInternalManufacturingData } from "./loadInternalManufacturingData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingPage() {
  const data = await loadInternalManufacturingData();

  return <Client data={data} />;
}
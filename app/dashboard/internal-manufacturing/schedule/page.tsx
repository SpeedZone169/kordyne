import Client from "./Client";
import { loadInternalScheduleData } from "./loadInternalScheduleData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingSchedulePage() {
  const data = await loadInternalScheduleData();

  return <Client data={data} />;
}
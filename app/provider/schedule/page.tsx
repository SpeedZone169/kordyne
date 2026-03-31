import Client from "./Client";
import { loadProviderScheduleData } from "./loadProviderScheduleData";

export default async function ProviderSchedulePage() {
  const data = await loadProviderScheduleData();
  return <Client data={data} />;
}
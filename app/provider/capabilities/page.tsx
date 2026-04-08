import Client from "./Client";
import { loadProviderCapabilitiesData } from "./loadProviderCapabilitiesData";

export default async function ProviderCapabilitiesPage() {
  const data = await loadProviderCapabilitiesData();
  return <Client data={data} />;
}
import Client from "./Client";
import { loadProviderDashboardData } from "../loadProviderDashboardData";

export default async function ProviderCompanyPage() {
  const data = await loadProviderDashboardData();
  return <Client data={data} />;
}
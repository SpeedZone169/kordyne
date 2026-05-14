import { redirect } from "next/navigation";
import Client from "./Client";
import { loadInternalScheduleData } from "./loadInternalScheduleData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingSchedulePage() {
  const data = await loadInternalScheduleData();

  if (data.errors.includes("Unauthorized.")) {
    redirect("/login");
  }

  return <Client data={data} />;
}

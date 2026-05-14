import { redirect } from "next/navigation";
import Client from "./Client";
import { loadInternalManufacturingData } from "./loadInternalManufacturingData";

export const dynamic = "force-dynamic";

export default async function InternalManufacturingPage() {
  const data = await loadInternalManufacturingData();

  if (data.errors.includes("Unauthorized.")) {
    redirect("/login");
  }

  return <Client data={data} />;
}

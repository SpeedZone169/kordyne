"use client";

import type { InternalManufacturingCapability } from "../types";
import type { InternalResourceConnectionsData } from "./types";
import ConnectorsDashboard from "./components/ConnectorsDashboard";

type Props = {
  data: InternalResourceConnectionsData;
  capabilities?: InternalManufacturingCapability[];
};

export default function Client({ data, capabilities = [] }: Props) {
  return <ConnectorsDashboard data={data} capabilities={capabilities} />;
}
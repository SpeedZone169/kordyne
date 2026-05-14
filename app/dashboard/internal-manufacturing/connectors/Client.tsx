"use client";

import type { InternalResourceConnectionsData } from "./types";
import ConnectorsDashboard from "./components/ConnectorsDashboard";

type Props = {
  data: InternalResourceConnectionsData;
};

export default function Client({ data }: Props) {
  return <ConnectorsDashboard data={data} />;
}

"use client";

import { StatCard } from "./uiBits";

export default function MachineStats({
  connectedCount,
  runningCount,
  idleCount,
  attentionCount,
}: {
  connectedCount: number;
  runningCount: number;
  idleCount: number;
  attentionCount: number;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Connected" value={connectedCount} />
      <StatCard label="Running" value={runningCount} />
      <StatCard label="Idle" value={idleCount} />
      <StatCard label="Attention" value={attentionCount} />
    </div>
  );
}
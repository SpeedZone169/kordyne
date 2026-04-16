"use client";

import { type FleetCategory } from "./connectorUi";
import { FilterChip, SideMenuSection } from "./uiBits";

export default function ConnectorsSidebar({
  machinesLength,
  activeCategory,
  setActiveCategory,
  providers,
  activeProvider,
  setActiveProvider,
  machines,
}: {
  machinesLength: number;
  activeCategory: FleetCategory;
  setActiveCategory: (value: FleetCategory) => void;
  providers: string[];
  activeProvider: string;
  setActiveProvider: (value: string) => void;
  machines: Array<{ category: FleetCategory }>;
}) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <SideMenuSection title="Categories">
        {(
          [
            "All equipment",
            "3D printers",
            "CNC",
            "Inspection & QA",
            "Finishing",
            "General",
          ] as FleetCategory[]
        ).map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition ${
              activeCategory === category
                ? "bg-[#0b1633] text-white"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <span>{category}</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                activeCategory === category
                  ? "bg-white/15 text-white"
                  : "bg-white text-slate-500"
              }`}
            >
              {category === "All equipment"
                ? machinesLength
                : machines.filter((machine) => machine.category === category).length}
            </span>
          </button>
        ))}
      </SideMenuSection>

      <SideMenuSection title="Providers">
        <FilterChip
          active={activeProvider === "All providers"}
          onClick={() => setActiveProvider("All providers")}
        >
          All providers
        </FilterChip>

        {providers.map((provider) => (
          <FilterChip
            key={provider}
            active={activeProvider === provider}
            onClick={() => setActiveProvider(provider)}
          >
            {provider}
          </FilterChip>
        ))}
      </SideMenuSection>
    </aside>
  );
}
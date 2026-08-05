"use client";

import { useState, type ReactNode } from "react";
import PillSwitcher from "@/components/PillSwitcher";

/**
 * Three panels, instant switch.
 *
 * All three are rendered on the server and passed in as props, so switching costs nothing —
 * no fetch, no spinner, no layout shift. The cost is one larger initial payload, which is the
 * right trade for a phone-first app people flick between tabs on.
 */
export default function StatsTabs({
  overview,
  installments,
  savingInvestment,
}: {
  overview: ReactNode;
  installments: ReactNode;
  savingInvestment: ReactNode;
}) {
  const [active, setActive] = useState(0);

  const tabs = [
    { label: "Overview", panel: overview },
    { label: "Installments", panel: installments },
    { label: "Saving", panel: savingInvestment },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-full bg-cream-200 p-1">
        <PillSwitcher<number>
          options={tabs.map((tab, i) => ({
            key: i,
            label: tab.label,
            pillClassName: "bg-white shadow-[var(--shadow-xs)]",
            activeTextClassName: "text-forest-800",
          }))}
          value={active}
          onChange={setActive}
          ariaLabel="Dashboard sections"
          bordered={false}
          grow
          sizeClassName="h-9 px-2 text-[13px]"
          gapClassName="gap-1"
        />
      </div>

      {tabs.map((tab, i) => (
        <div key={tab.label} role="tabpanel" aria-label={tab.label} hidden={i !== active}>
          {tab.panel}
        </div>
      ))}
    </div>
  );
}

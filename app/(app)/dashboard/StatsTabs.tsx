"use client";

import { useState, type ReactNode } from "react";

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
      <div
        role="tablist"
        aria-label="Dashboard sections"
        className="flex gap-1 rounded-full bg-cream-200 p-1"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            role="tab"
            type="button"
            id={`stats-tab-${i}`}
            aria-selected={i === active}
            aria-controls={`stats-panel-${i}`}
            onClick={() => setActive(i)}
            className={`h-9 flex-1 rounded-full text-[13px] font-semibold transition-colors ${
              i === active
                ? "bg-white text-forest-800 shadow-[var(--shadow-xs)]"
                : "text-ink-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {tabs.map((tab, i) => (
        <div
          key={tab.label}
          role="tabpanel"
          id={`stats-panel-${i}`}
          aria-labelledby={`stats-tab-${i}`}
          hidden={i !== active}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}

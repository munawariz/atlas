"use client";

import { useState, type ReactNode } from "react";
import PillSwitcher from "@/components/PillSwitcher";

/**
 * Splits /stocks into Portfolio / Activity, the same instant-switch pattern the dashboard's
 * StatsTabs already proved — both panels render on the server and swap client-side, no fetch.
 *
 * Stocks was doing five concerns on one scroll (portfolio, trade entry, dividend entry + log,
 * recent-trades history, targets) with no tabs, unlike the dashboard's comparable amount of
 * content. Now that the entry forms live in sheets (FormSheet) instead of permanently inline,
 * this is what's left to organize (atlas-ux-review.md, Deep dive).
 */
export default function StocksTabs({
  portfolio,
  activity,
}: {
  portfolio: ReactNode;
  activity: ReactNode;
}) {
  const [active, setActive] = useState<"portfolio" | "activity">("portfolio");

  const tabs = [
    { key: "portfolio" as const, label: "Portfolio", panel: portfolio },
    { key: "activity" as const, label: "Activity", panel: activity },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-full bg-cream-200 p-1">
        <PillSwitcher<"portfolio" | "activity">
          options={tabs.map((tab) => ({
            key: tab.key,
            label: tab.label,
            pillClassName: "bg-white shadow-[var(--shadow-xs)]",
            activeTextClassName: "text-forest-800",
          }))}
          value={active}
          onChange={setActive}
          ariaLabel="Stocks sections"
          bordered={false}
          grow
          sizeClassName="h-9 px-2 text-[13px]"
          gapClassName="gap-1"
        />
      </div>

      {tabs.map((tab) => (
        <div key={tab.key} role="tabpanel" aria-label={tab.label} hidden={tab.key !== active}>
          {tab.panel}
        </div>
      ))}
    </div>
  );
}

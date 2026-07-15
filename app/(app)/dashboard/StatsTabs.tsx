"use client";

import { useState } from "react";

// Tab switcher for the home page: the day Overview, an Installments breakdown by provider,
// and a Saving & Investment view (monthly stock buying + this month's contributions). All
// are server-rendered and passed in; switching is instant.
export default function StatsTabs({
  overview,
  providers,
  savingInvestment,
}: {
  overview: React.ReactNode;
  providers: React.ReactNode;
  savingInvestment: React.ReactNode;
}) {
  const [tab, setTab] = useState<"overview" | "providers" | "savinv">("overview");
  const tabs: { key: "overview" | "providers" | "savinv"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "providers", label: "Installments" },
    { key: "savinv", label: "Saving & Investment" },
  ];
  return (
    <>
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full px-1 py-1.5 text-xs font-semibold leading-tight transition-colors ${
              tab === t.key ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? overview : tab === "providers" ? providers : savingInvestment}
    </>
  );
}

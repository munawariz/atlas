"use client";

import { useState } from "react";

// Two-tab switcher for the stats page: the existing day Overview, and an Installments
// breakdown by provider. Both are server-rendered and passed in; switching is instant.
export default function StatsTabs({
  overview,
  providers,
}: {
  overview: React.ReactNode;
  providers: React.ReactNode;
}) {
  const [tab, setTab] = useState<"overview" | "providers">("overview");
  const tabs: { key: "overview" | "providers"; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "providers", label: "Installments" },
  ];
  return (
    <>
      <div className="flex gap-1.5">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full py-1.5 text-xs font-semibold transition-colors ${
              tab === t.key ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" ? overview : providers}
    </>
  );
}

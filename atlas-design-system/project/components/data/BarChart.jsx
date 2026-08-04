import React from "react";

/* Alternating forest / sage columns with rounded caps — the app's spending chart. */
export function BarChart({ data = [], height = 200, highlight = "alternate", style, ...rest }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height, ...style }} {...rest}>
      {data.map((d, i) => {
        const active = highlight === "alternate" ? i % 2 === 1 : d.active;
        return (
          <div key={d.label + i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, height: "100%", justifyContent: "flex-end" }}>
            <div
              style={{
                width: "100%",
                height: `${(d.value / max) * 100}%`,
                background: active ? "var(--forest-800)" : "var(--sage-200)",
                borderRadius: 8,
                transition: "height var(--duration-slow) var(--ease-standard)",
              }}
            />
            <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-heading)" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

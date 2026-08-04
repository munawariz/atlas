import React from "react";

export function StatBlock({ value, label, size = "lg", tone = "light", style, ...rest }) {
  const sizes = { lg: "var(--text-stat-lg)", md: "var(--text-stat-md)", sm: "var(--text-stat-sm)" };
  const inverse = tone === "inverse";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }} {...rest}>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontSize: sizes[size] || sizes.lg,
          fontWeight: "var(--weight-bold)",
          letterSpacing: "var(--tracking-stat)",
          lineHeight: 1.1,
          color: inverse ? "var(--white)" : "var(--text-heading)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-body-sm)",
          fontWeight: "var(--weight-semibold)",
          color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

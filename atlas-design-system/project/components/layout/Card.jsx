import React from "react";

const TONES = {
  white: { background: "var(--white)", color: "var(--text-body)" },
  cream: { background: "var(--cream-100)", color: "var(--text-body)" },
  sage: { background: "var(--sage-100)", color: "var(--text-body)" },
  forest: { background: "var(--forest-800)", color: "var(--text-inverse-muted)" },
  accent: { background: "var(--lime-500)", color: "var(--forest-800)" },
};

export function Card({ children, tone = "white", pad = "md", radius = "card", elevation = "none", bordered = false, style, ...rest }) {
  const pads = { none: 0, sm: 20, md: 32, lg: 40 };
  const radii = { card: "var(--radius-card)", lg: "var(--radius-card-lg)", md: "var(--radius-md)", sm: "var(--radius-sm)" };
  const shadows = { none: "none", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };
  const t = TONES[tone] || TONES.white;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        padding: pads[pad] ?? pads.md,
        borderRadius: radii[radius] || radii.card,
        boxShadow: shadows[elevation] || "none",
        border: bordered ? "1px solid " + (tone === "forest" ? "var(--border-inverse)" : "var(--border-subtle)") : "none",
        ...t,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

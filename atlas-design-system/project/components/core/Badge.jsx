import React from "react";
import { Icon } from "./Icon.jsx";

const TONES = {
  accent: { background: "var(--lime-500)", color: "var(--forest-800)" },
  soft: { background: "var(--lime-200)", color: "var(--forest-800)" },
  forest: { background: "var(--forest-800)", color: "var(--white)" },
  sage: { background: "var(--sage-200)", color: "var(--forest-800)" },
  cream: { background: "var(--cream-100)", color: "var(--forest-800)" },
  positive: { background: "var(--positive-100)", color: "var(--positive-600)" },
  negative: { background: "var(--negative-100)", color: "var(--negative-600)" },
  warning: { background: "var(--warning-100)", color: "#8a5b12" },
};

export function Badge({ children, tone = "soft", icon, uppercase = false, style, ...rest }) {
  const t = TONES[tone] || TONES.soft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        height: 28,
        padding: "0 12px",
        borderRadius: "var(--radius-full)",
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-label-sm)",
        fontWeight: "var(--weight-semibold)",
        letterSpacing: uppercase ? "var(--tracking-eyebrow)" : "var(--tracking-label)",
        textTransform: uppercase ? "uppercase" : "none",
        whiteSpace: "nowrap",
        ...t,
        ...style,
      }}
      {...rest}
    >
      {icon && <Icon name={icon} size={13} color={t.color} />}
      {children}
    </span>
  );
}

import React from "react";
import { Icon } from "../core/Icon.jsx";

/* The four-up action row on the app home screen. */
export function QuickActions({ actions = [], onSelect, style, ...rest }) {
  const list = actions.length ? actions : [
    { icon: "arrow-up-down", label: "Transfer" },
    { icon: "hand-coins", label: "Request" },
    { icon: "file-text", label: "PayBill" },
    { icon: "grid-2x2", label: "More" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${list.length},1fr)`, gap: 12, ...style }} {...rest}>
      {list.map((a) => (
        <button
          key={a.label}
          type="button"
          onClick={() => onSelect && onSelect(a.label)}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, border: "none", background: "transparent", cursor: "pointer", padding: 0 }}
        >
          <span style={{ width: "100%", aspectRatio: "1 / 1", maxWidth: 58, borderRadius: "var(--radius-md)", background: "var(--white)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={a.icon} size={22} color="var(--forest-800)" />
          </span>
          <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text-heading)" }}>{a.label}</span>
        </button>
      ))}
    </div>
  );
}

import React from "react";
import { Icon } from "../core/Icon.jsx";

export function TransactionRow({ title, meta, amount, direction = "out", icon = "credit-card", avatar, chipTone = "cream", onClick, chevron = false, style, ...rest }) {
  const tones = { cream: "var(--cream-100)", sage: "var(--sage-100)", lime: "var(--lime-200)" };
  const positive = direction === "in";
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 16px",
        background: "var(--white)",
        borderRadius: "var(--radius-md)",
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
      {...rest}
    >
      {avatar || (
        <span style={{ width: 44, height: 44, flex: "0 0 auto", borderRadius: 12, background: tones[chipTone] || tones.cream, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={20} color="var(--forest-800)" />
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-heading)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
        {meta && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", color: "var(--text-muted)" }}>{meta}</span>}
      </div>
      <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-semibold)", color: positive ? "var(--positive-500)" : "var(--text-heading)", whiteSpace: "nowrap" }}>
        {amount}
      </span>
      {chevron && <Icon name="chevron-right" size={16} color="var(--ink-300)" />}
    </div>
  );
}

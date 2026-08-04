import React from "react";
import { Icon } from "../core/Icon.jsx";

/* Money entry with a currency picker on the trailing edge — the send-money flow's
   primary control. `flag` is any emoji-free node; pass an <img> of a flag asset if you have one. */
export function AmountField({ label, value, onChange, currency = "USD", currencies = ["USD", "EUR", "GBP", "BDT"], onCurrencyChange, flag, readOnly = false, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 16px",
        background: "var(--cream-100)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        {label && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", color: "var(--text-muted)" }}>{label}</span>}
        <input
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          inputMode="decimal"
          style={{
            border: "none",
            outline: "none",
            background: "transparent",
            width: "100%",
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-stat-sm)",
            fontWeight: "var(--weight-bold)",
            letterSpacing: "var(--tracking-stat)",
            color: "var(--text-heading)",
          }}
        />
      </div>
      <div style={{ width: 1, alignSelf: "stretch", background: "var(--border-subtle)" }} />
      <button
        type="button"
        onClick={onCurrencyChange}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-body-sm)",
          fontWeight: "var(--weight-semibold)",
          color: "var(--text-heading)",
        }}
      >
        {flag}
        {currency}
        <Icon name="chevron-down" size={16} color="var(--ink-700)" />
      </button>
    </div>
  );
}

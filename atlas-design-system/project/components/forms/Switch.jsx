import React from "react";

export function Switch({ checked = false, onChange, label, disabled = false, style, ...rest }) {
  return (
    <label
      style={{ display: "inline-flex", alignItems: "center", gap: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, ...style }}
      {...rest}
    >
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 48,
          height: 28,
          flex: "0 0 auto",
          borderRadius: "var(--radius-full)",
          background: checked ? "var(--forest-800)" : "var(--sage-200)",
          padding: 3,
          display: "flex",
          justifyContent: checked ? "flex-end" : "flex-start",
          transition: "background-color var(--duration-base) var(--ease-standard)",
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: "var(--radius-full)",
            background: checked ? "var(--lime-500)" : "var(--white)",
            boxShadow: "var(--shadow-xs)",
            transition: "background-color var(--duration-base) var(--ease-standard)",
          }}
        />
      </span>
      {label && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-heading)" }}>{label}</span>}
    </label>
  );
}

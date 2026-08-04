import React from "react";

export function Radio({ checked = false, onChange, label, value, name, disabled = false, style, ...rest }) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", gap: 12, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.45 : 1, ...style }}
      {...rest}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span
        style={{
          width: 22,
          height: 22,
          flex: "0 0 auto",
          borderRadius: "var(--radius-full)",
          border: "1px solid " + (checked ? "var(--forest-800)" : "var(--border-default)"),
          background: "var(--white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition-control)",
        }}
      >
        {checked && <span style={{ width: 10, height: 10, borderRadius: "var(--radius-full)", background: "var(--forest-800)" }} />}
      </span>
      {label && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-heading)" }}>{label}</span>}
    </label>
  );
}

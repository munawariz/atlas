import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Checkbox({ checked = false, onChange, label, description, disabled = false, style, ...rest }) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: description ? "flex-start" : "center",
        gap: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.45 : 1,
        ...style,
      }}
      {...rest}
    >
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
      <span
        style={{
          width: 22,
          height: 22,
          flex: "0 0 auto",
          marginTop: description ? 2 : 0,
          borderRadius: 6,
          border: "1px solid " + (checked ? "var(--forest-800)" : "var(--border-default)"),
          background: checked ? "var(--forest-800)" : "var(--white)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "var(--transition-control)",
        }}
      >
        {checked && <Icon name="check" size={14} color="var(--lime-500)" />}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {label && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-heading)" }}>{label}</span>}
        {description && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", color: "var(--text-muted)", lineHeight: 1.5 }}>{description}</span>}
      </span>
    </label>
  );
}

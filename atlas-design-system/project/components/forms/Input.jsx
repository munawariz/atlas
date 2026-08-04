import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Input({ icon, suffix, invalid = false, disabled = false, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        height: 52,
        padding: "0 16px",
        background: disabled ? "var(--ink-100)" : "var(--white)",
        border: "1px solid " + (invalid ? "var(--negative-500)" : focus ? "var(--forest-800)" : "var(--border-default)"),
        borderRadius: "var(--radius-input)",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "var(--transition-control)",
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={18} color="var(--ink-500)" />}
      <input
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-body-md)",
          color: "var(--text-heading)",
        }}
        {...rest}
      />
      {suffix && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", color: "var(--text-muted)" }}>{suffix}</span>}
    </div>
  );
}

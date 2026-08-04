import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ options = [], value, onChange, disabled = false, style, ...rest }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        height: 52,
        padding: "0 16px",
        background: disabled ? "var(--ink-100)" : "var(--white)",
        border: "1px solid " + (focus ? "var(--forest-800)" : "var(--border-default)"),
        borderRadius: "var(--radius-input)",
        boxShadow: focus ? "var(--shadow-focus)" : "none",
        transition: "var(--transition-control)",
        ...style,
      }}
    >
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          flex: 1,
          minWidth: 0,
          border: "none",
          outline: "none",
          background: "transparent",
          fontFamily: "var(--font-text)",
          fontSize: "var(--text-body-md)",
          fontWeight: "var(--weight-medium)",
          color: "var(--text-heading)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
        ))}
      </select>
      <Icon name="chevron-down" size={18} color="var(--ink-700)" />
    </div>
  );
}

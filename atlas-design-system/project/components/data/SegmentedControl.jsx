import React from "react";
import { Icon } from "../core/Icon.jsx";

export function SegmentedControl({ options = [], value, onChange, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        padding: 4,
        background: "var(--sage-100)",
        borderRadius: "var(--radius-md)",
        ...style,
      }}
      {...rest}
    >
      {options.map((o) => {
        const key = o.value ?? o;
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange && onChange(key)}
            style={{
              flex: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              height: 44,
              padding: "0 18px",
              border: "none",
              borderRadius: "var(--radius-sm)",
              background: selected ? "var(--white)" : "transparent",
              boxShadow: selected ? "var(--shadow-xs)" : "none",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-body-sm)",
              fontWeight: "var(--weight-semibold)",
              color: "var(--text-heading)",
              cursor: "pointer",
              transition: "var(--transition-control)",
            }}
          >
            {o.label ?? o}
            {o.icon && <Icon name={o.icon} size={16} color="var(--forest-800)" />}
          </button>
        );
      })}
    </div>
  );
}

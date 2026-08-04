import React from "react";
import { Icon } from "../core/Icon.jsx";

/* Numbered disclosure list — Atlas's how-it-works pattern. Forest ground, lime rules. */
export function Accordion({ items = [], defaultOpen = 0, tone = "inverse", numbered = true, style, ...rest }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const inverse = tone === "inverse";
  return (
    <div style={{ display: "flex", flexDirection: "column", ...style }} {...rest}>
      {items.map((item, i) => {
        const isOpen = i === open;
        return (
          <div
            key={i}
            style={{
              borderBottom: "1px solid " + (isOpen ? (inverse ? "var(--lime-500)" : "var(--forest-800)") : inverse ? "rgba(255,255,255,.16)" : "var(--border-subtle)"),
              transition: "border-color var(--duration-base) var(--ease-standard)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 26,
                padding: "22px 4px",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {numbered && (
                <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-medium)", color: inverse ? "var(--text-inverse-muted)" : "var(--text-muted)", minWidth: 26 }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
              )}
              <span style={{ flex: 1, fontFamily: "var(--font-display)", fontSize: "var(--text-heading-4)", fontWeight: "var(--weight-semibold)", letterSpacing: "-0.01em", color: inverse ? "var(--white)" : "var(--text-heading)" }}>
                {item.title}
              </span>
              <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={20} color={isOpen ? "var(--lime-500)" : inverse ? "rgba(255,255,255,.55)" : "var(--ink-500)"} />
            </button>
            {isOpen && item.body && (
              <p style={{ margin: 0, padding: numbered ? "0 4px 22px 52px" : "0 4px 22px", maxWidth: 560, fontSize: "var(--text-body-sm)", lineHeight: 1.7, color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)" }}>
                {item.body}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

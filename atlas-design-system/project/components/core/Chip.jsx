import React from "react";

export function Chip({ children, selected = false, onSelect, tone = "light", style, ...rest }) {
  const inverse = tone === "inverse";
  const [hover, setHover] = React.useState(false);
  const base = selected
    ? inverse
      ? { background: "var(--lime-500)", color: "var(--forest-800)", borderColor: "var(--lime-500)" }
      : { background: "var(--forest-800)", color: "var(--white)", borderColor: "var(--forest-800)" }
    : inverse
      ? { background: "transparent", color: "var(--white)", borderColor: "var(--border-inverse)" }
      : { background: "var(--white)", color: "var(--ink-700)", borderColor: "var(--border-default)" };
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 38,
        padding: "0 18px",
        borderRadius: "var(--radius-full)",
        borderStyle: "solid",
        borderWidth: 1,
        fontFamily: "var(--font-text)",
        fontSize: "var(--text-body-sm)",
        fontWeight: selected ? "var(--weight-semibold)" : "var(--weight-medium)",
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "var(--transition-control)",
        ...base,
        ...(hover && !selected ? { borderColor: "var(--forest-800)", color: "var(--forest-800)" } : null),
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

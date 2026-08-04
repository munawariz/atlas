import React from "react";

export function SectionHeading({ eyebrow, title, body, align = "left", tone = "light", size = "display-3", action, style, ...rest }) {
  const inverse = tone === "inverse";
  const sizes = { "display-2": "var(--text-display-2)", "display-3": "var(--text-display-3)", "display-4": "var(--text-display-4)" };
  const centered = align === "center";
  return (
    <div
      style={{
        display: "flex",
        alignItems: centered ? "center" : "flex-end",
        justifyContent: "space-between",
        gap: 32,
        flexDirection: centered ? "column" : "row",
        textAlign: centered ? "center" : "left",
        ...style,
      }}
      {...rest}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: centered ? 720 : 620, alignItems: centered ? "center" : "flex-start" }}>
        {eyebrow && (
          <span
            style={{
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-eyebrow)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: inverse ? "var(--lime-500)" : "var(--ink-500)",
            }}
          >
            {eyebrow}
          </span>
        )}
        <h2
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontSize: sizes[size] || sizes["display-3"],
            fontWeight: "var(--weight-bold)",
            lineHeight: "var(--leading-display)",
            letterSpacing: "var(--tracking-display)",
            color: inverse ? "var(--white)" : "var(--text-heading)",
            textWrap: "balance",
          }}
        >
          {title}
        </h2>
        {body && (
          <p style={{ margin: 0, maxWidth: 520, fontSize: "var(--text-body-md)", lineHeight: "var(--leading-body)", color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)" }}>
            {body}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

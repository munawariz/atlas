import React from "react";
import { Icon } from "../core/Icon.jsx";

/* Icon chip, title, body — the unit that makes up Atlas's feature grids.
   Tinted ground, flat, and often cropping a screenshot or card at the bottom. */
export function FeatureTile({ icon = "wallet", title, body, tone = "cream", pad = 32, children, action, style, ...rest }) {
  const grounds = { cream: "var(--cream-100)", sage: "var(--sage-100)", forest: "var(--forest-800)", white: "var(--white)" };
  const inverse = tone === "forest";
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding: pad,
        background: grounds[tone] || grounds.cream,
        borderRadius: "var(--radius-card-lg)",
        ...style,
      }}
      {...rest}
    >
      {icon && (
        <span style={{ width: 54, height: 54, borderRadius: "var(--radius-full)", background: "var(--lime-500)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto" }}>
          <Icon name={icon} size={26} color="var(--forest-800)" />
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {title && (
          <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: "var(--text-heading-2)", fontWeight: "var(--weight-bold)", letterSpacing: "var(--tracking-heading)", lineHeight: 1.25, color: inverse ? "var(--white)" : "var(--text-heading)", maxWidth: "20ch" }}>
            {title}
          </h3>
        )}
        {body && (
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", lineHeight: 1.65, color: inverse ? "var(--text-inverse-muted)" : "var(--text-body)" }}>{body}</p>
        )}
      </div>
      {action}
      {children}
    </div>
  );
}

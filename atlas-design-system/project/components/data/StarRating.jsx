import React from "react";
import { Icon } from "../core/Icon.jsx";

export function StarRating({ value = 5, max = 5, size = 18, score, caption, style, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, ...style }} {...rest}>
      {score && (
        <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-stat-md)", fontWeight: "var(--weight-bold)", letterSpacing: "var(--tracking-stat)", color: "var(--text-heading)" }}>
          {score}
        </span>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", gap: 3 }}>
          {Array.from({ length: max }).map((_, i) => (
            <Icon key={i} name="star" size={size} color={i < value ? "var(--forest-800)" : "var(--sage-200)"} />
          ))}
        </div>
        {caption && <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", color: "var(--text-muted)" }}>{caption}</span>}
      </div>
    </div>
  );
}

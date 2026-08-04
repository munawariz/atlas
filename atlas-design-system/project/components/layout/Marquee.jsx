import React from "react";
import { Sparkle } from "../core/Sparkle.jsx";

/* The forest band of scrolling propositions, separated by lime sparkles.
   Appears two or three times down a marketing page as a rhythm break. */
export function Marquee({ items = [], tone = "forest", speed = 32, size = 30, style, ...rest }) {
  const inverse = tone !== "accent";
  const run = items.length ? items : ["Instant Online Debit", "Digital Banking", "Cash Back & Perks"];
  const seq = [...run, ...run, ...run, ...run];
  return (
    <div
      style={{
        overflow: "hidden",
        background: inverse ? "var(--forest-800)" : "var(--lime-500)",
        padding: "22px 0",
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          display: "flex",
          width: "max-content",
          alignItems: "center",
          gap: 44,
          animation: `atlas-marquee ${speed}s linear infinite`,
        }}
      >
        {seq.concat(seq).map((item, i) => (
          <React.Fragment key={i}>
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: size,
                fontWeight: "var(--weight-medium)",
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                color: inverse ? "var(--white)" : "var(--forest-800)",
              }}
            >
              {item}
            </span>
            <Sparkle size={size * 0.72} color={inverse ? "var(--lime-500)" : "var(--forest-800)"} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

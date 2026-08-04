import React from "react";

/* No logo file was supplied with the brand reference, so the Atlas mark is the
   wordmark set in the display face. See readme.md > Assets. */
export function Logo({ size = 26, tone = "forest", style, ...rest }) {
  const color = tone === "inverse" ? "var(--white)" : tone === "accent" ? "var(--lime-500)" : "var(--forest-800)";
  return (
    <span
      style={{
        fontFamily: "var(--font-display)",
        fontWeight: 800,
        fontSize: size,
        letterSpacing: "-0.045em",
        lineHeight: 1,
        color,
        display: "inline-block",
        ...style,
      }}
      {...rest}
    >
      atlas
    </span>
  );
}

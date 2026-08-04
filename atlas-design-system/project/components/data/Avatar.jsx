import React from "react";

export function Avatar({ src, name = "", size = 40, ring = "none", style, ...rest }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const rings = { none: "none", white: "0 0 0 3px var(--white)", lime: "0 0 0 3px var(--lime-500)", forest: "0 0 0 3px var(--forest-800)" };
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        borderRadius: "var(--radius-full)",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--sage-200)",
        boxShadow: rings[ring] || "none",
        fontFamily: "var(--font-text)",
        fontSize: size * 0.36,
        fontWeight: "var(--weight-semibold)",
        color: "var(--forest-800)",
        ...style,
      }}
      {...rest}
    >
      {src ? <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </span>
  );
}

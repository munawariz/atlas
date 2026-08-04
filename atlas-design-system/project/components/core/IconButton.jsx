import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = { sm: 36, md: 44, lg: 56, xl: 72 };
const TONES = {
  forest: { background: "var(--forest-800)", color: "var(--white)", border: "1px solid var(--forest-800)" },
  accent: { background: "var(--lime-500)", color: "var(--forest-800)", border: "1px solid var(--lime-500)" },
  sage: { background: "var(--sage-200)", color: "var(--forest-800)", border: "1px solid var(--sage-200)" },
  white: { background: "var(--white)", color: "var(--forest-800)", border: "1px solid var(--border-subtle)" },
  outline: { background: "transparent", color: "var(--forest-800)", border: "1px solid var(--border-default)" },
  "outline-inverse": { background: "transparent", color: "var(--white)", border: "1px solid var(--border-inverse)" },
};

export function IconButton({ icon = "arrow-up-right", tone = "forest", size = "md", shape = "circle", label, style, ...rest }) {
  const px = SIZES[size] || SIZES.md;
  const t = TONES[tone] || TONES.forest;
  const [hover, setHover] = React.useState(false);
  return (
    <button
      type="button"
      aria-label={label || icon}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        width: px,
        height: px,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: shape === "circle" ? "var(--radius-full)" : "var(--radius-sm)",
        cursor: "pointer",
        transition: "var(--transition-control)",
        filter: hover ? "brightness(0.94)" : "none",
        ...t,
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={Math.round(px * 0.42)} color={t.color} />
    </button>
  );
}

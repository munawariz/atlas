import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = {
  sm: { height: 40, padding: "0 18px", font: "var(--text-body-sm)", icon: 16, gap: 8 },
  md: { height: 48, padding: "0 26px", font: "var(--text-body-md)", icon: 18, gap: 10 },
  lg: { height: 58, padding: "0 34px", font: "var(--text-body-md)", icon: 20, gap: 12 },
};

const VARIANTS = {
  primary: { background: "var(--forest-800)", color: "var(--white)", border: "1px solid var(--forest-800)" },
  accent: { background: "var(--lime-500)", color: "var(--forest-800)", border: "1px solid var(--lime-500)" },
  outline: { background: "transparent", color: "var(--forest-800)", border: "1px solid var(--forest-800)" },
  ghost: { background: "transparent", color: "var(--forest-800)", border: "1px solid transparent" },
  inverse: { background: "var(--white)", color: "var(--forest-800)", border: "1px solid var(--white)" },
  "outline-inverse": { background: "transparent", color: "var(--white)", border: "1px solid var(--border-inverse)" },
};

const HOVER = {
  primary: "var(--forest-700)",
  accent: "var(--lime-600)",
  outline: "var(--forest-50)",
  ghost: "var(--forest-50)",
  inverse: "var(--cream-100)",
  "outline-inverse": "rgba(255,255,255,.10)",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  shape = "rounded",
  icon,
  iconPosition = "right",
  fullWidth = false,
  disabled = false,
  style,
  ...rest
}) {
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: fullWidth ? "flex" : "inline-flex",
        width: fullWidth ? "100%" : undefined,
        alignItems: "center",
        justifyContent: "center",
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        fontFamily: "var(--font-text)",
        fontSize: s.font,
        fontWeight: "var(--weight-semibold)",
        letterSpacing: "var(--tracking-label)",
        borderRadius: shape === "pill" ? "var(--radius-full)" : "var(--radius-button)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transform: press && !disabled ? "translateY(1px)" : "none",
        transition: "var(--transition-control)",
        ...v,
        background: hover && !disabled ? HOVER[variant] : v.background,
        ...style,
      }}
      {...rest}
    >
      {icon && iconPosition === "left" && <Icon name={icon} size={s.icon} />}
      {children}
      {icon && iconPosition === "right" && <Icon name={icon} size={s.icon} />}
    </button>
  );
}

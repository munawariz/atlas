import React from "react";
import { Logo } from "../core/Logo.jsx";
import { Button } from "../core/Button.jsx";

export function Navbar({ links = [], activeIndex = -1, tone = "light", cta = "Open an Account", onNavigate, onCta, style, ...rest }) {
  const inverse = tone === "inverse";
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 40,
        padding: "26px 48px",
        background: inverse ? "var(--forest-800)" : "var(--white)",
        ...style,
      }}
      {...rest}
    >
      <Logo size={26} tone={inverse ? "inverse" : "forest"} />
      <nav style={{ display: "flex", alignItems: "center", gap: 38 }}>
        {links.map((l, i) => (
          <button
            key={l}
            type="button"
            onClick={() => onNavigate && onNavigate(l, i)}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontFamily: "var(--font-text)",
              fontSize: "var(--text-label-md)",
              fontWeight: "var(--weight-semibold)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: inverse ? (i === activeIndex ? "var(--lime-500)" : "var(--white)") : i === activeIndex ? "var(--forest-800)" : "var(--ink-800)",
              paddingBottom: 3,
              borderBottom: "1.5px solid " + (i === activeIndex ? "var(--lime-500)" : "transparent"),
              transition: "var(--transition-control)",
            }}
          >
            {l}
          </button>
        ))}
      </nav>
      <Button variant={inverse ? "accent" : "outline"} shape="pill" size="md" onClick={onCta}>
        {cta}
      </Button>
    </header>
  );
}

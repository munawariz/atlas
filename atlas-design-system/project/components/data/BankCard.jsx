import React from "react";
import { Logo } from "../core/Logo.jsx";
import { Icon } from "../core/Icon.jsx";

/* The Atlas payment card. Three finishes exist: forest (flagship), sage (secondary),
   cream (credit). The oversized brand shape is a cropped lime/ivory circle pair. */
const FINISH = {
  forest: { bg: "var(--forest-800)", ink: "var(--white)", logo: "inverse", shapeA: "var(--lime-500)", shapeB: "var(--sage-200)" },
  sage: { bg: "var(--sage-200)", ink: "var(--forest-800)", logo: "forest", shapeA: "var(--lime-500)", shapeB: "var(--forest-800)" },
  cream: { bg: "var(--cream-100)", ink: "var(--forest-800)", logo: "forest", shapeA: "var(--lime-400)", shapeB: "var(--sage-200)" },
};

export function BankCard({
  finish = "forest",
  holder = "Anderson Darrel",
  network = "VISA",
  width = 340,
  avatar,
  contactless = true,
  chip = true,
  style,
  ...rest
}) {
  const s = width / 340;
  const t = FINISH[finish] || FINISH.forest;
  return (
    <div
      style={{
        position: "relative",
        width,
        height: width * 0.63,
        borderRadius: 22 * s,
        background: t.bg,
        overflow: "hidden",
        boxShadow: "var(--shadow-float)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ position: "absolute", right: width * -0.07, top: width * 0.15, width: width * 0.33, height: width * 0.33, borderRadius: "50%", border: `${width * 0.058}px solid ${t.shapeA}` }} />
      <div style={{ position: "absolute", inset: 0, padding: 20 * s, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Logo size={20 * s} tone={t.logo} />
          <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
            {chip && (
              <span style={{ width: 26 * s, height: 20 * s, borderRadius: 4 * s, backgroundImage: "linear-gradient(135deg,#eecf83,#c9a24d)", display: "block" }} />
            )}
            {contactless && <Icon name="wifi" size={17 * s} color={t.ink} style={{ transform: "rotate(90deg)" }} />}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 * s }}>
            {avatar}
            <span style={{ fontFamily: "var(--font-text)", fontSize: 12 * s, lineHeight: 1.25, color: t.ink, opacity: 0.85, maxWidth: 90 * s }}>{holder}</span>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 19 * s, fontWeight: 800, fontStyle: "italic", letterSpacing: "-0.02em", color: t.ink }}>{network}</span>
        </div>
      </div>
    </div>
  );
}

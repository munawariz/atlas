import React from "react";

/* Device shell used everywhere Atlas shows the app inside a marketing layout.
   Forest bezel is the brand default; sage for the lighter feature cards. */
export function PhoneFrame({ children, width = 300, bezel = "forest", statusBar = true, time = "12:30", style, ...rest }) {
  const scale = width / 300;
  const bezelColor = bezel === "sage" ? "var(--sage-300)" : bezel === "ink" ? "var(--ink-900)" : "var(--forest-800)";
  return (
    <div
      style={{
        width,
        borderRadius: 44 * scale,
        background: bezelColor,
        padding: 10 * scale,
        boxShadow: "var(--shadow-lg)",
        ...style,
      }}
      {...rest}
    >
      <div style={{ background: "var(--white)", borderRadius: 36 * scale, overflow: "hidden", position: "relative" }}>
        {statusBar && (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: `${12 * scale}px ${18 * scale}px ${4 * scale}px`,
              fontFamily: "var(--font-text)",
              fontSize: 12 * scale,
              fontWeight: "var(--weight-semibold)",
              color: "var(--ink-900)",
            }}
          >
            <span>{time}</span>
            <span style={{ display: "flex", gap: 4 * scale, alignItems: "flex-end" }}>
              {[5, 7, 9, 11].map((h) => (
                <span key={h} style={{ width: 2.5 * scale, height: h * scale, background: "var(--ink-900)", borderRadius: 1 }} />
              ))}
              <span style={{ width: 22 * scale, height: 11 * scale, border: `1.5px solid var(--ink-900)`, borderRadius: 3 * scale, marginLeft: 3 * scale, padding: 1.5 * scale }}>
                <span style={{ display: "block", width: "80%", height: "100%", background: "var(--ink-900)", borderRadius: 1 }} />
              </span>
            </span>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

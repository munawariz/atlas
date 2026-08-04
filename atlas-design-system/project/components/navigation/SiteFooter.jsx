import React from "react";
import { Logo } from "../core/Logo.jsx";
import { Icon } from "../core/Icon.jsx";

export function SiteFooter({ email = "hello@atlas.net", columns = [], social = ["twitter", "instagram", "linkedin", "facebook"], style, ...rest }) {
  return (
    <footer style={{ background: "var(--forest-800)", color: "var(--text-inverse-muted)", padding: "72px 48px 56px", ...style }} {...rest}>
      <div style={{ maxWidth: "var(--page-max)", margin: "0 auto", display: "flex", gap: 64, flexWrap: "wrap", justifyContent: "space-between" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 300 }}>
          <Logo size={30} tone="inverse" />
          <a href={"mailto:" + email} style={{ color: "var(--white)", fontSize: "var(--text-body-md)", textDecoration: "none" }}>{email}</a>
          <div style={{ display: "flex", gap: 12 }}>
            {social.map((s, i) => (
              <span
                key={s}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "var(--radius-full)",
                  border: "1px solid " + (i === 0 ? "var(--lime-500)" : "var(--border-inverse)"),
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={s} size={17} color={i === 0 ? "var(--lime-500)" : "var(--white)"} />
              </span>
            ))}
          </div>
        </div>
        {columns.map((col) => (
          <div key={col.title} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <span style={{ fontSize: "var(--text-eyebrow)", fontWeight: "var(--weight-semibold)", letterSpacing: "var(--tracking-eyebrow)", textTransform: "uppercase", color: "var(--lime-500)" }}>{col.title}</span>
            {col.links.map((l) => (
              <a key={l} href="#" style={{ color: "var(--text-inverse-muted)", fontSize: "var(--text-body-sm)", textDecoration: "none" }}>{l}</a>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
}

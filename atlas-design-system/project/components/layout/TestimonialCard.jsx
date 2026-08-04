import React from "react";

export function TestimonialCard({ quote, author, role, tone = "cream", style, ...rest }) {
  const grounds = { cream: "var(--cream-100)", sage: "var(--sage-100)", white: "var(--white)" };
  return (
    <figure
      style={{
        margin: 0,
        display: "flex",
        flexDirection: "column",
        gap: 22,
        padding: 36,
        background: grounds[tone] || grounds.cream,
        borderRadius: "var(--radius-card)",
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ fontFamily: "var(--font-display)", fontSize: 46, fontWeight: 800, lineHeight: 0.7, color: "var(--forest-800)" }}>&ldquo;</span>
      <blockquote style={{ margin: 0, fontSize: "var(--text-body-md)", lineHeight: 1.65, color: "var(--text-heading)" }}>{quote}</blockquote>
      <figcaption style={{ fontSize: "var(--text-body-sm)", fontWeight: "var(--weight-semibold)", color: "var(--text-heading)" }}>
        &mdash; {author}
        {role && <span style={{ fontWeight: "var(--weight-regular)", color: "var(--text-muted)" }}>, {role}</span>}
      </figcaption>
    </figure>
  );
}

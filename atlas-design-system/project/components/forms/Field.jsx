import React from "react";

/* Shared label / hint / error frame for every Atlas form control. */
export function Field({ label, hint, error, required, htmlFor, children, style, ...rest }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, ...style }} {...rest}>
      {label && (
        <label
          htmlFor={htmlFor}
          style={{
            fontFamily: "var(--font-text)",
            fontSize: "var(--text-body-sm)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-heading)",
            letterSpacing: "var(--tracking-label)",
          }}
        >
          {label}
          {required && <span style={{ color: "var(--negative-500)", marginLeft: 4 }}>*</span>}
        </label>
      )}
      {children}
      {(hint || error) && (
        <span style={{ fontFamily: "var(--font-text)", fontSize: "var(--text-body-xs)", color: error ? "var(--negative-600)" : "var(--text-muted)" }}>
          {error || hint}
        </span>
      )}
    </div>
  );
}

import React from "react";

/* The four-point star is Atlas's one decorative motif: it separates items in the
   marquee band and punctuates hero headlines. Geometric ornament, not a logo. */
export function Sparkle({ size = 20, color = "var(--lime-500)", style, ...rest }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ display: "block", flex: "0 0 auto", ...style }} {...rest}>
      <path fill={color} d="M12 1c.9 5.9 3.3 8.9 9.5 10-6.2 1.1-8.6 4.1-9.5 10-.9-5.9-3.3-8.9-9.5-10C8.7 9.9 11.1 6.9 12 1Z" />
    </svg>
  );
}

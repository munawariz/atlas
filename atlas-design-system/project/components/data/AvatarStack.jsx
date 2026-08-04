import React from "react";
import { Avatar } from "./Avatar.jsx";

export function AvatarStack({ people = [], size = 46, overflowLabel, style, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "center", ...style }} {...rest}>
      {people.map((p, i) => (
        <Avatar
          key={i}
          src={p.src}
          name={p.name}
          size={size}
          ring="white"
          style={{ marginLeft: i === 0 ? 0 : -size * 0.28, zIndex: people.length - i }}
        />
      ))}
      {overflowLabel && (
        <span
          style={{
            width: size,
            height: size,
            marginLeft: -size * 0.28,
            borderRadius: "var(--radius-full)",
            background: "var(--cream-100)",
            boxShadow: "0 0 0 3px var(--white)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-text)",
            fontSize: size * 0.3,
            fontWeight: "var(--weight-semibold)",
            color: "var(--forest-800)",
          }}
        >
          {overflowLabel}
        </span>
      )}
    </div>
  );
}

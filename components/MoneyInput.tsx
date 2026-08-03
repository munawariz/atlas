"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

// A rupiah input that formats with thousand separators as you type (e.g. 1500000 → 1.500.000)
// so amounts are readable while entering them. Submits the formatted text; the server actions'
// digits() helper strips the separators back to an integer.
export default function MoneyInput({
  name,
  defaultValue,
  placeholder,
  className,
  autoFocus,
  "aria-label": ariaLabel,
}: {
  name: string;
  defaultValue?: number | null;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  "aria-label"?: string;
}) {
  const [raw, setRaw] = useState(defaultValue ? String(defaultValue) : "");
  return (
    <input
      name={name}
      inputMode="numeric"
      value={raw ? formatNumber(parseInt(raw, 10)) : ""}
      onChange={(e) => setRaw(e.target.value.replace(/\D/g, ""))}
      placeholder={placeholder}
      className={className}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
    />
  );
}

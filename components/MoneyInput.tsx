"use client";

import { useState } from "react";
import { formatNumber } from "@/lib/format";

interface MoneyInputProps {
  name: string;
  defaultValue?: number | null;
  placeholder?: string;
  className?: string;
  id?: string;
  required?: boolean;
  ariaLabel?: string;
}

/**
 * A named money input that formats thousands as you type.
 *
 * The submitted value carries the separators — every server action strips them with the shared
 * `digits()` helper, so the wire format is deliberately the display format.
 *
 * `inputMode="numeric"` rather than `type="number"`: a number input rejects the separators, and
 * a spinner has no business on a rupiah field.
 */
export default function MoneyInput({
  name,
  defaultValue,
  placeholder = "0",
  className = "field text-right tabular-nums",
  id,
  required,
  ariaLabel,
}: MoneyInputProps) {
  const [value, setValue] = useState(
    defaultValue ? formatNumber(defaultValue) : ""
  );

  return (
    <input
      id={id}
      name={name}
      value={value}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setValue(raw ? formatNumber(parseInt(raw, 10)) : "");
      }}
      inputMode="numeric"
      autoComplete="off"
      placeholder={placeholder}
      required={required}
      aria-label={ariaLabel}
      className={className}
    />
  );
}

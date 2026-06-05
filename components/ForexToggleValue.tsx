"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";

const fmtUnits = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

/** Tap to flip a forex amount between its native currency and its IDR value (live rate). */
export default function ForexToggleValue({
  units,
  currency,
  idr,
}: {
  units: number;
  currency: string;
  idr: number;
}) {
  const [showIdr, setShowIdr] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setShowIdr((v) => !v)}
      className="tabular-nums text-sky underline decoration-dotted underline-offset-2 active:opacity-70"
      title="Tap to toggle currency"
    >
      {showIdr ? formatRupiah(idr) : `${fmtUnits(units)} ${currency}`}
    </button>
  );
}

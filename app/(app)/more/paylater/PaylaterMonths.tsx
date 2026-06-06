"use client";

import { useState } from "react";
import { formatMonthShort } from "@/lib/format";

// Collapsible per-installment payment history: every month from first to last,
// with its paid/owed status. The viewed month is ringed.
export default function PaylaterMonths({
  months,
  current,
}: {
  months: { month: string; paid: boolean }[];
  current: string;
}) {
  const [open, setOpen] = useState(false);
  const paidCount = months.filter((m) => m.paid).length;

  return (
    <div className="mt-2 border-t border-line/40 pt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-[11px] text-paper-dim active:text-paper"
      >
        <span>
          <span className="text-green">{paidCount}</span>/{months.length} months paid
        </span>
        <span className={`transition-transform ${open ? "rotate-90" : ""}`}>›</span>
      </button>

      {open && (
        <div className="mt-2 grid grid-cols-3 gap-1.5">
          {months.map((m) => (
            <div
              key={m.month}
              className={`flex items-center justify-between rounded-lg px-2 py-1 text-[11px] ${
                m.paid ? "bg-green/10 text-green" : "bg-amber/10 text-amber"
              } ${m.month === current ? "ring-1 ring-paper/30" : ""}`}
            >
              <span className="truncate">{formatMonthShort(m.month)}</span>
              <span className="ml-1 shrink-0">{m.paid ? "✓" : "•"}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

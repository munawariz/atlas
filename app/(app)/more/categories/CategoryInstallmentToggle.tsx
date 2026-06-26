"use client";

import { useTransition } from "react";
import { toggleCategoryInstallment } from "../actions";

// Marks an expense category as an installment category (tracked separately on the stats
// page). Provider categories are marked automatically; this is for any others.
export default function CategoryInstallmentToggle({ id, installment }: { id: number; installment: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => toggleCategoryInstallment(id))}
      aria-pressed={installment}
      className={`rounded-lg border px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors disabled:opacity-50 ${
        installment
          ? "border-plum/40 bg-plum/15 text-plum"
          : "border-line/60 bg-ink-3 text-paper-faint active:text-paper-dim"
      }`}
    >
      {installment ? "● Installment" : "Mark installment"}
    </button>
  );
}

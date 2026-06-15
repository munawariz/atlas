"use client";

import { useTransition } from "react";
import { BUDGET_PERIODS, type BudgetPeriod } from "@/lib/types";
import { setCategoryPeriod } from "../actions";

// Binds a budgeting cadence to a category; auto-saves on change.
export default function CategoryPeriodSelect({ id, period }: { id: number; period: BudgetPeriod }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={period}
      disabled={pending}
      aria-label="Budget period"
      onChange={(e) => {
        const v = e.target.value;
        startTransition(() => setCategoryPeriod(id, v));
      }}
      className="rounded-lg border border-line/60 bg-ink-3 px-2 py-1 text-xs text-paper-dim outline-none [color-scheme:dark] disabled:opacity-50"
    >
      {BUDGET_PERIODS.map((p) => (
        <option key={p.value} value={p.value} className="bg-ink-2">
          {p.label}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { BUDGET_PERIODS, type BudgetPeriod, type SaveScope } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { clearBudgetOverride, saveBudget } from "./actions";
import { setCategoryPeriod } from "../actions";

const SCOPES: { value: SaveScope; label: string; hint: string }[] = [
  {
    value: "forward",
    label: "This month →",
    hint: "Applies to this month and every month after it.",
  },
  {
    value: "month",
    label: "This month only",
    hint: "A one-off override. Later months keep the recurring rule.",
  },
  {
    value: "all",
    label: "All months",
    hint: "Replaces every rule and override for this category.",
  },
];

export default function BudgetRow({
  categoryId,
  name,
  period,
  amount,
  monthKey,
  source,
  monthlyEquivalent,
}: {
  categoryId: number;
  name: string;
  period: BudgetPeriod;
  amount: number;
  monthKey: string;
  /** Whether the shown number came from a per-month override or the recurring rule. */
  source: "month" | "rule" | "none";
  monthlyEquivalent: number;
}) {
  const [scope, setScope] = useState<SaveScope>("forward");
  const [open, setOpen] = useState(false);

  const cadence =
    BUDGET_PERIODS.find((p) => p.value === period)?.label ?? "Monthly";

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-baseline justify-between gap-3 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold text-ink-900">
            {name}
          </span>
          <span className="block text-[13px] text-ink-500">
            {cadence}
            {period !== "monthly" && amount > 0 && (
              <> · {formatRupiah(monthlyEquivalent)}/mo</>
            )}
            {source === "month" && " · this month only"}
          </span>
        </span>
        <span className="shrink-0 font-display text-[17px] font-bold text-ink-900 tabular-nums">
          {amount > 0 ? formatRupiah(amount) : "—"}
        </span>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <form action={saveBudget} className="space-y-3">
            <input type="hidden" name="category_id" value={categoryId} />
            <input type="hidden" name="month" value={monthKey} />
            <input type="hidden" name="scope" value={scope} />

            <div>
              <label htmlFor={`amount-${categoryId}`} className="label mb-1 block">
                {period === "yearly" ? "Whole-year limit" : `Per ${period.replace("ly", "")}`}
              </label>
              <MoneyInput
                id={`amount-${categoryId}`}
                name="amount"
                defaultValue={amount}
              />
            </div>

            <div>
              <span className="label mb-1 block">Apply to</span>
              <PillSwitcher<SaveScope>
                options={SCOPES.map((option) => ({
                  key: option.value,
                  label: option.label,
                }))}
                value={scope}
                onChange={setScope}
                ariaLabel="Apply to"
                wrap
              />
              <p className="mt-1.5 text-[13px] text-ink-500">
                {SCOPES.find((s) => s.value === scope)?.hint}
              </p>
            </div>

            <SubmitButton className="btn btn-primary btn-sm w-full" pendingChildren="Saving…">
              Save budget
            </SubmitButton>
          </form>

          <form action={setCategoryPeriod.bind(null, categoryId)}>
            <label className="flex items-center justify-between gap-2">
              <span className="label">Cadence</span>
              <select
                name="period"
                defaultValue={period}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                aria-label="Budget cadence"
                className="field h-10 w-auto py-0 text-[14px]"
              >
                {BUDGET_PERIODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </form>

          {source === "month" && (
            <form action={clearBudgetOverride}>
              <input type="hidden" name="category_id" value={categoryId} />
              <input type="hidden" name="month" value={monthKey} />
              <button type="submit" className="btn btn-sm btn-ghost w-full">
                Revert to the recurring rule
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

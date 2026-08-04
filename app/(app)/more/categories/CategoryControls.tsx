"use client";

import { BUDGET_PERIODS, type BudgetPeriod } from "@/lib/types";

/**
 * The per-category controls that live under the name in the manage list: budget cadence and
 * the installment flag.
 *
 * Both submit on change rather than behind a Save button — a single select with a separate
 * commit step reads as broken on a phone.
 */

export function CategoryPeriodSelect({
  period,
  onChange,
}: {
  period: BudgetPeriod;
  onChange: (formData: FormData) => void | Promise<void>;
}) {
  return (
    <form action={onChange}>
      <label className="flex items-center gap-2">
        <span className="label">Budget</span>
        <select
          name="period"
          defaultValue={period}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          aria-label="Budget cadence"
          className="field h-9 w-auto py-0 text-[13px]"
        >
          {BUDGET_PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}

export function CategoryInstallmentToggle({
  isInstallment,
  onToggle,
}: {
  isInstallment: boolean;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <form action={onToggle}>
      <button
        type="submit"
        aria-pressed={isInstallment}
        className={`inline-flex h-9 items-center rounded-full px-3 text-[12px] font-semibold transition-colors ${
          isInstallment
            ? "bg-lime-200 text-forest-800"
            : "bg-cream-200 text-ink-500"
        }`}
        title="Installment categories are excluded from Budget vs actual — they are fixed and tracked on the Installments tab."
      >
        {isInstallment ? "Installment" : "Not installment"}
      </button>
    </form>
  );
}

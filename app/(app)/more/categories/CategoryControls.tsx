"use client";

import { Star } from "@/components/icons";
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
        {/* "Budget" read as the budget FIGURE; this control only sets how often it resets. */}
        <span className="label">Cadence</span>
        <select
          name="period"
          defaultValue={period}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          aria-label="Budget cadence"
          className="field h-11 w-auto py-0 text-[13px]"
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

export function CategoryFavoriteToggle({
  isFavorite,
  onToggle,
}: {
  isFavorite: boolean;
  onToggle: () => void | Promise<void>;
}) {
  return (
    <form action={onToggle}>
      <button
        type="submit"
        aria-pressed={isFavorite}
        aria-label={isFavorite ? "Remove from favorites" : "Mark as favorite"}
        className={`inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold transition-colors ${
          isFavorite ? "bg-lime-200 text-forest-800" : "bg-cream-200 text-ink-500"
        }`}
      >
        <Star size={14} fill={isFavorite ? "currentColor" : "none"} />
        Favorite
      </button>
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
      {/*
        The label stays "Installment" in both states — a pill that renames itself to its own
        negation makes the reader compute it. Fill plus aria-pressed carries the state, the same
        way Favorite already does (atlas-ux-plan-manage-pages.md, Categories copy).
      */}
      <button
        type="submit"
        aria-pressed={isInstallment}
        aria-label={
          isInstallment
            ? "Not an installment category"
            : "Mark as an installment category"
        }
        className={`inline-flex h-11 items-center rounded-full px-3 text-[12px] font-semibold transition-colors ${
          isInstallment
            ? "bg-lime-200 text-forest-800"
            : "bg-cream-200 text-ink-500"
        }`}
      >
        Installment
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { ChevronDown } from "@/components/icons";
import { BUDGET_PERIODS, type BudgetPeriod, type SaveScope } from "@/lib/types";
import { formatRupiah } from "@/lib/format";
import { clearBudgetOverride, saveBudget } from "./actions";
import { setCategoryPeriod } from "../actions";

const SCOPES: { value: SaveScope; label: string; hint: string }[] = [
  {
    value: "forward",
    // A trailing arrow inside a pill reads as navigation, which this is not.
    label: "From this month on",
    hint: "Applies to this month and every month after it.",
  },
  {
    value: "month",
    label: "This month only",
    hint: "A one-off override. Later months keep the recurring rule.",
  },
  {
    value: "all",
    label: "Every month",
    hint: "Replaces every rule and override for this category.",
  },
];

/**
 * The amount field's label, per cadence.
 *
 * This was `\`Per ${period.replace("ly", "")}\`` — which renders **"Per dai"** for a daily
 * budget. `weekly` → `week` and `monthly` → `month` happened to work, which is why it survived
 * (atlas-ux-plan-manage-pages.md, Budgets bug found in passing).
 */
const AMOUNT_LABEL: Record<BudgetPeriod, string> = {
  daily: "Per day",
  weekly: "Per week",
  monthly: "Per month",
  yearly: "Whole-year limit",
};

export default function BudgetRow({
  categoryId,
  name,
  period,
  amount,
  monthKey,
  source,
  monthlyEquivalent,
  lastMonthActual,
  lastMonthLabel,
}: {
  categoryId: number;
  name: string;
  period: BudgetPeriod;
  amount: number;
  monthKey: string;
  /** Whether the shown number came from a per-month override or the recurring rule. */
  source: "month" | "rule" | "none";
  monthlyEquivalent: number;
  /** What this category actually did last month — the context the decision needs. */
  lastMonthActual: number;
  /** e.g. "July" — named rather than "last month", since the month switcher moves the frame. */
  lastMonthLabel: string;
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
        className="flex w-full items-center justify-between gap-3 text-left"
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
          {/*
            You were setting a limit for Groceries with no idea what you spent last month. The
            dashboard had that context; this page — where the decision is actually made — did not
            (atlas-ux-plan-manage-pages.md, Budgets UX #3).
          */}
          {lastMonthActual > 0 && (
            <span className="block text-[12px] text-ink-300 tabular-nums">
              {lastMonthLabel}: {formatRupiah(lastMonthActual)}
            </span>
          )}
        </span>
        {/* An em dash is not a state. "Not set" also drops `tabular-nums`, which is both what
            aligns the money column and what the privacy mask keys off. */}
        {amount > 0 ? (
          <span className="shrink-0 font-display text-[17px] font-bold text-ink-900 tabular-nums">
            {formatRupiah(amount)}
          </span>
        ) : (
          <span className="shrink-0 text-[13px] font-semibold text-ink-300">
            Not set
          </span>
        )}
        {/* The whole header was a button with nothing at all saying it opens (Budgets UX #6). */}
        <span
          className={`chevron shrink-0 text-ink-300 ${open ? "rotate-180" : ""}`}
        >
          <ChevronDown size={18} />
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
                {AMOUNT_LABEL[period]}
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
                Remove this month&rsquo;s override
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

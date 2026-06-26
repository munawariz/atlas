"use client";

import { formatRupiah } from "@/lib/format";
import { BUDGET_PERIODS, type BudgetPeriod } from "@/lib/types";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import { setBudget } from "../actions";

// One editable budget row. The cadence is bound to the category (shown read-only here —
// change it on the Categories page). Daily/weekly/monthly get a month scope; monthly also
// offers "all months". Yearly is a single whole-year limit and warns on save. Installments
// add on top for monthly.
export default function BudgetRow({
  id,
  name,
  kind,
  amount,
  period,
  recurring,
  month,
  instAmount,
}: {
  id: number;
  name: string;
  kind: string;
  amount: number;
  period: BudgetPeriod;
  recurring: boolean;
  month: string;
  instAmount: number;
}) {
  const per = BUDGET_PERIODS.find((p) => p.value === period)?.per ?? "month";
  const showScope = period !== "yearly";

  return (
    <form
      action={setBudget}
      onSubmit={
        period === "yearly"
          ? (e) => {
              if (
                !confirm(
                  "This is the budget for the whole year — it'll be counted as 1/12 per month in the budgeting. Continue?"
                )
              )
                e.preventDefault();
            }
          : undefined
      }
      className="card px-4 py-2.5"
    >
      <input type="hidden" name="category_id" value={id} />
      <input type="hidden" name="month" value={month} />
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium text-paper">
          <span className="truncate">{name}</span>
          <span className="shrink-0 rounded bg-ink-3 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-paper-dim">
            {period}
          </span>
          {recurring && period === "monthly" && (
            <span className="shrink-0 rounded bg-sky/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky">
              every mo
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs text-paper-faint">Rp</span>
          <MoneyInput
            name="amount"
            defaultValue={amount}
            placeholder="0"
            className="w-24 bg-transparent text-right font-display text-sm font-medium tabular-nums text-paper outline-none placeholder:text-paper-faint"
          />
          <span className="w-9 text-[10px] text-paper-faint">/{per}</span>
        </span>
      </div>

      {period === "monthly" && instAmount > 0 && (
        <p className="mt-1 text-[11px] text-plum">
          + {formatRupiah(instAmount)} from installments → effective{" "}
          <span className="text-paper-dim">{formatRupiah(amount + instAmount)}</span>
        </p>
      )}

      <div className="mt-2 flex items-center justify-end gap-2">
        {showScope && (
          <select
            name="scope"
            defaultValue={recurring ? "forward" : "month"}
            className="rounded-lg border border-line/60 bg-ink-3 px-2 py-1 text-xs text-paper-dim outline-none [color-scheme:dark]"
          >
            <option value="forward" className="bg-ink-2">This month →</option>
            {period === "monthly" && <option value="all" className="bg-ink-2">All months</option>}
            <option value="month" className="bg-ink-2">This month only</option>
          </select>
        )}
        <SubmitButton
          pendingText="Saving…"
          className="rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green active:bg-green/25"
        >
          Save
        </SubmitButton>
      </div>
    </form>
  );
}

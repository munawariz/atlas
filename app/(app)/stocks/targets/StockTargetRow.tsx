"use client";

import { formatRupiah } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import { TrashIcon } from "@/components/icons";
import { clearStockTargetMonth, deleteStockTarget, saveStockTarget } from "../actions";

// One editable target row for the selected month. Set lots/price with a scope — "Every month"
// updates the recurring base (and clears this month's override); "This month only" writes a
// per-month override. Mirrors the category BudgetRow.
export default function StockTargetRow({
  ticker,
  lots,
  price,
  source,
  hasBase,
  month,
  bought,
  cost,
  priceSource,
}: {
  ticker: string;
  lots: number;
  price: number | null;
  source: "month" | "base";
  hasBase: boolean;
  month: string;
  bought: number;
  cost: number | null;
  priceSource: "own" | "live" | "none";
}) {
  const done = bought >= lots;
  const pctT = lots ? (bought / lots) * 100 : 0;

  return (
    <div className="card space-y-2 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="font-display text-sm font-semibold text-paper">{ticker}</span>
          {source === "month" ? (
            <span className="rounded bg-sky/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky">this month</span>
          ) : (
            <span className="rounded bg-ink-3 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-paper-dim">every mo</span>
          )}
          {done && (
            <span className="rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">✓ met</span>
          )}
        </span>
        <span className="flex items-center gap-2.5">
          <span className="text-xs tabular-nums text-paper-dim">
            <span className={done ? "text-green" : "text-paper"}>{bought}</span> / {lots} lot{lots > 1 ? "s" : ""}
          </span>
          <form action={deleteStockTarget.bind(null, ticker)}>
            <SubmitButton label="Remove target" className="grid h-7 w-7 place-items-center rounded-lg text-clay active:bg-clay/10">
              <TrashIcon className="h-4 w-4" />
            </SubmitButton>
          </form>
        </span>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
        <div className={`h-full rounded-full ${done ? "bg-green" : "bg-plum"}`} style={{ width: `${Math.min(100, pctT)}%` }} />
      </div>
      <div className="text-[11px] tabular-nums text-paper-faint">
        {cost != null ? (
          <>≈ {formatRupiah(cost)}/mo{priceSource === "live" && <span className="text-paper-dim"> · live price</span>}</>
        ) : (
          <span className="text-amber">Set a price/share to include in the estimate</span>
        )}
      </div>

      <form action={saveStockTarget} className="flex items-center gap-2">
        <input type="hidden" name="ticker" value={ticker} />
        <input type="hidden" name="month" value={month} />
        <input
          name="lots"
          inputMode="numeric"
          defaultValue={lots}
          aria-label="Lots per month"
          className="field w-16 py-1.5 text-center text-sm"
        />
        <MoneyInput
          name="price"
          defaultValue={price ?? undefined}
          placeholder="Price/share"
          className="field min-w-0 flex-1 py-1.5 text-sm"
        />
        <select
          name="scope"
          defaultValue={source === "month" ? "month" : "forward"}
          aria-label="Apply to"
          className="rounded-lg border border-line/60 bg-ink-3 px-2 py-1.5 text-xs text-paper-dim outline-none [color-scheme:dark]"
        >
          <option value="forward" className="bg-ink-2">This month →</option>
          <option value="all" className="bg-ink-2">All months</option>
          <option value="month" className="bg-ink-2">This month only</option>
        </select>
        <SubmitButton pendingText="…" className="rounded-full bg-plum/20 px-3 py-1.5 text-xs font-semibold text-plum active:bg-plum/30">
          Save
        </SubmitButton>
      </form>

      {source === "month" && hasBase && (
        <form action={clearStockTargetMonth.bind(null, ticker, month)}>
          <SubmitButton className="text-[11px] text-paper-faint underline active:text-paper-dim">
            Reset to the recurring target
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { formatRupiah } from "@/lib/format";
import type { SaveScope } from "@/lib/types";
import { deleteStockTarget, revertStockTarget, saveStockTarget } from "../actions";

const SCOPES: { value: SaveScope; label: string }[] = [
  { value: "forward", label: "This month →" },
  { value: "all", label: "All months" },
  { value: "month", label: "This month only" },
];

export default function StockTargetRow({
  ticker,
  lots,
  price,
  monthKey,
  source,
  hasBase,
  bought,
  /** Where the estimate came from, so the row can say so honestly. */
  priceSource,
  estimate,
}: {
  ticker: string;
  lots: number;
  price: number | null;
  monthKey: string;
  source: "month" | "base";
  hasBase: boolean;
  bought: number;
  priceSource: "own" | "live" | "none";
  estimate: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<SaveScope>("forward");

  const pct = lots > 0 ? (bought / lots) * 100 : 0;

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full text-left"
      >
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[15px] font-bold text-ink-900">
            {ticker}
            {source === "month" && (
              <span className="badge ml-2 bg-cream-200 text-ink-700">
                this month
              </span>
            )}
          </span>
          <span className="text-[13px] text-ink-500 tabular-nums">
            {bought} / {lots} lot{lots === 1 ? "" : "s"}
          </span>
        </div>

        <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
          <div
            className="h-full rounded-full bg-forest-800"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>

        <div className="mt-1.5 text-[13px] text-ink-500 tabular-nums">
          {estimate == null ? (
            <span className="text-warning-600">
              No price — not counted in cashflow
            </span>
          ) : (
            <>
              ≈ {formatRupiah(estimate)}/mo
              <span className="text-ink-300">
                {" "}
                ·{" "}
                {priceSource === "own"
                  ? "your price"
                  : priceSource === "live"
                    ? "live price"
                    : "average buy"}
              </span>
            </>
          )}
        </div>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-[var(--border-subtle)] pt-4">
          <form action={saveStockTarget} className="space-y-2">
            <input type="hidden" name="ticker" value={ticker} />
            <input type="hidden" name="month" value={monthKey} />
            <input type="hidden" name="scope" value={scope} />

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label mb-1 block">Lots / month</span>
                <input
                  type="number"
                  name="lots"
                  min={1}
                  defaultValue={lots}
                  className="field"
                />
              </label>
              <label className="block">
                <span className="label mb-1 block">Price / share</span>
                <MoneyInput
                  name="price"
                  defaultValue={price}
                  placeholder="optional"
                  ariaLabel="Speculative price per share"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              {SCOPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setScope(option.value)}
                  aria-pressed={scope === option.value}
                  className={`chip ${scope === option.value ? "chip-on" : ""}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <SubmitButton className="btn btn-primary btn-sm w-full">
              Save target
            </SubmitButton>
          </form>

          {source === "month" && hasBase && (
            <form action={revertStockTarget}>
              <input type="hidden" name="ticker" value={ticker} />
              <input type="hidden" name="month" value={monthKey} />
              <SubmitButton className="btn btn-sm btn-ghost w-full">
                Revert to base target
              </SubmitButton>
            </form>
          )}

          <form action={deleteStockTarget}>
            <input type="hidden" name="ticker" value={ticker} />
            <SubmitButton className="btn btn-sm btn-ghost w-full text-negative-600">
              Remove {ticker} target
            </SubmitButton>
          </form>
        </div>
      )}
    </div>
  );
}

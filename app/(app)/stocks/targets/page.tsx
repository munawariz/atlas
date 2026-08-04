import Link from "next/link";
import MonthSwitcher from "@/components/MonthSwitcher";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { ChevronLeft } from "@/components/icons";
import { currentMonthKey, endOfMonth } from "@/lib/data";
import {
  LOT_SIZE,
  getAverageBuyPerLot,
  getStockPortfolio,
  getStockTargetsForMonth,
  getStockTrades,
} from "@/lib/stocks";
import { formatRupiah } from "@/lib/format";
import StockTargetRow from "./StockTargetRow";
import { saveStockTarget } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Buy targets · Atlas" };

export default async function StockTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();

  const [targets, trades, portfolio, avgBuy] = await Promise.all([
    getStockTargetsForMonth(monthKey),
    getStockTrades(endOfMonth(monthKey)),
    getStockPortfolio(),
    getAverageBuyPerLot(),
  ]);

  const boughtThisMonth = new Map<string, number>();
  for (const trade of trades) {
    if (trade.side !== "buy") continue;
    if (trade.occurred_on < monthKey) continue;
    boughtThisMonth.set(
      trade.ticker,
      (boughtThisMonth.get(trade.ticker) ?? 0) + trade.lots
    );
  }

  const livePriceOf = new Map(
    portfolio.holdings.map((h) => [h.ticker, h.price] as const)
  );

  /**
   * Price a target: its own speculative price first, then a live quote for a held ticker,
   * then the ticker's all-time average buy. Anything we cannot price is reported rather than
   * silently counted at zero.
   */
  const rows = targets.map((target) => {
    let perLot: number | null = null;
    let priceSource: "own" | "live" | "none" = "none";

    if (target.price != null) {
      perLot = target.price * LOT_SIZE;
      priceSource = "own";
    } else {
      const live = livePriceOf.get(target.ticker);
      if (live != null) {
        perLot = live * LOT_SIZE;
        priceSource = "live";
      } else {
        const avg = avgBuy.get(target.ticker);
        if (avg != null) perLot = avg;
      }
    }

    return {
      target,
      bought: boughtThisMonth.get(target.ticker) ?? 0,
      priceSource,
      estimate: perLot == null ? null : Math.round(perLot * target.lots),
    };
  });

  const estimatedTotal = rows.reduce((sum, r) => sum + (r.estimate ?? 0), 0);
  const unpriced = rows.filter((r) => r.estimate == null).length;

  return (
    <div className="space-y-4 privacy-scope">
      <header className="flex items-center gap-1">
        <Link
          href="/stocks"
          aria-label="Back to stocks"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Buy targets
        </h1>
      </header>

      <MonthSwitcher monthKey={monthKey} />

      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Estimated monthly buying
        </div>
        <div className="mt-1 font-display text-[30px] font-extrabold tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(estimatedTotal)}
        </div>
        {unpriced > 0 && (
          <p className="mt-1 text-[12px]" style={{ color: "var(--color-warning-500)" }}>
            {unpriced} target{unpriced === 1 ? " has" : "s have"} no price and{" "}
            {unpriced === 1 ? "is" : "are"} not counted here or in cashflow.
          </p>
        )}
      </section>

      <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        <summary className="px-4 py-3.5 text-[15px] font-semibold text-ink-900">
          Add a target
        </summary>
        <form
          action={saveStockTarget}
          className="space-y-2 border-t border-[var(--border-subtle)] p-4"
        >
          <input type="hidden" name="month" value={monthKey} />
          {/* A new target is a base rule that applies everywhere until overridden. */}
          <input type="hidden" name="scope" value="all" />

          <input
            name="ticker"
            placeholder="Ticker"
            aria-label="Ticker"
            required
            autoCapitalize="characters"
            className="field uppercase"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              name="lots"
              min={1}
              defaultValue={1}
              aria-label="Lots per month"
              className="field"
            />
            <MoneyInput
              name="price"
              placeholder="Price/share"
              ariaLabel="Speculative price per share"
            />
          </div>
          <SubmitButton className="btn btn-primary w-full">Add target</SubmitButton>
        </form>
      </details>

      {rows.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          No buy targets yet. Add one to plan your monthly investing.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <StockTargetRow
              key={row.target.ticker}
              ticker={row.target.ticker}
              lots={row.target.lots}
              price={row.target.price}
              monthKey={monthKey}
              source={row.target.source}
              hasBase={row.target.hasBase}
              bought={row.bought}
              priceSource={row.priceSource}
              estimate={row.estimate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

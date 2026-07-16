import Link from "next/link";
import { getStockPortfolio, getStockTargetsForMonth, getStockTrades } from "@/lib/stocks";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import MonthSwitcher from "@/components/MonthSwitcher";
import { saveStockTarget } from "../actions";
import StockTargetRow from "./StockTargetRow";

export const dynamic = "force-dynamic";

export default async function StockTargetsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const ym = monthKey.slice(0, 7);

  const [portfolio, trades, targets] = await Promise.all([
    getStockPortfolio(),
    getStockTrades(),
    getStockTargetsForMonth(monthKey),
  ]);
  const { holdings } = portfolio;

  // Lots bought per ticker in the selected month, for progress against each target.
  const boughtInMonth = new Map<string, number>();
  for (const t of trades) {
    if (t.side === "buy" && t.occurred_on.slice(0, 7) === ym) {
      const k = t.ticker.toUpperCase();
      boughtInMonth.set(k, (boughtInMonth.get(k) ?? 0) + t.lots);
    }
  }
  // Estimated monthly cash = Σ lots × 100 × price. Target's speculative price, else the
  // live price of a ticker you already hold.
  const heldPrice = new Map(holdings.filter((h) => h.price != null).map((h) => [h.ticker, h.price as number]));
  const rows = targets.map((tg) => {
    const price = tg.price ?? heldPrice.get(tg.ticker) ?? null;
    const cost = price != null ? tg.lots * 100 * price : null;
    const priceSource: "own" | "live" | "none" = tg.price != null ? "own" : heldPrice.has(tg.ticker) ? "live" : "none";
    return { ...tg, bought: boughtInMonth.get(tg.ticker) ?? 0, cost, priceSource };
  });
  const totalMonthly = rows.reduce((s, r) => s + (r.cost ?? 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/stocks" className="text-sm text-paper-dim active:text-paper">‹ Stocks</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Monthly buy targets</h1>
        <span className="w-12" />
      </div>

      <p className="px-1 text-sm text-paper-dim">
        A lots-per-month goal per ticker. Save each with a scope — <span className="text-paper-dim">This month →</span>,{" "}
        <span className="text-paper-dim">All months</span>, or <span className="text-paper-dim">This month only</span> — just
        like category budgets. Progress counts the selected month&apos;s buys; the estimate feeds your expected cashflow.
      </p>

      <MonthSwitcher monthKey={monthKey} basePath="/stocks/targets" />

      {rows.length > 0 && (
        <div className="card p-4">
          <div className="label">Est. monthly buying · {formatMonth(monthKey)}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-plum">{formatRupiah(totalMonthly)}</div>
          <div className="mt-0.5 text-[11px] text-paper-faint">
            {rows.length} target{rows.length > 1 ? "s" : ""} · at your speculative prices — budget this into cashflow
          </div>
        </div>
      )}

      {/* Add a new ticker — a base target for every month. */}
      <form action={saveStockTarget} className="card space-y-2 p-3">
        <input type="hidden" name="scope" value="all" />
        <input type="hidden" name="month" value={monthKey} />
        <div className="flex gap-2">
          <input name="ticker" placeholder="Ticker" maxLength={6} className="field w-24 uppercase" />
          <input name="lots" inputMode="numeric" placeholder="Lots/mo" className="field w-24 text-center" />
          <MoneyInput name="price" placeholder="Price/share" className="field flex-1" />
        </div>
        <SubmitButton pendingText="…" className="w-full rounded-2xl bg-plum py-2.5 font-semibold text-ink">
          Add target
        </SubmitButton>
      </form>

      {rows.length === 0 ? (
        <p className="pt-6 text-center text-sm text-paper-faint">No targets yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <StockTargetRow
              key={r.ticker}
              ticker={r.ticker}
              lots={r.lots}
              price={r.price}
              source={r.source}
              hasBase={r.hasBase}
              month={monthKey}
              bought={r.bought}
              cost={r.cost}
              priceSource={r.priceSource}
            />
          ))}
        </div>
      )}
    </div>
  );
}

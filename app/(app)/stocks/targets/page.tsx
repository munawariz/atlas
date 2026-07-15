import Link from "next/link";
import { getStockPortfolio, getStockTargets, type StockTarget, getStockTrades } from "@/lib/stocks";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import MonthSwitcher from "@/components/MonthSwitcher";
import { TrashIcon } from "@/components/icons";
import { deleteStockTarget, saveStockTarget } from "../actions";

export const dynamic = "force-dynamic";

export default async function StockTargetsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const ym = monthKey.slice(0, 7);

  const [portfolio, trades, targets] = await Promise.all([
    getStockPortfolio(),
    getStockTrades(),
    getStockTargets(),
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
  const targetCost = (tg: StockTarget) => {
    const p = tg.price ?? heldPrice.get(tg.ticker) ?? null;
    return p != null ? tg.lots * 100 * p : null;
  };
  const totalMonthly = targets.reduce((s, tg) => s + (targetCost(tg) ?? 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/stocks" className="text-sm text-paper-dim active:text-paper">‹ Stocks</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Monthly buy targets</h1>
        <span className="w-12" />
      </div>

      <p className="px-1 text-sm text-paper-dim">
        A recurring lots-per-month goal per ticker, with an optional speculative price/share.
        Progress counts the selected month&apos;s buys and resets each month; the estimated cash is summed into your expected cashflow.
      </p>

      <MonthSwitcher monthKey={monthKey} basePath="/stocks/targets" />

      {targets.length > 0 && (
        <div className="card p-4">
          <div className="label">Est. monthly buying · {formatMonth(monthKey)}</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums text-plum">{formatRupiah(totalMonthly)}</div>
          <div className="mt-0.5 text-[11px] text-paper-faint">
            {targets.length} target{targets.length > 1 ? "s" : ""} · at your speculative prices — budget this into cashflow
          </div>
        </div>
      )}

      <form action={saveStockTarget} className="card space-y-2 p-3">
        <div className="flex gap-2">
          <input name="ticker" placeholder="Ticker" maxLength={6} className="field w-24 uppercase" />
          <input name="lots" inputMode="numeric" placeholder="Lots/mo" className="field w-24 text-center" />
          <MoneyInput name="price" placeholder="Price/share" className="field flex-1" />
        </div>
        <SubmitButton pendingText="…" className="w-full rounded-2xl bg-plum py-2.5 font-semibold text-ink">
          Set target
        </SubmitButton>
      </form>

      {targets.length === 0 ? (
        <p className="pt-6 text-center text-sm text-paper-faint">No targets yet — set one above.</p>
      ) : (
        <div className="space-y-2">
          {targets.map((tg) => {
            const bought = boughtInMonth.get(tg.ticker) ?? 0;
            const pctT = tg.lots ? (bought / tg.lots) * 100 : 0;
            const done = bought >= tg.lots;
            const cost = targetCost(tg);
            const priceSource = tg.price != null ? null : heldPrice.has(tg.ticker) ? "live" : "no price";
            return (
              <div key={tg.id} className="card p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span className="font-display text-sm font-semibold text-paper">{tg.ticker}</span>
                    {done && (
                      <span className="rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">✓ met</span>
                    )}
                  </span>
                  <span className="flex items-center gap-2.5">
                    <span className="text-xs tabular-nums text-paper-dim">
                      <span className={done ? "text-green" : "text-paper"}>{bought}</span> / {tg.lots} lot{tg.lots > 1 ? "s" : ""}
                    </span>
                    <form action={deleteStockTarget.bind(null, tg.id)}>
                      <SubmitButton label="Remove target" className="grid h-7 w-7 place-items-center rounded-lg text-clay active:bg-clay/10">
                        <TrashIcon className="h-4 w-4" />
                      </SubmitButton>
                    </form>
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                  <div className={`h-full rounded-full ${done ? "bg-green" : "bg-plum"}`} style={{ width: `${Math.min(100, pctT)}%` }} />
                </div>
                <div className="mt-1.5 text-[11px] tabular-nums text-paper-faint">
                  {cost != null ? (
                    <>≈ {formatRupiah(cost)}/mo{priceSource === "live" && <span className="text-paper-dim"> · live price</span>}</>
                  ) : (
                    <span className="text-amber">Set a price/share to include in the estimate</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

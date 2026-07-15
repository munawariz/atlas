import Link from "next/link";
import { getWallets } from "@/lib/data";
import { getStockPortfolio, getStockTargets, getStockTrades, type StockTarget } from "@/lib/stocks";
import { getSettings, mappedWalletId } from "@/lib/settings";
import { formatMonth, formatRupiah, formatRupiahShort, formatDateShort, todayISO } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import { TrashIcon } from "@/components/icons";
import StockTradeForm from "./StockTradeForm";
import { deleteStockTarget, deleteStockTrade, saveStockTarget } from "./actions";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export default async function StocksPage() {
  const [portfolio, wallets, trades, targets, settings] = await Promise.all([
    getStockPortfolio(),
    getWallets(),
    getStockTrades(),
    getStockTargets(),
    getSettings(),
  ]);
  const walletOpts = wallets.map((w) => ({ id: w.id, name: w.name }));
  const defaultWalletId = mappedWalletId(settings, walletOpts, "wallet_stock", "stockbit");
  const { holdings, totalCost, pricedValue, pricedCost, totalPL, missing } = portfolio;
  const plPct = pricedCost ? (totalPL / pricedCost) * 100 : 0;
  const up = totalPL >= 0;
  const realizedTotal = trades.reduce((s, t) => s + (t.realized_pl ?? 0), 0);
  const hasRealized = trades.some((t) => t.side === "sell");

  // This month's lots bought per ticker, for progress against the monthly targets.
  const ymNow = todayISO().slice(0, 7);
  const boughtThisMonth = new Map<string, number>();
  for (const t of trades) {
    if (t.side === "buy" && t.occurred_on.slice(0, 7) === ymNow) {
      const k = t.ticker.toUpperCase();
      boughtThisMonth.set(k, (boughtThisMonth.get(k) ?? 0) + t.lots);
    }
  }
  // Estimated monthly cash needed = Σ lots × 100 shares × price. Uses the target's speculative
  // price if set, else the live price when the ticker is already held.
  const heldPrice = new Map(holdings.filter((h) => h.price != null).map((h) => [h.ticker, h.price as number]));
  const targetCost = (tg: StockTarget) => {
    const p = tg.price ?? heldPrice.get(tg.ticker) ?? null;
    return p != null ? tg.lots * 100 * p : null;
  };
  const totalMonthly = targets.reduce((s, tg) => s + (targetCost(tg) ?? 0), 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Stocks</h1>
        <span className="w-12" />
      </div>

      {/* Portfolio hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(163,113,247,0.18),transparent_70%)]" />
        <div className="label">Market value · live</div>
        <div className="mt-1.5 font-display text-3xl font-semibold tabular-nums text-paper">{formatRupiah(pricedValue)}</div>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className={`font-display font-medium ${up ? "text-green" : "text-red"}`}>
            {up ? "▲" : "▼"} {formatRupiahShort(Math.abs(totalPL))} ({pct(plPct)})
          </span>
          <span className="text-paper-faint">cost {formatRupiahShort(totalCost)}</span>
        </div>
        {hasRealized && (
          <div className="mt-2 text-[11px] text-paper-faint">
            realized P/L:{" "}
            <span className={realizedTotal >= 0 ? "text-green" : "text-red"}>
              {realizedTotal >= 0 ? "+" : ""}
              {formatRupiah(realizedTotal)}
            </span>{" "}
            (booked to Trading / Cut Loss)
          </div>
        )}
        {missing.length > 0 && (
          <p className="mt-2 text-[11px] text-amber">No live price for {missing.join(", ")} — not in the value above.</p>
        )}
      </div>

      <StockTradeForm wallets={walletOpts} defaultWalletId={defaultWalletId} />

      {/* Monthly buy targets */}
      <section className="space-y-2">
        <h2 className="label text-plum">Monthly buy target · {formatMonth(`${ymNow}-01`)}</h2>

        {targets.length > 0 && (
          <div className="card p-4">
            <div className="label">Est. monthly buying</div>
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

        {targets.length > 0 && (
          <div className="space-y-2">
            {targets.map((tg) => {
              const bought = boughtThisMonth.get(tg.ticker) ?? 0;
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
        <p className="px-1 text-[11px] text-paper-faint">
          A recurring goal per ticker — progress counts this month&apos;s buys and resets each month.
        </p>
      </section>

      {/* Holdings */}
      {holdings.length === 0 ? (
        <p className="pt-4 text-center text-sm text-paper-faint">No holdings yet. Log a buy above.</p>
      ) : (
        <section className="space-y-2">
          <h2 className="label text-plum">Holdings</h2>
          {holdings.map((h) => {
            const hUp = (h.pl ?? 0) >= 0;
            return (
              <div key={h.ticker} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-semibold text-paper">{h.ticker}</span>
                      <span className="text-xs text-paper-dim">{h.lots} lot</span>
                    </div>
                    <div className="mt-0.5 text-xs text-paper-faint">
                      avg Rp {Math.round(h.avgPerShare).toLocaleString("id-ID")}
                      {h.price != null && <> → now Rp {h.price.toLocaleString("id-ID")}</>}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-display text-sm font-bold tabular-nums text-paper">
                      {h.value != null ? formatRupiah(h.value) : "—"}
                    </div>
                    {h.pl != null && h.plPct != null && (
                      <div className={`text-xs font-medium ${hUp ? "text-green" : "text-red"}`}>
                        {hUp ? "+" : ""}
                        {formatRupiahShort(h.pl)} ({pct(h.plPct)})
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <p className="px-1 text-[11px] text-paper-faint">
            Cost is your average buy price; value uses live prices from Yahoo Finance (IDX). 1 lot = 100 shares.
          </p>
        </section>
      )}

      {/* Recent trades */}
      {trades.length > 0 && (
        <section className="space-y-2">
          <h2 className="label">Trades</h2>
          <div className="card overflow-hidden">
            {trades.slice(0, 30).map((t, i) => (
              <div key={t.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "hr-dash border-t" : ""}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-paper">
                    <span className={t.side === "buy" ? "text-plum" : "text-green"}>{t.side === "buy" ? "Buy" : "Sell"}</span>{" "}
                    {t.ticker} <span className="text-xs text-paper-dim">{t.lots} lot{t.opening ? " · opening" : ""}</span>
                  </div>
                  <div className="text-xs text-paper-faint">
                    {formatDateShort(t.occurred_on)} · {formatRupiah(t.idr)}
                    {t.side === "sell" && t.realized_pl != null && (
                      <span className={t.realized_pl >= 0 ? "text-green" : "text-red"}>
                        {" · "}
                        {t.realized_pl >= 0 ? "profit " : "loss "}
                        {formatRupiahShort(Math.abs(t.realized_pl))}
                      </span>
                    )}
                  </div>
                </div>
                <form action={deleteStockTrade.bind(null, t.id)}>
                  <SubmitButton label="Delete trade" className="grid h-8 w-8 place-items-center rounded-lg text-clay active:bg-clay/10">
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

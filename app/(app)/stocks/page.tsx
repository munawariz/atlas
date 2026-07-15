import Link from "next/link";
import { getWallets } from "@/lib/data";
import { getStockDividends, getStockPortfolio, getStockTargets, getStockTrades, type StockDividend, type StockTarget, type StockTrade } from "@/lib/stocks";
import { getSettings, mappedWalletId } from "@/lib/settings";
import { formatRupiah, formatRupiahShort, formatDateShort, todayISO } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import StockTradeForm from "./StockTradeForm";
import StockDividendForm from "./StockDividendForm";
import { deleteStockDividend, deleteStockTrade } from "./actions";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-paper-faint">{label}</span>
      <span className={`tabular-nums ${tone ?? "text-paper"}`}>{value}</span>
    </div>
  );
}

export default async function StocksPage() {
  const [portfolio, wallets, trades, targets, dividends, settings] = await Promise.all([
    getStockPortfolio(),
    getWallets(),
    getStockTrades(),
    getStockTargets(),
    getStockDividends(),
    getSettings(),
  ]);
  const walletOpts = wallets.map((w) => ({ id: w.id, name: w.name }));
  const defaultWalletId = mappedWalletId(settings, walletOpts, "wallet_stock", "stockbit");
  const { holdings, totalCost, pricedValue, pricedCost, totalPL, missing } = portfolio;
  const plPct = pricedCost ? (totalPL / pricedCost) * 100 : 0;
  const up = totalPL >= 0;
  const realizedTotal = trades.reduce((s, t) => s + (t.realized_pl ?? 0), 0);
  const hasRealized = trades.some((t) => t.side === "sell");

  const ymNow = todayISO().slice(0, 7);
  // Estimated monthly cash needed = Σ lots × 100 shares × price. Uses the target's speculative
  // price if set, else the live price when the ticker is already held.
  const heldPrice = new Map(holdings.filter((h) => h.price != null).map((h) => [h.ticker, h.price as number]));
  const targetCost = (tg: StockTarget) => {
    const p = tg.price ?? heldPrice.get(tg.ticker) ?? null;
    return p != null ? tg.lots * 100 * p : null;
  };
  const totalMonthly = targets.reduce((s, tg) => s + (targetCost(tg) ?? 0), 0);

  // Lifetime dividends per ticker (kept even after you sell out) + this-year total.
  const divByTicker = new Map<string, number>();
  for (const d of dividends) divByTicker.set(d.ticker, (divByTicker.get(d.ticker) ?? 0) + d.idr);
  const totalDividends = dividends.reduce((s, d) => s + d.idr, 0);
  const yearNow = ymNow.slice(0, 4);
  const dividendsThisYear = dividends.filter((d) => d.occurred_on.slice(0, 4) === yearNow).reduce((s, d) => s + d.idr, 0);
  const divTickerRows = [...divByTicker.entries()].sort((a, b) => b[1] - a[1]);

  // Per-ticker trade & dividend history, for the expandable holding cards.
  const tradesByTicker = new Map<string, StockTrade[]>();
  for (const t of trades) {
    const k = t.ticker.toUpperCase();
    const arr = tradesByTicker.get(k) ?? [];
    arr.push(t);
    tradesByTicker.set(k, arr);
  }
  const divsByTicker = new Map<string, StockDividend[]>();
  for (const d of dividends) {
    const k = d.ticker.toUpperCase();
    const arr = divsByTicker.get(k) ?? [];
    arr.push(d);
    divsByTicker.set(k, arr);
  }

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

      {/* Monthly buy targets → managed on their own page */}
      <Link href="/stocks/targets" className="card flex items-center justify-between p-4 transition-colors active:bg-ink-3">
        <div className="min-w-0">
          <div className="label text-plum">Monthly buy targets</div>
          {targets.length > 0 ? (
            <div className="mt-0.5 text-sm">
              <span className="font-display font-semibold tabular-nums text-plum">{formatRupiah(totalMonthly)}</span>
              <span className="text-paper-faint">/mo · {targets.length} target{targets.length > 1 ? "s" : ""}</span>
            </div>
          ) : (
            <div className="mt-0.5 text-xs text-paper-dim">Set recurring lots-per-month goals per ticker</div>
          )}
        </div>
        <span className="shrink-0 text-plum/70">›</span>
      </Link>

      {/* Holdings */}
      {holdings.length === 0 ? (
        <p className="pt-4 text-center text-sm text-paper-faint">No holdings yet. Log a buy above.</p>
      ) : (
        <section className="space-y-2">
          <h2 className="label text-plum">Holdings</h2>
          {holdings.map((h) => {
            const hUp = (h.pl ?? 0) >= 0;
            const dv = divByTicker.get(h.ticker) ?? 0;
            const tks = tradesByTicker.get(h.ticker) ?? [];
            const dvs = divsByTicker.get(h.ticker) ?? [];
            const invested = tks.filter((t) => t.side === "buy").reduce((s, t) => s + t.idr, 0);
            const proceeds = tks.filter((t) => t.side === "sell").reduce((s, t) => s + t.idr, 0);
            const realized = tks.reduce((s, t) => s + (t.realized_pl ?? 0), 0);
            const hasSells = tks.some((t) => t.side === "sell");
            // Merged buy/sell/dividend timeline, newest first.
            type Ev = { date: string; kind: "buy" | "sell" | "dividend"; lots?: number; idr: number; pl?: number | null; note?: string | null };
            const events: Ev[] = [
              ...tks.map((t) => ({ date: t.occurred_on, kind: t.side, lots: t.lots, idr: t.idr, pl: t.realized_pl, note: t.opening ? "opening" : null })),
              ...dvs.map((d) => ({ date: d.occurred_on, kind: "dividend" as const, idr: d.idr, note: d.note })),
            ].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

            return (
              <details key={h.ticker} className="card group overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between gap-3 p-4 transition-colors active:bg-ink-3">
                  <div className="min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-base font-semibold text-paper">{h.ticker}</span>
                      <span className="text-xs text-paper-dim">{h.lots} lot</span>
                    </div>
                    <div className="mt-0.5 text-xs text-paper-faint">
                      avg Rp {Math.round(h.avgPerShare).toLocaleString("id-ID")}
                      {h.price != null && <> → now Rp {h.price.toLocaleString("id-ID")}</>}
                    </div>
                    {dv > 0 && (
                      <div className="mt-0.5 text-[11px] text-green">
                        ◈ dividends {formatRupiah(dv)}
                        {h.cost ? <span className="text-paper-faint"> · {((dv / h.cost) * 100).toFixed(1)}% on cost</span> : null}
                      </div>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
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
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-4 w-4 text-plum/70 transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                  </div>
                </summary>

                <div className="border-t border-line/40 px-4 py-3">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    <Stat label="Invested" value={formatRupiah(invested)} />
                    <Stat label="Cost basis now" value={formatRupiah(h.cost)} />
                    {dv > 0 && <Stat label="Dividends" value={formatRupiah(dv)} tone="text-green" />}
                    {hasSells && <Stat label="Sold (proceeds)" value={formatRupiah(proceeds)} />}
                    {hasSells && (
                      <Stat label="Realized P/L" value={`${realized >= 0 ? "+" : ""}${formatRupiah(realized)}`} tone={realized >= 0 ? "text-green" : "text-red"} />
                    )}
                  </div>

                  <div className="mt-3 border-t border-line/30 pt-2">
                    <div className="label mb-1.5">History</div>
                    <div className="space-y-1.5">
                      {events.map((e, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-2 text-xs">
                          <span className="min-w-0">
                            <span
                              className={
                                e.kind === "buy" ? "font-medium text-plum" : e.kind === "sell" ? "font-medium text-green" : "font-medium text-green"
                              }
                            >
                              {e.kind === "buy" ? "Buy" : e.kind === "sell" ? "Sell" : "Dividend"}
                            </span>{" "}
                            {e.lots != null && <span className="text-paper-dim">{e.lots} lot </span>}
                            <span className="text-paper-faint">{formatDateShort(e.date)}</span>
                            {e.note && <span className="text-paper-faint"> · {e.note}</span>}
                          </span>
                          <span className="shrink-0 text-right tabular-nums">
                            <span className="text-paper">{formatRupiah(e.idr)}</span>
                            {e.kind === "sell" && e.pl != null && (
                              <span className={e.pl >= 0 ? "text-green" : "text-red"}>
                                {" "}
                                ({e.pl >= 0 ? "+" : ""}
                                {formatRupiahShort(e.pl)})
                              </span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            );
          })}
          <p className="px-1 text-[11px] text-paper-faint">
            Cost is your average buy price; value uses live prices from Yahoo Finance (IDX). 1 lot = 100 shares.
          </p>
        </section>
      )}

      {/* Dividends */}
      <section className="space-y-2">
        <h2 className="label text-green">Dividends</h2>

        {dividends.length > 0 && (
          <div className="card p-4">
            <div className="label">Total received</div>
            <div className="mt-1 font-display text-2xl font-bold tabular-nums text-green">{formatRupiah(totalDividends)}</div>
            <div className="mt-0.5 text-[11px] text-paper-faint">
              {dividends.length} payment{dividends.length > 1 ? "s" : ""}
              {dividendsThisYear > 0 && <> · {formatRupiah(dividendsThisYear)} in {yearNow}</>}
            </div>
            {divTickerRows.length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-line/40 pt-3">
                {divTickerRows.map(([tk, amt]) => (
                  <div key={tk} className="flex items-baseline justify-between text-sm">
                    <span className="text-paper">{tk}</span>
                    <span className="tabular-nums text-paper-dim">{formatRupiah(amt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <StockDividendForm wallets={walletOpts} defaultWalletId={defaultWalletId} tickers={holdings.map((h) => h.ticker)} />

        {dividends.length > 0 && (
          <div className="card overflow-hidden">
            {dividends.slice(0, 30).map((d, i) => (
              <div key={d.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? "hr-dash border-t" : ""}`}>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-paper">
                    <span className="text-green">{d.ticker}</span> {formatRupiah(d.idr)}
                  </div>
                  <div className="text-xs text-paper-faint">
                    {formatDateShort(d.occurred_on)}
                    {d.note ? ` · ${d.note}` : ""}
                  </div>
                </div>
                <form action={deleteStockDividend.bind(null, d.id)}>
                  <SubmitButton label="Delete dividend" className="grid h-8 w-8 place-items-center rounded-lg text-clay active:bg-clay/10">
                    <TrashIcon className="h-[18px] w-[18px]" />
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>
        )}
        <p className="px-1 text-[11px] text-paper-faint">
          Logged as income (Dividen) into the chosen wallet. Lifetime total is tracked per ticker, even after you sell out.
        </p>
      </section>

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

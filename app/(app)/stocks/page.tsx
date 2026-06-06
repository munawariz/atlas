import Link from "next/link";
import { getWallets } from "@/lib/data";
import { getStockPortfolio, getStockTrades } from "@/lib/stocks";
import { formatRupiah, formatRupiahShort, formatDateShort } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import StockTradeForm from "./StockTradeForm";
import { deleteStockTrade } from "./actions";

export const dynamic = "force-dynamic";

const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;

export default async function StocksPage() {
  const [portfolio, wallets, trades] = await Promise.all([getStockPortfolio(), getWallets(), getStockTrades()]);
  const { holdings, totalCost, pricedValue, pricedCost, totalPL, missing } = portfolio;
  const plPct = pricedCost ? (totalPL / pricedCost) * 100 : 0;
  const up = totalPL >= 0;
  const realizedTotal = trades.reduce((s, t) => s + (t.realized_pl ?? 0), 0);
  const hasRealized = trades.some((t) => t.side === "sell");

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

      <StockTradeForm wallets={wallets.map((w) => ({ id: w.id, name: w.name }))} />

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

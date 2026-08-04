import Link from "next/link";
import PrivacyToggle from "@/components/PrivacyToggle";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import SubmitButton from "@/components/SubmitButton";
import { ChevronRight, Trash } from "@/components/icons";
import {
  getStockDividends,
  getStockPortfolio,
  getStockTargetsForMonth,
  getStockTrades,
  LOT_SIZE,
} from "@/lib/stocks";
import { currentMonthKey, getWallets } from "@/lib/data";
import { getSettings, mappedWalletId } from "@/lib/settings";
import { formatDateShort, formatNumber, formatRupiah } from "@/lib/format";
import { StockDividendForm, StockTradeForm } from "./StockForms";
import { deleteStockDividend, deleteStockTrade } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Stocks · Atlas" };

export default async function StocksPage() {
  const monthKey = currentMonthKey();

  const [portfolio, trades, dividends, wallets, settings, targets] =
    await Promise.all([
      getStockPortfolio(),
      getStockTrades(),
      getStockDividends(),
      getWallets(),
      getSettings(),
      getStockTargetsForMonth(monthKey),
    ]);

  const defaultWalletId = mappedWalletId(settings, wallets, "wallet_stock");

  const pctPl =
    portfolio.pricedCost > 0
      ? (portfolio.unrealizedPl / portfolio.pricedCost) * 100
      : 0;

  const tickers = [
    ...new Set([
      ...portfolio.holdings.map((h) => h.ticker),
      ...trades.map((t) => t.ticker),
    ]),
  ].sort();

  // Per-ticker dividend totals survive selling out, which is why they live in their own table.
  const dividendByTicker = new Map<string, number>();
  for (const dividend of dividends) {
    dividendByTicker.set(
      dividend.ticker,
      (dividendByTicker.get(dividend.ticker) ?? 0) + dividend.idr
    );
  }

  const targetLots = targets.reduce((sum, t) => sum + t.lots, 0);

  return (
    <div className="space-y-5 privacy-scope">
      <RefreshOnFocus />

      <header className="flex items-start justify-between gap-3">
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Stocks
        </h1>
        <PrivacyToggle className="text-forest-800 hover:bg-forest-50" />
      </header>

      {/* --- Portfolio hero ------------------------------------------------ */}
      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Market value
        </div>
        <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(portfolio.pricedValue)}
        </div>
        <div
          className="mt-1.5 text-[13px] font-semibold tabular-nums"
          style={{
            color:
              portfolio.unrealizedPl >= 0
                ? "var(--color-lime-500)"
                : "var(--color-negative-500)",
          }}
        >
          {portfolio.unrealizedPl >= 0 ? "▲" : "▼"}{" "}
          {formatRupiah(Math.abs(portfolio.unrealizedPl))} ({pctPl.toFixed(1)}%)
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {[
            { label: "Cost basis", value: portfolio.pricedCost },
            { label: "Realized P/L", value: portfolio.lifetimeRealizedPl },
          ].map((cell) => (
            <div
              key={cell.label}
              className="rounded-[14px] p-3"
              style={{ background: "rgb(255 255 255 / 0.08)" }}
            >
              <div className="label" style={{ color: "var(--color-forest-300)" }}>
                {cell.label}
              </div>
              <div className="font-display text-[16px] font-bold text-white tabular-nums">
                {formatRupiah(cell.value)}
              </div>
            </div>
          ))}
        </div>

        {portfolio.missing.length > 0 && (
          <p
            className="mt-3 text-[12px]"
            style={{ color: "var(--color-warning-500)" }}
          >
            No live price for {portfolio.missing.join(", ")} — excluded from the
            value and P/L above, so the percentage stays honest.
          </p>
        )}
      </section>

      {/* --- Trade form ---------------------------------------------------- */}
      <section>
        <h2 className="label mb-3">Record a trade</h2>
        <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
          <StockTradeForm wallets={wallets} defaultWalletId={defaultWalletId} />
        </div>
      </section>

      {/* --- Targets link -------------------------------------------------- */}
      <Link
        href="/stocks/targets"
        className="flex items-center gap-3 rounded-[var(--radius-card)] bg-sage-100 p-4 no-underline"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-semibold text-ink-900">
            Monthly buy targets
          </span>
          <span className="block text-[13px] text-ink-700">
            {targets.length === 0
              ? "None set yet"
              : `${targets.length} ticker${targets.length === 1 ? "" : "s"} · ${targetLots} lot${targetLots === 1 ? "" : "s"} a month`}
          </span>
        </span>
        <ChevronRight size={18} className="shrink-0 text-forest-800" />
      </Link>

      {/* --- Holdings ------------------------------------------------------ */}
      <section>
        <h2 className="label mb-3">Holdings</h2>
        {portfolio.holdings.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            No open positions.
          </p>
        ) : (
          <div className="space-y-2">
            {portfolio.holdings.map((holding) => {
              const timeline = [
                ...trades
                  .filter((t) => t.ticker === holding.ticker)
                  .map((t) => ({
                    id: `t${t.id}`,
                    date: t.occurred_on,
                    label: `${t.side === "buy" ? "Buy" : "Sell"} ${t.lots} lot`,
                    amount: t.idr,
                    tone: t.side === "buy" ? "text-ink-900" : "text-positive-600",
                  })),
                ...dividends
                  .filter((d) => d.ticker === holding.ticker)
                  .map((d) => ({
                    id: `d${d.id}`,
                    date: d.occurred_on,
                    label: "Dividend",
                    amount: d.idr,
                    tone: "text-positive-600",
                  })),
              ].sort((a, b) => (a.date < b.date ? 1 : -1));

              const dividendPct =
                holding.costBasis > 0
                  ? (holding.dividends / holding.costBasis) * 100
                  : 0;

              return (
                <details
                  key={holding.ticker}
                  className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]"
                >
                  <summary className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-ink-900">
                        {holding.ticker}
                      </span>
                      <span className="block text-[13px] text-ink-500 tabular-nums">
                        {holding.lots} lot{holding.lots === 1 ? "" : "s"} ·{" "}
                        {formatNumber(Math.round(holding.avgPerShare))}
                        {holding.price != null && (
                          <> → {formatNumber(Math.round(holding.price))}</>
                        )}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[15px] font-bold text-ink-900 tabular-nums">
                        {holding.value == null
                          ? "—"
                          : formatRupiah(holding.value)}
                      </span>
                      {holding.unrealizedPl != null && (
                        <span
                          className={`block text-[12px] font-semibold tabular-nums ${
                            holding.unrealizedPl >= 0
                              ? "text-positive-600"
                              : "text-negative-600"
                          }`}
                        >
                          {holding.unrealizedPl >= 0 ? "▲" : "▼"}{" "}
                          {formatRupiah(Math.abs(holding.unrealizedPl))}
                        </span>
                      )}
                    </span>

                    <span className="chevron shrink-0 text-ink-300">
                      <ChevronRight size={18} />
                    </span>
                  </summary>

                  <div className="border-t border-[var(--border-subtle)] p-4">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                      {[
                        ["Invested", formatRupiah(holding.invested)],
                        ["Cost basis now", formatRupiah(holding.costBasis)],
                        [
                          "Dividends",
                          `${formatRupiah(holding.dividends)}${
                            dividendPct > 0 ? ` (${dividendPct.toFixed(1)}%)` : ""
                          }`,
                        ],
                        ["Proceeds", formatRupiah(holding.proceeds)],
                        ["Realized P/L", formatRupiah(holding.realizedPl)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="text-ink-500">{label}</dt>
                          <dd className="font-semibold text-ink-900 tabular-nums">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>

                    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
                      <div className="label mb-1.5">Timeline</div>
                      <ul className="space-y-1">
                        {timeline.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-baseline justify-between gap-2 text-[13px]"
                          >
                            <span className="text-ink-700">
                              {entry.label}
                              <span className="ml-1.5 text-ink-300">
                                {formatDateShort(entry.date)}
                              </span>
                            </span>
                            <span
                              className={`font-semibold tabular-nums ${entry.tone}`}
                            >
                              {formatRupiah(entry.amount)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </section>

      {/* --- Dividends ----------------------------------------------------- */}
      <section>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <h2 className="label">Dividends</h2>
          <span className="text-[13px] font-semibold text-positive-600 tabular-nums">
            {formatRupiah(portfolio.totalDividends)} received
          </span>
        </div>

        <div className="space-y-2">
          <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
            <StockDividendForm
              wallets={wallets}
              defaultWalletId={defaultWalletId}
              tickers={tickers}
            />
          </div>

          {dividendByTicker.size > 0 && (
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
              {[...dividendByTicker.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([ticker, total], i) => (
                  <div
                    key={ticker}
                    className={`flex items-baseline justify-between gap-2 px-4 py-2.5 ${
                      i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                    }`}
                  >
                    <span className="text-[14px] font-medium text-ink-900">
                      {ticker}
                    </span>
                    <span className="text-[14px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiah(total)}
                    </span>
                  </div>
                ))}
            </div>
          )}

          {dividends.length > 0 && (
            <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
              <summary className="px-4 py-3 text-[14px] font-semibold text-ink-900">
                Dividend log ({dividends.length})
              </summary>
              <div className="border-t border-[var(--border-subtle)]">
                {dividends.map((dividend, i) => (
                  <div
                    key={dividend.id}
                    className={`flex items-center gap-2 px-4 py-2.5 ${
                      i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink-900">
                        {dividend.ticker}
                      </span>
                      <span className="block text-[12px] text-ink-500">
                        {formatDateShort(dividend.occurred_on)}
                        {dividend.note && ` · ${dividend.note}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiah(dividend.idr)}
                    </span>
                    <form action={deleteStockDividend.bind(null, dividend.id)}>
                      <SubmitButton
                        label={`Delete ${dividend.ticker} dividend`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-negative-600"
                      >
                        <Trash size={16} />
                      </SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* --- Recent trades -------------------------------------------------- */}
      {trades.length > 0 && (
        <section>
          <h2 className="label mb-3">Recent trades</h2>
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
            {[...trades]
              .reverse()
              .slice(0, 20)
              .map((trade, i) => (
                <div
                  key={trade.id}
                  className={`flex items-center gap-2 px-4 py-2.5 ${
                    i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink-900">
                      {trade.side === "buy" ? "Buy" : "Sell"} {trade.ticker}{" "}
                      {trade.lots} lot
                      {trade.opening && (
                        <span className="badge ml-1.5 bg-cream-200 text-ink-700">
                          opening
                        </span>
                      )}
                    </span>
                    <span className="block text-[12px] text-ink-500">
                      {formatDateShort(trade.occurred_on)}
                      {trade.realized_pl != null && trade.realized_pl !== 0 && (
                        <span
                          className={
                            trade.realized_pl > 0
                              ? "text-positive-600"
                              : "text-negative-600"
                          }
                        >
                          {" "}
                          · {trade.realized_pl > 0 ? "+" : "−"}
                          {formatRupiah(Math.abs(trade.realized_pl))}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                    {formatRupiah(trade.idr)}
                  </span>
                  <form action={deleteStockTrade.bind(null, trade.id)}>
                    <SubmitButton
                      label={`Delete ${trade.ticker} trade`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-negative-600"
                    >
                      <Trash size={16} />
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

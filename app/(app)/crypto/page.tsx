import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import FormSheet from "@/components/FormSheet";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { ChevronRight } from "@/components/icons";
import { getCryptoPortfolio, getCryptoTrades } from "@/lib/crypto";
import { getWallets } from "@/lib/data";
import { getSettings, mappedWalletId } from "@/lib/settings";
import {
  formatDateShort,
  formatNumber,
  formatRupiah,
  formatUnits,
} from "@/lib/format";
import CryptoTradeForm from "./CryptoTradeForm";
import { deleteCryptoTrade } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Crypto · Atlas" };

export default async function CryptoPage() {
  const [portfolio, trades, wallets, settings] = await Promise.all([
    getCryptoPortfolio(),
    getCryptoTrades(),
    getWallets(),
    getSettings(),
  ]);

  const defaultWalletId = mappedWalletId(settings, wallets, "wallet_crypto");

  const pctPl =
    portfolio.pricedCost > 0
      ? (portfolio.unrealizedPl / portfolio.pricedCost) * 100
      : 0;

  const symbols = [
    ...new Set([
      ...portfolio.holdings.map((h) => h.symbol),
      ...trades.map((t) => t.symbol),
    ]),
  ].sort();

  return (
    <div className="space-y-5 privacy-scope">
      <RefreshOnFocus />

      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Crypto
        </h1>
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

      {/* --- Trade form: a sheet, not permanently inline -------------------- */}
      <FormSheet triggerLabel="Record a trade" title="Record a trade">
        <CryptoTradeForm
          wallets={wallets}
          defaultWalletId={defaultWalletId}
          symbols={symbols}
        />
      </FormSheet>

      {/* --- Holdings ------------------------------------------------------ */}
      <section>
        <h2 className="label mb-3">Holdings</h2>
        {portfolio.holdings.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            No coins held yet.
          </p>
        ) : (
          <div className="space-y-2">
            {portfolio.holdings.map((holding) => {
              const timeline = trades
                .filter((t) => t.symbol === holding.symbol)
                .map((t) => ({
                  id: t.id,
                  date: t.occurred_on,
                  label: `${t.side === "buy" ? "Buy" : "Sell"} ${formatUnits(t.units)}${
                    t.opening ? " · opening" : ""
                  }`,
                  amount: t.idr,
                  tone: t.side === "buy" ? "text-ink-900" : "text-positive-600",
                }));

              return (
                <details
                  key={holding.symbol}
                  className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]"
                >
                  <summary className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-ink-900">
                        {holding.symbol}
                      </span>
                      <span className="block text-[13px] text-ink-500 tabular-nums">
                        {formatUnits(holding.units)} ·{" "}
                        {formatNumber(Math.round(holding.avgPerUnit))}
                        {holding.price != null && (
                          <> → {formatNumber(Math.round(holding.price))}</>
                        )}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-[15px] font-bold text-ink-900 tabular-nums">
                        {holding.value == null ? "—" : formatRupiah(holding.value)}
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

      {/* --- Recent activity ----------------------------------------------- */}
      {trades.length > 0 && (
        <section>
          <h2 className="label mb-3">Recent activity</h2>
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
            {trades.slice(0, 30).map((trade, i) => (
              <div
                key={trade.id}
                className={`flex items-center gap-2 px-4 py-2.5 ${
                  i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink-900">
                    {trade.side === "buy" ? "Buy" : "Sell"}{" "}
                    {formatUnits(trade.units)} {trade.symbol}
                    {trade.opening && " · opening"}
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
                <ConfirmDeleteButton
                  action={deleteCryptoTrade.bind(null, trade.id)}
                  message={`Delete this ${trade.side} of ${formatUnits(trade.units)} ${trade.symbol}? Every ledger row it booked is removed too.`}
                  triggerLabel={`Delete ${trade.symbol} ${trade.side}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

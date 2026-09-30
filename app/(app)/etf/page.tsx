import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import FormSheet from "@/components/FormSheet";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { ChevronRight } from "@/components/icons";
import { getEtfPortfolio, getEtfTrades, type EtfTrade } from "@/lib/etf";
import { getWallets } from "@/lib/data";
import { getSettings, mappedWalletId } from "@/lib/settings";
import {
  formatDateShort,
  formatRupiah,
  formatUnits,
  formatUsd,
} from "@/lib/format";
import { EtfAddBrokerSheet, EtfMoveForm, EtfTradeForm } from "./EtfForms";
import { deleteEtfBroker, deleteEtfTrade } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "ETF · Atlas" };

const SIDE_LABEL: Record<EtfTrade["side"], string> = {
  topup: "Top up",
  withdraw: "Withdraw",
  buy: "Buy",
  sell: "Sell",
  dividend: "Dividend",
};

function tradeLabel(trade: EtfTrade): string {
  if (trade.side === "topup" || trade.side === "withdraw") {
    return SIDE_LABEL[trade.side];
  }
  if (trade.side === "dividend") return `Dividend ${trade.ticker}`;
  return `${SIDE_LABEL[trade.side]} ${formatUnits(trade.units ?? 0)} ${trade.ticker}`;
}

function signed(n: number, fmt: (v: number) => string): string {
  return `${n >= 0 ? "▲" : "▼"} ${fmt(Math.abs(n))}`;
}

export default async function EtfPage() {
  const [portfolio, trades, wallets, settings] = await Promise.all([
    getEtfPortfolio(),
    getEtfTrades(),
    getWallets(),
    getSettings(),
  ]);

  const defaultWalletId = mappedWalletId(settings, wallets, "wallet_etf");
  const brokers = portfolio.brokers.map((b) => ({ id: b.account.id, name: b.account.name }));
  const brokerName = new Map(brokers.map((b) => [b.id, b.name]));
  const multiBroker = brokers.length > 1;

  const tickers = [
    ...new Set(trades.map((t) => t.ticker).filter((t): t is string => !!t)),
  ].sort();

  const pctPl =
    portfolio.pricedCostUsd > 0
      ? (portfolio.unrealizedUsd / portfolio.pricedCostUsd) * 100
      : 0;

  // Rupiah P/L is only honest when every holding is priced and the rate is live — otherwise
  // the value side would be missing pieces the cost side still counts.
  const valueIdr =
    portfolio.rate > 0 ? Math.round(portfolio.totalValueUsd * portfolio.rate) : null;
  const rupiahPl =
    valueIdr !== null && portfolio.missing.length === 0
      ? valueIdr - portfolio.costIdr
      : null;

  const holdings = portfolio.brokers.flatMap((b) =>
    b.holdings.map((h) => ({ ...h, broker: b.account.name, key: `${b.account.id}:${h.ticker}` }))
  );
  const closed = portfolio.brokers.flatMap((b) =>
    b.closed.map((p) => ({ ...p, broker: b.account.name, key: `${b.account.id}:${p.ticker}` }))
  );

  return (
    <div className="space-y-5 privacy-scope">
      <RefreshOnFocus />

      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          ETF
        </h1>
      </header>

      {brokers.length === 0 ? (
        <section className="space-y-3 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-xs)]">
          <p className="text-[14px] text-ink-700">
            ETFs live at a broker that holds <strong>US dollars</strong>. Top up from a
            wallet at the rate you got, then record buys, sells and dividends in USD.
            Only top-ups and withdrawals touch your rupiah books.
          </p>
          <EtfAddBrokerSheet />
        </section>
      ) : (
        <>
          {/* --- Portfolio hero ---------------------------------------------- */}
          <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
            <div className="label" style={{ color: "var(--color-forest-300)" }}>
              Total value · cash + holdings
            </div>
            <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
              {formatUsd(portfolio.totalValueUsd)}
            </div>
            {valueIdr !== null && (
              <div
                className="mt-1 text-[13px] tabular-nums"
                style={{ color: "var(--color-forest-200)" }}
              >
                ≈ {formatRupiah(valueIdr)} at {formatRupiah(Math.round(portfolio.rate))} / $
              </div>
            )}
            {portfolio.pricedCostUsd > 0 && (
              <div
                className="mt-1.5 text-[13px] font-semibold tabular-nums"
                style={{
                  color:
                    portfolio.unrealizedUsd >= 0
                      ? "var(--color-lime-500)"
                      : "var(--color-negative-500)",
                }}
              >
                {signed(portfolio.unrealizedUsd, formatUsd)} ({pctPl.toFixed(1)}%) on
                holdings
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {[
                { label: "USD cash", value: formatUsd(portfolio.cashUsd) },
                { label: "Dividends", value: formatUsd(portfolio.dividendsUsd) },
                { label: "Rupiah in", value: formatRupiah(portfolio.costIdr) },
                {
                  label: "Rupiah P/L",
                  value: rupiahPl === null ? "—" : signed(rupiahPl, formatRupiah),
                },
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
                    {cell.value}
                  </div>
                </div>
              ))}
            </div>

            <p
              className="mt-3 text-[12px] tabular-nums"
              style={{ color: "var(--color-forest-300)" }}
            >
              Realized {formatUsd(portfolio.realizedUsd)} on sales ·{" "}
              {formatRupiah(portfolio.realizedIdr)} on withdrawals
              {portfolio.feesIdr > 0 && (
                <> · {formatRupiah(portfolio.feesIdr)} fees &amp; tax paid</>
              )}
            </p>

            {portfolio.missing.length > 0 && (
              <p
                className="mt-2 text-[12px]"
                style={{ color: "var(--color-warning-500)" }}
              >
                No live price for {portfolio.missing.join(", ")}. It is left out of the
                value and P/L above, and Rupiah P/L is hidden until it prices.
              </p>
            )}
          </section>

          {/* --- Entry sheets -------------------------------------------------- */}
          <div className="grid grid-cols-2 gap-2">
            <FormSheet triggerLabel="Top up / withdraw" title="Top up or withdraw">
              <EtfMoveForm
                brokers={brokers}
                wallets={wallets}
                defaultWalletId={defaultWalletId}
              />
            </FormSheet>
            <FormSheet triggerLabel="Record a trade" title="Record a trade">
              <EtfTradeForm brokers={brokers} tickers={tickers} />
            </FormSheet>
          </div>

          {/* --- Holdings ------------------------------------------------------ */}
          <section>
            <h2 className="label mb-3">Holdings</h2>
            {holdings.length === 0 ? (
              <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
                No ETFs held yet.
              </p>
            ) : (
              <div className="space-y-2">
                {holdings.map((holding) => (
                  <details
                    key={holding.key}
                    className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]"
                  >
                    <summary className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-bold text-ink-900">
                          {holding.ticker}
                          {multiBroker && (
                            <span className="ml-1.5 text-[12px] font-medium text-ink-500">
                              {holding.broker}
                            </span>
                          )}
                        </span>
                        <span className="block text-[13px] text-ink-500 tabular-nums">
                          {formatUnits(holding.units)} · {formatUsd(holding.avgUsd)}
                          {holding.priceUsd != null && (
                            <> → {formatUsd(holding.priceUsd)}</>
                          )}
                        </span>
                      </span>

                      <span className="shrink-0 text-right">
                        <span className="block text-[15px] font-bold text-ink-900 tabular-nums">
                          {holding.valueUsd == null ? "—" : formatUsd(holding.valueUsd)}
                        </span>
                        {holding.unrealizedUsd != null && (
                          <span
                            className={`block text-[12px] font-semibold tabular-nums ${
                              holding.unrealizedUsd >= 0
                                ? "text-positive-600"
                                : "text-negative-600"
                            }`}
                          >
                            {signed(holding.unrealizedUsd, formatUsd)}
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
                          ["Invested", formatUsd(holding.costUsd)],
                          ["In rupiah", formatRupiah(Math.round(holding.costIdr))],
                          ["Realized P/L", formatUsd(holding.realizedUsd)],
                          ["Dividends", formatUsd(holding.dividendsUsd)],
                        ].map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-2">
                            <dt className="text-ink-500">{label}</dt>
                            <dd className="font-semibold text-ink-900 tabular-nums">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  </details>
                ))}
              </div>
            )}

            {closed.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
                <div className="label px-4 pt-3">Sold out</div>
                {closed.map((p) => (
                  <div
                    key={p.key}
                    className="flex items-baseline justify-between gap-2 px-4 py-2 text-[13px]"
                  >
                    <span className="text-ink-700">
                      {p.ticker}
                      {multiBroker && <span className="ml-1.5 text-ink-300">{p.broker}</span>}
                    </span>
                    <span className="tabular-nums text-ink-500">
                      P/L{" "}
                      <span
                        className={`font-semibold ${
                          p.realizedUsd >= 0 ? "text-positive-600" : "text-negative-600"
                        }`}
                      >
                        {formatUsd(p.realizedUsd)}
                      </span>
                      {p.dividendsUsd > 0 && <> · div {formatUsd(p.dividendsUsd)}</>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* --- Brokers ------------------------------------------------------- */}
          <section>
            <h2 className="label mb-3">Brokers</h2>
            <div className="space-y-2">
              {portfolio.brokers.map((broker) => (
                <details
                  key={broker.account.id}
                  className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]"
                >
                  <summary className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold text-ink-900">
                        {broker.account.name}
                      </span>
                      <span className="block text-[13px] text-ink-500 tabular-nums">
                        {formatUsd(broker.cashUsd)} cash · {broker.holdings.length}{" "}
                        holding{broker.holdings.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <span className="shrink-0 text-[15px] font-bold text-ink-900 tabular-nums">
                      {formatUsd(broker.valueUsd)}
                    </span>
                    <span className="chevron shrink-0 text-ink-300">
                      <ChevronRight size={18} />
                    </span>
                  </summary>

                  <div className="space-y-3 border-t border-[var(--border-subtle)] p-4">
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[13px]">
                      {[
                        ["Rupiah in", formatRupiah(broker.costIdr)],
                        ["Dividends", formatUsd(broker.dividendsUsd)],
                        ["Realized (USD)", formatUsd(broker.realizedUsd)],
                        ["Withdrawal P/L", formatRupiah(broker.realizedIdr)],
                        ["Fees & tax", formatRupiah(broker.feesIdr)],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <dt className="text-ink-500">{label}</dt>
                          <dd className="font-semibold text-ink-900 tabular-nums">
                            {value}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <ConfirmDeleteButton
                      action={deleteEtfBroker.bind(null, broker.account.id)}
                      message={`Delete ${broker.account.name} entirely? Every top-up, trade and dividend recorded against it goes too, along with the ledger rows they booked.`}
                      variant="block"
                      triggerLabel={`Delete ${broker.account.name}`}
                      className="btn btn-ghost w-full text-[13px] text-negative-600"
                    />
                  </div>
                </details>
              ))}
            </div>
            <div className="mt-2">
              <EtfAddBrokerSheet />
            </div>
          </section>

          {/* --- Recent activity ----------------------------------------------- */}
          {trades.length > 0 && (
            <section>
              <h2 className="label mb-3">Recent activity</h2>
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
                {trades.slice(0, 30).map((trade, i) => {
                  const inflow =
                    trade.side === "topup" ||
                    trade.side === "sell" ||
                    trade.side === "dividend";
                  return (
                    <div
                      key={trade.id}
                      className={`flex items-center gap-2 px-4 py-2.5 ${
                        i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                      }`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-medium text-ink-900">
                          {tradeLabel(trade)}
                        </span>
                        <span className="block text-[12px] text-ink-500 tabular-nums">
                          {formatDateShort(trade.occurred_on)}
                          {multiBroker && <> · {brokerName.get(trade.account_id)}</>}
                          {trade.idr != null && (
                            <>
                              {" "}
                              · {formatRupiah(trade.idr)}
                              {trade.rate != null && (
                                <> @ {formatRupiah(Math.round(trade.rate))}</>
                              )}
                            </>
                          )}
                          {(trade.fee ?? 0) + (trade.tax ?? 0) > 0 && (
                            <>
                              {" "}
                              · {formatRupiah((trade.fee ?? 0) + (trade.tax ?? 0))}{" "}
                              {trade.fee && trade.tax ? "fee & tax" : trade.fee ? "fee" : "tax"}
                            </>
                          )}
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
                      <span
                        className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                          inflow ? "text-positive-600" : "text-ink-900"
                        }`}
                      >
                        {inflow ? "+" : "−"}
                        {formatUsd(trade.usd)}
                      </span>
                      <ConfirmDeleteButton
                        action={deleteEtfTrade.bind(null, trade.id)}
                        message={
                          trade.txn_id != null
                            ? `Delete this ${SIDE_LABEL[trade.side].toLowerCase()}? The ledger rows it booked — fee and tax included — are removed too.`
                            : `Delete this ${SIDE_LABEL[trade.side].toLowerCase()}? Cash and holdings are recalculated without it.`
                        }
                        triggerLabel={`Delete ${tradeLabel(trade)}`}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

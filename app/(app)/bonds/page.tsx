import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import FormSheet from "@/components/FormSheet";
import { getBondPortfolio, getBondTrades } from "@/lib/bonds";
import { getWallets } from "@/lib/data";
import { getSettings, mappedWalletId } from "@/lib/settings";
import { formatDateShort, formatRupiah } from "@/lib/format";
import BondTradeForm from "./BondTradeForm";
import { deleteBondTrade } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bonds · Atlas" };

export default async function BondsPage() {
  const [portfolio, trades, wallets, settings] = await Promise.all([
    getBondPortfolio(),
    getBondTrades(),
    getWallets(),
    getSettings(),
  ]);

  const defaultWalletId = mappedWalletId(settings, wallets, "wallet_bond");
  const names = [...new Set(trades.map((t) => t.name))].sort();

  return (
    <div className="space-y-5 privacy-scope">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Bonds
        </h1>
      </header>

      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Principal held
        </div>
        <div className="font-display text-[34px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(portfolio.totalInvested)}
        </div>
        <div
          className="mt-1.5 text-[13px] font-semibold tabular-nums"
          style={{ color: "var(--color-lime-500)" }}
        >
          {formatRupiah(portfolio.totalCoupons)} in coupons received
        </div>
      </section>

      {/* Deep dive: a sheet, not a permanently inline form — Bonds is the leanest of the
          three investment pages already; this keeps it that way as the reference shape. */}
      <FormSheet triggerLabel="Record a trade" title="Record a trade">
        <BondTradeForm
          wallets={wallets}
          defaultWalletId={defaultWalletId}
          names={names}
        />
      </FormSheet>

      <section>
        <h2 className="label mb-3">Holdings</h2>
        {portfolio.holdings.length === 0 ? (
          <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            No bonds held yet.
          </p>
        ) : (
          <div className="space-y-2">
            {portfolio.holdings.map((holding) => (
              <article
                key={holding.name}
                className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink-900">
                    {holding.name}
                  </span>
                  <span className="shrink-0 font-display text-[17px] font-bold text-ink-900 tabular-nums">
                    {formatRupiah(holding.invested)}
                  </span>
                </div>
                <div className="mt-1 flex gap-4 text-[13px] text-ink-500 tabular-nums">
                  {holding.units > 0 && (
                    <span>{holding.units.toLocaleString()} units</span>
                  )}
                  <span className="text-positive-600">
                    {formatRupiah(holding.coupons)} coupons
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {trades.length > 0 && (
        <section>
          <h2 className="label mb-3">Recent activity</h2>
          <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
            {trades.slice(0, 25).map((trade, i) => (
              <div
                key={trade.id}
                className={`flex items-center gap-2 px-4 py-2.5 ${
                  i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-ink-900">
                    {trade.side === "buy"
                      ? "Buy"
                      : trade.side === "sell"
                        ? "Sell"
                        : "Coupon"}{" "}
                    {trade.name}
                  </span>
                  <span className="block text-[12px] text-ink-500">
                    {formatDateShort(trade.occurred_on)}
                    {trade.units > 0 && ` · ${trade.units.toLocaleString()} units`}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-[14px] font-semibold tabular-nums ${
                    trade.side === "buy" ? "text-ink-900" : "text-positive-600"
                  }`}
                >
                  {formatRupiah(trade.idr)}
                </span>
                <ConfirmDeleteButton
                  action={deleteBondTrade.bind(null, trade.id)}
                  message={`Delete this ${trade.side} of ${trade.name}? Its ledger row is removed too.`}
                  triggerLabel={`Delete ${trade.name} ${trade.side}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

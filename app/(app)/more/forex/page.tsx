import Link from "next/link";
import PrivacyToggle from "@/components/PrivacyToggle";
import SubmitButton from "@/components/SubmitButton";
import { ChevronLeft, Trash } from "@/components/icons";
import { getWallets, monthKeyOf } from "@/lib/data";
import {
  forexAvgCost,
  getForexAccounts,
  getForexRate,
  getForexTransactions,
} from "@/lib/forex";
import { formatDateShort, formatMonth, formatRupiah } from "@/lib/format";
import { ForexAddCurrency, ForexConvert } from "./ForexForms";
import { deleteForexAccount, deleteForexTransaction, setForexBalance } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Forex · Atlas" };

export default async function ForexPage() {
  const [accounts, wallets] = await Promise.all([
    getForexAccounts(),
    getWallets(),
  ]);

  const cards = await Promise.all(
    accounts.map(async (account) => {
      const [txns, rate] = await Promise.all([
        getForexTransactions(account.id),
        getForexRate(account.currency),
      ]);

      const avgCost = forexAvgCost(txns);
      const invested = Math.round(avgCost * account.units);
      const value = Math.round(rate * account.units);
      const gain = value - invested;
      const pct = invested > 0 ? (gain / invested) * 100 : 0;
      const realized = txns.reduce((sum, t) => sum + (t.realized_pl ?? 0), 0);

      return { account, txns, rate, avgCost, invested, value, gain, pct, realized };
    })
  );

  // One month-grouped log across every currency.
  const allTxns = cards
    .flatMap((card) =>
      card.txns.map((txn) => ({ ...txn, currency: card.account.currency }))
    )
    .sort((a, b) => (a.occurred_on < b.occurred_on ? 1 : -1));

  const byMonth = new Map<string, typeof allTxns>();
  for (const txn of allTxns) {
    const month = monthKeyOf(txn.occurred_on);
    const list = byMonth.get(month) ?? [];
    list.push(txn);
    byMonth.set(month, list);
  }

  return (
    <div className="space-y-5 privacy-scope">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Link
            href="/more"
            aria-label="Back to more"
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
            Forex
          </h1>
        </div>
        <PrivacyToggle className="text-forest-800 hover:bg-forest-50" />
      </header>

      <p className="text-[14px] text-ink-500">
        Foreign currency is tracked in its own units and is{" "}
        <strong>never counted in your IDR net worth</strong>. The rupiah figures
        below are a live reference, not a booked value.
      </p>

      <ForexAddCurrency />

      {cards.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          No currencies yet.
        </p>
      ) : (
        <div className="space-y-4">
          {cards.map((card) => (
            <article
              key={card.account.id}
              className="space-y-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[15px] font-bold text-ink-900">
                    {card.account.name}
                  </div>
                  <div className="font-display text-[26px] font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums">
                    {card.account.units.toLocaleString()}{" "}
                    <span className="text-[16px] text-ink-500">
                      {card.account.currency}
                    </span>
                  </div>
                  <span className="badge mt-1 bg-cream-200 text-ink-700">
                    not in networth
                  </span>
                </div>

                <form action={deleteForexAccount.bind(null, card.account.id)}>
                  <SubmitButton
                    label={`Delete ${card.account.currency}`}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-negative-600"
                  >
                    <Trash size={16} />
                  </SubmitButton>
                </form>
              </div>

              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-[var(--border-subtle)] pt-3 text-[13px]">
                {[
                  ["Invested", formatRupiah(card.invested)],
                  ["Value now", formatRupiah(card.value)],
                  [
                    "Gain / loss",
                    `${card.gain >= 0 ? "▲" : "▼"} ${formatRupiah(
                      Math.abs(card.gain)
                    )} (${card.pct.toFixed(1)}%)`,
                  ],
                  ["Realized P/L", formatRupiah(card.realized)],
                  [
                    "Live rate",
                    `${formatRupiah(Math.round(card.rate))} / ${card.account.currency}`,
                  ],
                  [
                    "Average rate",
                    `${formatRupiah(Math.round(card.avgCost))} / ${card.account.currency}`,
                  ],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-2">
                    <dt className="text-ink-500">{label}</dt>
                    <dd
                      className={`font-semibold tabular-nums ${
                        label === "Gain / loss"
                          ? card.gain >= 0
                            ? "text-positive-600"
                            : "text-negative-600"
                          : "text-ink-900"
                      }`}
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="border-t border-[var(--border-subtle)] pt-3">
                <ForexConvert
                  accountId={card.account.id}
                  currency={card.account.currency}
                  wallets={wallets}
                />
              </div>

              <details className="border-t border-[var(--border-subtle)] pt-3">
                <summary className="text-[13px] font-semibold text-forest-800">
                  Correct the balance
                </summary>
                <form action={setForexBalance} className="mt-2 flex gap-2">
                  <input
                    type="hidden"
                    name="account_id"
                    value={card.account.id}
                  />
                  <input
                    name="units"
                    inputMode="decimal"
                    defaultValue={card.account.units}
                    aria-label="Corrected balance"
                    className="field flex-1"
                  />
                  <SubmitButton className="btn btn-sm btn-outline shrink-0">
                    Set
                  </SubmitButton>
                </form>
                <p className="mt-1.5 text-[13px] text-ink-500">
                  Sets the balance directly. No transaction is booked, so use it
                  only to fix a drift.
                </p>
              </details>
            </article>
          ))}
        </div>
      )}

      {byMonth.size > 0 && (
        <section className="space-y-3">
          <h2 className="label">History</h2>
          {[...byMonth.entries()].map(([month, txns]) => (
            <div key={month}>
              <div className="mb-1.5 text-[13px] font-semibold text-ink-500">
                {formatMonth(month)}
              </div>
              <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
                {txns.map((txn, i) => (
                  <div
                    key={txn.id}
                    className={`flex items-center gap-2 px-4 py-2.5 ${
                      i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-medium text-ink-900">
                        {txn.direction === "buy" ? "Buy" : "Sell"}{" "}
                        {txn.units.toLocaleString()} {txn.currency}
                      </span>
                      <span className="block text-[12px] text-ink-500">
                        {formatDateShort(txn.occurred_on)}
                        {txn.realized_pl != null && txn.realized_pl !== 0 && (
                          <span
                            className={
                              txn.realized_pl > 0
                                ? "text-positive-600"
                                : "text-negative-600"
                            }
                          >
                            {" "}
                            · {txn.realized_pl > 0 ? "+" : "−"}
                            {formatRupiah(Math.abs(txn.realized_pl))}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiah(txn.idr)}
                    </span>
                    <form action={deleteForexTransaction.bind(null, txn.id)}>
                      <SubmitButton
                        label="Delete conversion"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full text-negative-600"
                      >
                        <Trash size={16} />
                      </SubmitButton>
                    </form>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

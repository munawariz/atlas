import Link from "next/link";
import { getWallets, walletMap } from "@/lib/data";
import { getForexAccounts, getForexRate, getForexTransactions, forexAvgCost } from "@/lib/forex";
import { formatMonth, formatRupiah } from "@/lib/format";
import { deleteForexAccount, setForexUnits } from "../actions";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import ForexConvert from "./ForexConvert";
import ForexAddCurrency from "./ForexAddCurrency";

export const dynamic = "force-dynamic";

const fmtUnits = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);

export default async function ForexPage() {
  const [accounts, wallets, txns, ws] = await Promise.all([
    getForexAccounts(),
    getWallets(),
    getForexTransactions(),
    walletMap(),
  ]);
  const currencies = [...new Set(accounts.map((a) => a.currency))];
  const rates = new Map<string, number>();
  await Promise.all(currencies.map(async (c) => rates.set(c, await getForexRate(c))));
  const currencyById = new Map(accounts.map((a) => [a.id, a.currency]));

  // group the forex log per account → average-cost basis of each holding
  const txnsByAccount = new Map<number, typeof txns>();
  for (const t of txns) {
    (txnsByAccount.get(t.account_id) ?? txnsByAccount.set(t.account_id, []).get(t.account_id)!).push(t);
  }

  // group the log by month (already sorted newest-first)
  const byMonth = new Map<string, typeof txns>();
  for (const t of txns) {
    const k = t.occurred_on.slice(0, 7);
    (byMonth.get(k) ?? byMonth.set(k, []).get(k)!).push(t);
  }

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Forex</h1>
        <span className="w-12" />
      </div>

      {accounts.map((a) => {
        const rate = rates.get(a.currency) ?? 0;
        const avgCost = forexAvgCost(txnsByAccount.get(a.id) ?? []);
        const invested = Math.round(avgCost * a.units);
        const value = Math.round(a.units * rate);
        const hasCost = avgCost > 0 && a.units > 0;
        const hasValue = rate > 0 && a.units > 0;
        const pl = value - invested;
        const plPct = hasCost && hasValue ? (pl / invested) * 100 : null;
        // Realized gain/loss already booked from this holding's sells (income/expense).
        const realized = (txnsByAccount.get(a.id) ?? []).reduce((s, t) => s + (t.realized_pl ?? 0), 0);
        return (
          <div key={a.id} className="space-y-2">
            <div className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[15px] font-medium text-paper">{a.name}</div>
                  <form action={deleteForexAccount.bind(null, a.id)} className="mt-1">
                    <SubmitButton label="Remove currency" className="grid h-6 w-6 place-items-center rounded-lg text-clay/70 active:bg-clay/10">
                      <TrashIcon className="h-3.5 w-3.5" />
                    </SubmitButton>
                  </form>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold tabular-nums text-sky">
                    {fmtUnits(a.units)} {a.currency}
                  </div>
                  <div className="text-[11px] text-paper-faint">not in networth</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-ink-3/60 p-2.5">
                  <div className="label">Invested</div>
                  <div className="mt-0.5 font-display text-sm font-semibold tabular-nums text-paper">
                    {hasCost ? formatRupiah(invested) : "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-ink-3/60 p-2.5">
                  <div className="label">Value · live</div>
                  <div className="mt-0.5 font-display text-sm font-semibold tabular-nums text-paper">
                    {hasValue ? formatRupiah(value) : "—"}
                  </div>
                </div>
              </div>
              {plPct !== null ? (
                <div className={`mt-2 flex flex-wrap items-center gap-x-1.5 text-xs font-medium ${pl >= 0 ? "text-green" : "text-clay"}`}>
                  <span className="tabular-nums">{pl >= 0 ? "▲" : "▼"} {formatRupiah(Math.abs(pl))}</span>
                  <span className="tabular-nums">({pl >= 0 ? "+" : "−"}{Math.abs(plPct).toFixed(1)}%)</span>
                  <span className="text-paper-faint">vs invested · live rate</span>
                </div>
              ) : (
                <div className="mt-2 text-xs text-paper-faint">
                  {!hasValue ? "Live rate unavailable." : "Buy some to track gain/loss."}
                </div>
              )}
              {hasValue && (
                <div className="mt-1.5 text-[11px] text-paper-faint">
                  Live{" "}
                  <span className={`tabular-nums ${hasCost ? (rate >= avgCost ? "text-green" : "text-clay") : "text-paper-dim"}`}>
                    Rp {fmtUnits(rate)}
                  </span>
                  {hasCost && (
                    <> vs avg <span className="tabular-nums text-paper-dim">Rp {fmtUnits(avgCost)}</span></>
                  )}
                  {" "}/ {a.currency}
                </div>
              )}
              {realized !== 0 && (
                <div className="mt-1 text-[11px] text-paper-faint">
                  Realized{" "}
                  <span className={`tabular-nums ${realized >= 0 ? "text-green" : "text-clay"}`}>
                    {realized >= 0 ? "+" : "−"}{formatRupiah(Math.abs(realized))}
                  </span>{" "}
                  booked to date
                </div>
              )}

              <form action={setForexUnits.bind(null, a.id)} className="mt-3 flex items-center gap-2">
                <span className="text-xs text-paper-faint">Set balance</span>
                <input
                  name="units"
                  inputMode="decimal"
                  defaultValue={a.units || ""}
                  className="w-28 rounded-lg border border-line/70 bg-ink-3 px-2 py-1.5 text-right text-sm tabular-nums text-paper outline-none focus:border-green/60"
                />
                <span className="text-xs text-paper-dim">{a.currency}</span>
                <SubmitButton
                  pendingText="…"
                  className="rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green active:bg-green/25"
                >
                  Save
                </SubmitButton>
              </form>
            </div>

            <ForexConvert
              accountId={a.id}
              currency={a.currency}
              wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
            />
          </div>
        );
      })}

      {/* Add a new foreign currency (in a modal) */}
      <ForexAddCurrency />

      {accounts.length === 0 && (
        <p className="pt-2 text-center text-sm text-paper-faint">No currencies yet — add one above.</p>
      )}

      {txns.length > 0 && (
        <section>
          <h2 className="label mb-2 text-amber">History</h2>
          <div className="space-y-4">
            {[...byMonth.entries()].map(([ym, rows]) => (
              <div key={ym}>
                <div className="label mb-1.5 px-1">{formatMonth(`${ym}-01`)}</div>
                <div className="card overflow-hidden">
                  {rows.map((t, i) => (
                    <div key={t.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "hr-dash border-t" : ""}`}>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-paper">
                          {t.direction === "buy" ? "Buy" : "Sell"} {fmtUnits(t.units)} {currencyById.get(t.account_id) ?? ""}
                        </div>
                        <div className="text-xs text-paper-dim">
                          {t.wallet_id ? ws.get(t.wallet_id) : "—"}
                          {t.direction === "sell" && t.realized_pl != null && t.realized_pl !== 0 && (
                            <span className={t.realized_pl >= 0 ? "text-green" : "text-clay"}>
                              {" · "}{t.realized_pl >= 0 ? "profit " : "loss "}
                              {formatRupiah(Math.abs(t.realized_pl)).replace("Rp", "").trim()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`shrink-0 font-display text-sm font-medium tabular-nums ${t.direction === "buy" ? "text-clay" : "text-green"}`}>
                        {t.direction === "buy" ? "−" : "+"}{formatRupiah(t.idr).replace("Rp", "").trim()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

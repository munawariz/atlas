import Link from "next/link";
import { formatMonth, formatRupiah, formatRupiahShort } from "@/lib/format";

type StockRow = { id: number; ticker: string; lots: number; bought: number; pct: number; met: boolean; est: number | null; priced: "own" | "avg" | "none" };
type SavInvRow = { name: string; kind: string | undefined; amt: number };

// Saving & Investment tab on the home page: the monthly stock buying targets with each
// ticker's state for the selected month, then this month's net saving/investment flows.
export default function SavingInvestmentTab({
  month,
  stockRows,
  estTotal,
  met,
  savingTotal,
  investTotal,
  savInvRows,
  maxSavInv,
}: {
  month: string;
  stockRows: StockRow[];
  estTotal: number;
  met: number;
  savingTotal: number;
  investTotal: number;
  savInvRows: SavInvRow[];
  maxSavInv: number;
}) {
  return (
    <div className="stagger space-y-5">
      {/* Monthly stock buying — targets vs this month's actual buys */}
      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="label text-plum">Monthly stock buying · {formatMonth(month)}</h2>
          <Link href="/stocks/targets" className="text-[11px] text-paper-dim active:text-paper">Manage ›</Link>
        </div>

        {stockRows.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-sm text-paper-faint">No monthly buy targets set.</p>
            <Link href="/stocks/targets" className="mt-1 inline-block text-xs text-plum underline">Set your buying targets ›</Link>
          </div>
        ) : (
          <>
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <span className="label">Est. buying this month</span>
                <span className="text-[11px] font-medium text-paper-faint">{met}/{stockRows.length} met</span>
              </div>
              <div className="priv-left mt-1 font-display text-2xl font-bold tabular-nums text-plum">{formatRupiah(estTotal)}</div>
              <div className="mt-0.5 text-[11px] text-paper-faint">Speculative — feeds your expected cashflow</div>
            </div>

            <div className="mt-2.5 space-y-2">
              {stockRows.map((r) => (
                <div key={r.id} className="card p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-display text-sm font-semibold text-paper">{r.ticker}</span>
                      {r.met && (
                        <span className="rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">✓ met</span>
                      )}
                    </span>
                    <span className="text-xs tabular-nums text-paper-dim">
                      <span className={r.met ? "text-green" : "text-paper"}>{r.bought}</span> / {r.lots} lot{r.lots > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                    <div className={`h-full rounded-full ${r.met ? "bg-green" : "bg-plum"}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
                  </div>
                  <div className="mt-1.5 text-[11px] tabular-nums text-paper-faint">
                    {r.est != null ? (
                      <>≈ {formatRupiah(r.est)}/mo{r.priced === "avg" && <span className="text-paper-dim"> · avg cost</span>}</>
                    ) : (
                      <span className="text-amber">Set a price/share to estimate</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>

      {/* This month's saving & investment contributions (net of withdrawals) */}
      {savInvRows.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="label text-plum">Saved &amp; invested · {formatMonth(month)}</h2>
            <Link href="/savings" className="text-[11px] text-paper-dim active:text-paper">Balances ›</Link>
          </div>
          <div className="mb-2.5 grid grid-cols-2 gap-2.5">
            <div className="card p-3.5 text-center">
              <div className="label">Saved</div>
              <div className="priv-center mt-1 font-display text-base font-bold tabular-nums text-sky">{formatRupiah(savingTotal)}</div>
            </div>
            <div className="card p-3.5 text-center">
              <div className="label">Invested</div>
              <div className="priv-center mt-1 font-display text-base font-bold tabular-nums text-plum">{formatRupiah(investTotal)}</div>
            </div>
          </div>
          <div className="card space-y-3.5 p-4">
            {savInvRows.map((r) => (
              <div key={r.name}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-paper">{r.name}</span>
                  <span className={`tabular-nums ${r.amt < 0 ? "text-amber" : "text-paper-dim"}`}>{formatRupiahShort(r.amt)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
                  <div
                    className={`h-full rounded-full ${r.kind === "saving" ? "bg-sky/85" : "bg-plum/85"}`}
                    style={{ width: `${(Math.abs(r.amt) / maxSavInv) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

import {
  categoryMap,
  deriveWalletBalances,
  getBudgetsForMonth,
  getLoanPayments,
  getLoans,
  getMonthTransactions,
  getPaylaterItems,
  getPaylaterPayments,
  getPeriodActuals,
  getWallets,
  prevMonthKey,
} from "@/lib/data";
import { BUDGET_PERIODS, type BudgetPeriod } from "@/lib/types";
import { forexUnitsAt, getForexAccounts, getForexRate } from "@/lib/forex";
import { getSettings, mappedCategoryId } from "@/lib/settings";
import ForexToggleValue from "@/components/ForexToggleValue";
import { formatDateShort, formatNumber, formatRupiah, formatRupiahShort, monthName, todayISO } from "@/lib/format";
import DaySwitcher from "@/components/DaySwitcher";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import Link from "next/link";
import { ChartIcon } from "@/components/icons";
import PrivacyToggle from "@/components/PrivacyToggle";

export const dynamic = "force-dynamic";

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/40">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
    </div>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const today = todayISO();
  // The stats page is scoped to a single DAY (?d=YYYY-MM-DD, default today). The selected
  // day's month drives the monthly sections + budget panel.
  const selectedDay = /^\d{4}-\d{2}-\d{2}$/.test(sp.d ?? "") ? (sp.d as string) : today;
  const monthKey = `${selectedDay.slice(0, 7)}-01`;
  const [y, m] = monthKey.split("-").map(Number);

  const [txns, budgets, periodActuals, cats, wallets, paylater, paylaterPaid, loans, payments, derivedStart, forexAccounts, forexUnits, settings] =
    await Promise.all([
      getMonthTransactions(monthKey),
      getBudgetsForMonth(monthKey),
      getPeriodActuals(selectedDay),
      categoryMap(),
      getWallets(),
      getPaylaterItems(),
      getPaylaterPayments(),
      getLoans(),
      getLoanPayments(),
      deriveWalletBalances(prevMonthKey(monthKey)), // per-wallet balance at the start of this month
      getForexAccounts(),
      forexUnitsAt(monthKey),
      getSettings(),
    ]);

  // This day's transactions, and everything up to & including it (for as-of-day net worth).
  const dayTxns = txns.filter((t) => t.occurred_on.slice(0, 10) === selectedDay);
  const upToDay = txns.filter((t) => t.occurred_on.slice(0, 10) <= selectedDay);
  const fxCurrencies = [...new Set(forexAccounts.map((a) => a.currency))];
  const fxRates = new Map<string, number>();
  await Promise.all(fxCurrencies.map(async (c) => fxRates.set(c, await getForexRate(c))));
  const forexLines = forexAccounts
    .map((a) => {
      const u = forexUnits.get(a.id) ?? 0;
      return { id: a.id, name: a.name, currency: a.currency, units: u, idr: Math.round(u * (fxRates.get(a.currency) ?? 0)) };
    })
    .filter((a) => a.units !== 0);

  const sum = (t: typeof txns) => t.reduce((a, x) => a + x.amount, 0);
  const totalIncome = sum(dayTxns.filter((t) => t.type === "income"));
  const totalExpense = sum(dayTxns.filter((t) => t.type === "expense"));
  const net = totalIncome - totalExpense;

  const byCat = new Map<number, number>();
  for (const t of dayTxns) {
    if (t.type === "expense" && t.category_id) byCat.set(t.category_id, (byCat.get(t.category_id) ?? 0) + t.amount);
  }
  const spendRows = [...byCat.entries()]
    .map(([id, amt]) => ({ id, name: cats.get(id)?.name ?? "—", amt }))
    .sort((a, b) => b.amt - a.amt);
  const maxSpend = spendRows[0]?.amt ?? 1;

  // Net flow into each saving/investment bucket this month: contributions minus
  // Withdrawals (which draw from the same buckets). Category-tagged
  // only, so the null-category forex moves are excluded — forex is its own module.
  const siByCat = new Map<number, number>();
  for (const t of txns) {
    if (!t.category_id) continue;
    if (t.type === "saving" || t.type === "investment") {
      siByCat.set(t.category_id, (siByCat.get(t.category_id) ?? 0) + t.amount);
    } else if (t.type === "withdrawal") {
      siByCat.set(t.category_id, (siByCat.get(t.category_id) ?? 0) - t.amount);
    }
  }
  const savInvRows = [...siByCat.entries()]
    .map(([id, amt]) => ({ name: cats.get(id)?.name ?? "—", kind: cats.get(id)?.kind, amt }))
    .filter((r) => r.amt !== 0)
    .sort((a, b) => b.amt - a.amt);
  const savingTotal = savInvRows.filter((r) => r.kind === "saving").reduce((a, r) => a + r.amt, 0);
  const investTotal = savInvRows.filter((r) => r.kind === "investment").reduce((a, r) => a + r.amt, 0);
  const maxSavInv = savInvRows.reduce((m, r) => Math.max(m, Math.abs(r.amt)), 0) || 1;

  // Individual expenses grouped by category — listed under each row when expanded,
  // with the wallet each was paid from.
  const walletName = new Map(wallets.map((w) => [w.id, w.name]));
  const itemsByCat = new Map<number, { desc: string; amt: number; wallet: string }[]>();
  for (const t of dayTxns) {
    if (t.type === "expense" && t.category_id) {
      const arr = itemsByCat.get(t.category_id) ?? [];
      arr.push({
        desc: t.description || "—",
        amt: t.amount,
        wallet: t.source_wallet_id ? walletName.get(t.source_wallet_id) ?? "—" : "—",
      });
      itemsByCat.set(t.category_id, arr);
    }
  }
  for (const arr of itemsByCat.values()) arr.sort((a, b) => b.amt - a.amt);

  // Auto budgets (monthly): the configured loan-income category = total expected to
  // collect in the selected day's month; the paylater-expense category = installments
  // active that month.
  const catList = [...cats.values()];
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const hutangCatId = mappedCategoryId(settings, catList, "cat_loan", "Hutang", "income");
  const cicilanCatId = mappedCategoryId(settings, catList, "cat_paylater", "Cicilan Paylater", "expense");
  const loanExpected = payments
    .filter((p) => p.period_month === monthKey)
    .reduce((s, p) => s + (loanById.get(p.loan_id)?.installment ?? 0), 0);
  const instByCat = new Map<number, number>();
  for (const p of paylater) {
    if (!(p.first_month_date <= monthKey && monthKey <= p.last_month_date)) continue;
    const catId = p.category_id ?? cicilanCatId;
    if (catId) instByCat.set(catId, (instByCat.get(catId) ?? 0) + p.monthly_amount);
  }

  // Budget vs actual, grouped by cadence and measured against the period instance that
  // contains the selected day (that day / its Mon–Sun week / its month / its year).
  type BRow = { id: number; name: string; budget: number; actual: number; pct: number; auto: boolean };
  const budgetGroups: Record<BudgetPeriod, BRow[]> = { daily: [], weekly: [], monthly: [], yearly: [] };
  const monthlyByCat = new Map<number, number>();
  for (const b of budgets) {
    if (b.category_id === hutangCatId || b.category_id === cicilanCatId) continue; // auto rows handled below
    const cat = cats.get(b.category_id);
    if (!cat || b.amount <= 0) continue;
    if (cat.period === "monthly") {
      monthlyByCat.set(b.category_id, b.amount);
    } else {
      const actual = periodActuals[cat.period].get(b.category_id) ?? 0;
      budgetGroups[cat.period].push({ id: b.category_id, name: cat.name, budget: b.amount, actual, pct: b.amount ? (actual / b.amount) * 100 : 0, auto: false });
    }
  }
  // Monthly group merges user budgets + auto values + installment additions.
  if (hutangCatId) monthlyByCat.set(hutangCatId, loanExpected);
  for (const [catId, amt] of instByCat) {
    if (catId === cicilanCatId) monthlyByCat.set(catId, amt); // paylater category = installments only
    else monthlyByCat.set(catId, (monthlyByCat.get(catId) ?? 0) + amt); // custom: add on top
  }
  for (const [catId, amount] of monthlyByCat) {
    const cat = cats.get(catId);
    if (!cat || amount <= 0) continue;
    const actual = periodActuals.monthly.get(catId) ?? 0;
    budgetGroups.monthly.push({
      id: catId,
      name: cat.name,
      budget: amount,
      actual,
      pct: amount ? (actual / amount) * 100 : 0,
      auto: catId === hutangCatId || catId === cicilanCatId,
    });
  }
  for (const k of ["daily", "weekly", "monthly", "yearly"] as BudgetPeriod[]) {
    budgetGroups[k].sort((a, b) => b.budget - a.budget);
  }
  const hasBudgets = BUDGET_PERIODS.some((p) => budgetGroups[p.value].length > 0);

  // Net worth as of the END of the selected day: start-of-month balances + this month's
  // wallet moves up to & including the day. (IDR wallets only — forex is its own module.)
  const derivedDay = new Map(derivedStart);
  const bumpWallet = (id: number | null, amt: number) => {
    if (id) derivedDay.set(id, (derivedDay.get(id) ?? 0) + amt);
  };
  for (const t of upToDay) {
    if (t.type === "expense") bumpWallet(t.source_wallet_id, -t.amount);
    else if (t.type === "income" || t.type === "withdrawal") bumpWallet(t.dest_wallet_id, t.amount);
    else if (t.type === "saving" || t.type === "investment") bumpWallet(t.source_wallet_id, -t.amount);
    else if (t.type === "transfer") {
      bumpWallet(t.source_wallet_id, -t.amount);
      bumpWallet(t.dest_wallet_id, t.amount);
    }
  }
  const netWorthNow = wallets.reduce((a, w) => a + (derivedDay.get(w.id) ?? 0), 0);
  // The selected day's net change to wallet balances (income/withdrawal in; the rest out).
  const dayDelta = dayTxns.reduce((s, t) => {
    if (t.type === "income" || t.type === "withdrawal") return s + t.amount;
    if (t.type === "expense" || t.type === "saving" || t.type === "investment") return s - t.amount;
    return s;
  }, 0);
  const hasAnyBalance = netWorthNow !== 0 || forexLines.length > 0;

  const paylaterPaidSet = new Set(paylaterPaid.map((p) => `${p.item_id}:${p.month}`));
  const paylaterDue = paylater.filter(
    (p) =>
      p.first_month_date <= monthKey &&
      monthKey <= p.last_month_date &&
      !paylaterPaidSet.has(`${p.id}:${monthKey}`)
  );
  const paylaterDueTotal = paylaterDue.reduce((a, p) => a + p.monthly_amount, 0);

  let loanOutstanding = 0;
  let loanDue = 0;
  for (const p of payments) {
    if (p.paid) continue;
    const loan = loanById.get(p.loan_id);
    if (!loan) continue;
    loanOutstanding += loan.installment;
    if (p.period_month === monthKey) loanDue += loan.installment;
  }

  return (
    <div className="privacy-scope stagger space-y-5 pt-4">
      <RefreshOnFocus />
      <DaySwitcher day={selectedDay} />

      {/* Networth hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(63,185,80,0.18),transparent_70%)]" />
        <div className="absolute right-3 top-3 flex items-center gap-1.5">
          <PrivacyToggle />
          <Link
            href="/charts"
            className="flex items-center gap-1 rounded-full border border-line/60 bg-ink-2/70 px-2.5 py-1 text-[11px] font-medium text-paper-dim active:text-paper"
          >
            <ChartIcon className="h-3.5 w-3.5" /> Charts
          </Link>
        </div>
        <div className="label">Networth · end of day</div>
        <div className="priv-left mt-1.5 font-display font-medium leading-none tabular-nums text-paper text-[clamp(1.9rem,8.5vw,2.6rem)]">
          {formatRupiah(netWorthNow)}
        </div>
        {dayTxns.length > 0 && (
          <div className={`mt-2 text-sm font-medium ${dayDelta >= 0 ? "text-jade" : "text-clay"}`}>
            <span className="priv-left tabular-nums">
              {dayDelta >= 0 ? "▲" : "▼"} {formatRupiahShort(Math.abs(dayDelta))}
            </span>
            <span className="text-paper-faint"> on this day</span>
          </div>
        )}
        {!hasAnyBalance && (
          <div className="mt-2 text-xs text-paper-faint">
            Set your{" "}
            <a href="/balances" className="text-green underline">starting balances</a> to begin.
          </div>
        )}
        {netWorthNow !== 0 && (
          <>
            <hr className="hr-dash my-4" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-2">
              {wallets.map((w) => (
                <div key={w.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-paper-dim">{w.name}</span>
                  <span className="tabular-nums text-paper">{formatNumber(derivedDay.get(w.id) ?? 0)}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {forexLines.length > 0 && (
          <>
            <hr className="hr-dash my-4" />
            <div className="flex items-center justify-between">
              <span className="label">Forex</span>
              <span className="text-[10px] uppercase tracking-wider text-paper-faint">not in networth</span>
            </div>
            <div className="mt-1.5 grid grid-cols-2 gap-x-5 gap-y-2">
              {forexLines.map((a) => (
                <div key={a.name} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-sky">{a.name}</span>
                  <ForexToggleValue units={a.units} currency={a.currency} idr={a.idr} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Income / Expense / Net */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { label: "Income", val: totalIncome, color: "text-green", ring: "bg-green/12 text-green", icon: "M12 19V5M5 12l7-7 7 7" },
          { label: "Expense", val: totalExpense, color: "text-red", ring: "bg-red/12 text-red", icon: "M12 5v14M5 12l7 7 7-7" },
          { label: "Net", val: net, color: net >= 0 ? "text-green" : "text-red", ring: "bg-amber/12 text-amber", icon: "M8 7l4-4 4 4M8 17l4 4 4-4M12 3v18" },
        ].map((s) => (
          <div key={s.label} className="card flex flex-col items-center p-3 text-center">
            <span className={`mb-1.5 flex h-7 w-7 items-center justify-center rounded-full ${s.ring}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d={s.icon} />
              </svg>
            </span>
            <div className={`priv-center font-display text-[13px] font-bold leading-tight tabular-nums ${s.color}`}>
              {formatRupiah(s.val)}
            </div>
            <div className="label mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Budget vs actual — grouped by period, measured against the current day/week/month/year */}
      {hasBudgets && (
        <section>
          <h2 className="label mb-2.5 text-amber">Budget vs actual</h2>
          <div className="space-y-3">
            {BUDGET_PERIODS.map((p) =>
              budgetGroups[p.value].length === 0 ? null : (
                <div key={p.value} className="card p-4">
                  <div className="mb-2.5 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-paper">{p.label}</span>
                    <span className="text-[10px] uppercase tracking-wider text-paper-faint">this {p.per}</span>
                  </div>
                  <div className="space-y-3.5">
                    {budgetGroups[p.value].map((r) => {
                      const items = periodActuals.items[p.value].get(r.id) ?? [];
                      const header = (
                        <>
                          <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                            <span className="flex min-w-0 items-center gap-1.5 text-paper">
                              {items.length > 0 && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 shrink-0 text-paper-faint transition-transform">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                                </svg>
                              )}
                              <span className="truncate">{r.name}</span>
                              {r.auto && (
                                <span className="rounded bg-green/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">
                                  auto
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 tabular-nums text-paper-dim">
                              {formatRupiahShort(r.actual)} / {formatRupiahShort(r.budget)}
                            </span>
                          </div>
                          <Bar pct={r.pct} color={r.pct > 100 ? "bg-clay" : "bg-green"} />
                        </>
                      );
                      return items.length > 0 ? (
                        <details key={r.id} className="group">
                          <summary className="cursor-pointer">{header}</summary>
                          <div className="mt-2 space-y-1 border-l border-line/70 pl-3">
                            {items.map((it, i) => (
                              <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
                                <span className="min-w-0 flex-1 truncate text-paper-dim">{it.desc}</span>
                                <span className="shrink-0 text-paper-faint">{formatDateShort(it.date)}</span>
                                <span className="shrink-0 tabular-nums text-paper-faint">{formatNumber(it.amt)}</span>
                              </div>
                            ))}
                          </div>
                        </details>
                      ) : (
                        <div key={r.id}>{header}</div>
                      );
                    })}
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {/* Spending by category */}
      {spendRows.length > 0 && (
        <section>
          <h2 className="label mb-2.5 text-amber">Where it went</h2>
          <div className="card space-y-3.5 p-4">
            {spendRows.map((r) => {
              const items = itemsByCat.get(r.id) ?? [];
              return (
                <details key={r.id} className="group">
                  <summary className="cursor-pointer">
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-1.5 text-paper">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 shrink-0 text-paper-faint transition-transform">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                        </svg>
                        <span className="truncate">{r.name}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-paper-dim">{formatRupiahShort(r.amt)}</span>
                    </div>
                    <Bar pct={(r.amt / maxSpend) * 100} color="bg-clay/85" />
                  </summary>
                  {items.length > 0 && (
                    <div className="mt-2 space-y-1 border-l border-line/70 pl-3">
                      {items.map((it, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-2 text-[11px]">
                          <span className="min-w-0 flex-1 truncate text-paper-dim">{it.desc}</span>
                          <span className="shrink-0 text-paper-faint">{it.wallet}</span>
                          <span className="shrink-0 tabular-nums text-paper-faint">{formatNumber(it.amt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </details>
              );
            })}
          </div>
        </section>
      )}

      {/* Saved & invested (net of withdrawals) */}
      {savInvRows.length > 0 && (
        <section>
          <div className="mb-2.5 flex items-center justify-between">
            <h2 className="label text-amber">Saved &amp; invested · {monthName(m)}</h2>
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
          {savInvRows.length > 0 && (
            <div className="card space-y-3.5 p-4">
              {savInvRows.map((r) => (
                <div key={r.name}>
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-paper">{r.name}</span>
                    <span className={`tabular-nums ${r.amt < 0 ? "text-amber" : "text-paper-dim"}`}>
                      {formatRupiahShort(r.amt)}
                    </span>
                  </div>
                  <Bar pct={(Math.abs(r.amt) / maxSavInv) * 100} color={r.kind === "saving" ? "bg-sky/85" : "bg-plum/85"} />
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Obligations */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="card p-4">
          <div className="label">Paylater due</div>
          <div className="priv-left mt-1.5 font-display text-base font-bold tabular-nums text-sand">{formatRupiah(paylaterDueTotal)}</div>
          <div className="mt-0.5 text-xs text-paper-faint">{paylaterDue.length} item(s) this month</div>
        </div>
        <div className="card p-4">
          <div className="label">Loan to collect</div>
          <div className="priv-left mt-1.5 font-display text-base font-bold tabular-nums text-green">{formatRupiah(loanOutstanding)}</div>
          <div className="mt-0.5 text-xs text-paper-faint">
            <span className="priv-left tabular-nums">{formatRupiah(loanDue)}</span> this month
          </div>
        </div>
      </div>

      {txns.length === 0 && !hasAnyBalance && (
        <p className="pt-6 text-center text-sm text-paper-faint">
          Nothing logged for {monthName(m)} {y} yet.
        </p>
      )}
    </div>
  );
}

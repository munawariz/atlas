import {
  categoryMap,
  deriveWalletBalances,
  getBudgetsForMonth,
  getLoanPayments,
  getLoans,
  getMonthTransactions,
  getPaylaterItems,
  getPaylaterPayments,
  getPaylaterProviders,
  getWallets,
  prevMonthKey,
} from "@/lib/data";
import { type BudgetPeriod } from "@/lib/types";
import { getForexAccounts, getForexRate, getForexTransactions } from "@/lib/forex";
import { getStockTargetsForMonth, getStockTrades } from "@/lib/stocks";
import { getSettings, mappedCategoryId } from "@/lib/settings";
import { formatDateShort, formatNumber, formatRupiah, formatRupiahShort, monthName, todayISO } from "@/lib/format";
import DaySwitcher from "@/components/DaySwitcher";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import StatsTabs from "./StatsTabs";
import InstallmentsTab from "./InstallmentsTab";
import SavingInvestmentTab from "./SavingInvestmentTab";
import SpendBreakdown from "./SpendBreakdown";
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

// A small progress ring for a daily budget (over = red, near = amber, else green).
function Ring({ pct, size = 48 }: { pct: number; size?: number }) {
  const sw = 5;
  const r = (size - sw) / 2;
  const c = size / 2;
  const CIRC = 2 * Math.PI * r;
  const dash = (Math.min(pct, 100) / 100) * CIRC;
  const stroke = pct > 100 ? "var(--color-clay)" : pct >= 80 ? "var(--color-sand)" : "var(--color-green)";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} style={{ width: size, height: size }} className="shrink-0">
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-line)" strokeWidth={sw} opacity={0.6} />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${CIRC - dash}`}
        transform={`rotate(-90 ${c} ${c})`}
      />
      <text x={c} y={c} textAnchor="middle" dominantBaseline="central" fill="var(--color-paper)" style={{ fontWeight: 700 }} className="font-display tabular-nums">
        <tspan style={{ fontSize: size * 0.3 }}>{Math.round(pct)}</tspan>
        <tspan style={{ fontSize: size * 0.19 }} dy={-size * 0.03}>%</tspan>
      </text>
    </svg>
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

  const [txns, budgets, cats, wallets, paylater, paylaterPaid, providers, loans, payments, derivedStart, forexAccounts, forexTxns, stockTargets, stockTrades, settings] =
    await Promise.all([
      getMonthTransactions(monthKey),
      getBudgetsForMonth(monthKey),
      categoryMap(),
      getWallets(),
      getPaylaterItems(),
      getPaylaterPayments(),
      getPaylaterProviders(true),
      getLoans(),
      getLoanPayments(),
      deriveWalletBalances(prevMonthKey(monthKey)), // per-wallet balance at the start of this month
      getForexAccounts(),
      getForexTransactions(),
      getStockTargetsForMonth(monthKey),
      getStockTrades(),
      getSettings(),
    ]);

  // This day's transactions, and everything up to & including it (for as-of-day net worth).
  const dayTxns = txns.filter((t) => t.occurred_on.slice(0, 10) === selectedDay);
  const upToDay = txns.filter((t) => t.occurred_on.slice(0, 10) <= selectedDay);
  const fxCurrencies = [...new Set(forexAccounts.map((a) => a.currency))];
  const fxRates = new Map<string, number>();
  await Promise.all(fxCurrencies.map(async (c) => fxRates.set(c, await getForexRate(c))));
  const fmtFx = (n: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(n);
  // Per forex holding: its value in IDR (live rate), plus the day's change in the FOREIGN
  // currency (units bought − sold that day). Units are taken as of the end of the selected
  // day; IDR fluctuation from the rate itself is deliberately not surfaced.
  const forexLines = forexAccounts
    .map((a) => {
      let units = Number(a.units);
      let dayDelta = 0;
      for (const t of forexTxns) {
        if (t.account_id !== a.id) continue;
        const d = t.occurred_on.slice(0, 10);
        const signed = t.direction === "buy" ? t.units : -t.units;
        if (d > selectedDay) units -= signed; // undo moves after the selected day
        else if (d === selectedDay) dayDelta += signed;
      }
      return {
        id: a.id,
        name: a.name,
        currency: a.currency,
        units,
        dayDelta,
        idr: Math.round(units * (fxRates.get(a.currency) ?? 0)),
      };
    })
    .filter((a) => a.units !== 0 || a.dayDelta !== 0);

  const sum = (t: typeof txns) => t.reduce((a, x) => a + x.amount, 0);
  // Income / Expense / Net summarise the whole selected month (not just the day).
  const totalIncome = sum(txns.filter((t) => t.type === "income"));
  const totalExpense = sum(txns.filter((t) => t.type === "expense"));
  const net = totalIncome - totalExpense;

  // The selected DAY only — a focused daily spending tracker (the rest of the page is monthly).
  const daySpent = sum(dayTxns.filter((t) => t.type === "expense"));
  const dayEarned = sum(dayTxns.filter((t) => t.type === "income"));
  const dayExpenses = dayTxns
    .filter((t) => t.type === "expense")
    .map((t) => {
      const cat = t.category_id ? cats.get(t.category_id)?.name ?? "" : "";
      const desc = t.description?.trim() || "";
      return { id: t.id, primary: desc || cat || "Expense", secondary: desc && cat ? cat : "", amt: t.amount };
    })
    .sort((a, b) => b.amt - a.amt);

  // Daily-budgeted categories: today's spend vs the daily limit, as clickable progress rings.
  const dailyBudgets = budgets
    .filter((b) => cats.get(b.category_id)?.period === "daily" && b.amount > 0)
    .map((b) => {
      const cat = cats.get(b.category_id)!;
      const items = dayTxns
        .filter((t) => t.type === "expense" && t.category_id === b.category_id)
        .map((t) => ({ id: t.id, desc: t.description?.trim() || cat.name, amt: t.amount }))
        .sort((a, z) => z.amt - a.amt);
      const spent = items.reduce((s, it) => s + it.amt, 0);
      return { id: b.category_id, name: cat.name, budget: b.amount, spent, pct: b.amount ? (spent / b.amount) * 100 : 0, items };
    })
    .sort((a, z) => z.pct - a.pct);

  // Month actuals + per-category transactions for the WHOLE selected month — shared by the
  // budget panel and the spending breakdown, so both stay consistent with the monthly
  // Income/Expense above (and don't read ~0 when you switch to a past month). Transfers and
  // withdrawals are excluded so each sum matches the budgeted category's own kind.
  const walletName = new Map(wallets.map((w) => [w.id, w.name]));
  const monthActual = new Map<number, number>();
  const itemsByCat = new Map<number, { desc: string; amt: number; date: string; wallet: string }[]>();
  for (const t of txns) {
    if (!t.category_id || t.type === "transfer" || t.type === "withdrawal") continue;
    monthActual.set(t.category_id, (monthActual.get(t.category_id) ?? 0) + t.amount);
    const arr = itemsByCat.get(t.category_id) ?? [];
    arr.push({
      desc: t.description || "—",
      amt: t.amount,
      date: t.occurred_on.slice(0, 10),
      wallet: t.source_wallet_id
        ? walletName.get(t.source_wallet_id) ?? "—"
        : t.dest_wallet_id
          ? walletName.get(t.dest_wallet_id) ?? "—"
          : "—",
    });
    itemsByCat.set(t.category_id, arr);
  }
  // Newest first within each category's expanded list (amount breaks ties on the same day).
  for (const arr of itemsByCat.values()) arr.sort((a, b) => b.date.localeCompare(a.date) || b.amt - a.amt);

  // Spending by category (expenses) for "Where it went".
  const spendRows = [...monthActual.entries()]
    .filter(([id]) => cats.get(id)?.kind === "expense")
    .map(([id, amt]) => ({ id, name: cats.get(id)?.name ?? "—", amt }))
    .sort((a, b) => b.amt - a.amt);
  const spendTotal = spendRows.reduce((s, r) => s + r.amt, 0);
  // Rows for the interactive spend donut/legend: each category with its transactions.
  const spendBreakdown = spendRows.map((r) => ({
    id: r.id,
    name: r.name,
    amt: r.amt,
    items: (itemsByCat.get(r.id) ?? []).map((it) => ({ desc: it.desc, wallet: it.wallet, amt: it.amt })),
  }));

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

  // Monthly stock buying (Saving & Investment tab): each target's lots bought in the selected
  // month vs its goal. The estimate uses the target's speculative price, else the ticker's
  // all-time average buy price from trades (no live lookup needed on the home page).
  const ym = monthKey.slice(0, 7);
  const stockBought = new Map<string, number>();
  const buyAgg = new Map<string, { lots: number; idr: number }>();
  for (const t of stockTrades) {
    if (t.side !== "buy") continue;
    const k = t.ticker.toUpperCase();
    if (t.occurred_on.slice(0, 7) === ym) stockBought.set(k, (stockBought.get(k) ?? 0) + t.lots);
    const a = buyAgg.get(k) ?? { lots: 0, idr: 0 };
    a.lots += t.lots;
    a.idr += t.idr;
    buyAgg.set(k, a);
  }
  const avgSharePrice = (tk: string) => {
    const a = buyAgg.get(tk);
    return a && a.lots ? a.idr / (a.lots * 100) : null;
  };
  const stockRows = stockTargets.map((tg) => {
    const bought = stockBought.get(tg.ticker) ?? 0;
    const price = tg.price ?? avgSharePrice(tg.ticker);
    const est = price != null ? Math.round(tg.lots * 100 * price) : null;
    return {
      ticker: tg.ticker,
      lots: tg.lots,
      bought,
      pct: tg.lots ? (bought / tg.lots) * 100 : 0,
      met: bought >= tg.lots,
      est,
      priced: (tg.price != null ? "own" : price != null ? "avg" : "none") as "own" | "avg" | "none",
    };
  });
  const stockEstTotal = stockRows.reduce((s, r) => s + (r.est ?? 0), 0);
  const stockMet = stockRows.filter((r) => r.met).length;

  // Auto budget (monthly): the configured loan-income category = total expected to collect in
  // the selected day's month. Installment categories are intentionally NOT budgeted here —
  // they're fixed/mandatory, so they add noise without any actionable "what to do" insight
  // (track them on the Home installments tab instead).
  const catList = [...cats.values()];
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const providerById = new Map(providers.map((pr) => [pr.id, pr]));
  const hutangCatId = mappedCategoryId(settings, catList, "cat_loan", "Hutang", "income");
  const loanExpected = payments
    .filter((p) => p.period_month === monthKey)
    .reduce((s, p) => s + (loanById.get(p.loan_id)?.installment ?? 0), 0);

  // Budget vs actual for the WHOLE selected month: every budget compared as month's spend vs
  // its monthly-equivalent limit (daily/weekly/yearly converted), so the panel is consistent
  // regardless of which day in the month is selected. Installment categories are excluded.
  type BudgetRow = { id: number; name: string; budget: number; actual: number; pct: number; auto: boolean; kind: string };
  const monthlyEquiv = (amt: number, p: BudgetPeriod) =>
    p === "daily" ? amt * 30.4 : p === "weekly" ? amt * 4.345 : p === "yearly" ? amt / 12 : amt;
  const budgetRows: BudgetRow[] = [];
  for (const b of budgets) {
    if (b.category_id === hutangCatId || cats.get(b.category_id)?.is_installment) continue;
    const cat = cats.get(b.category_id);
    if (!cat || b.amount <= 0) continue;
    const budget = Math.round(monthlyEquiv(b.amount, cat.period));
    const actual = monthActual.get(b.category_id) ?? 0;
    budgetRows.push({ id: b.category_id, name: cat.name, budget, actual, pct: budget ? (actual / budget) * 100 : 0, auto: false, kind: cat.kind });
  }
  // Loan collection auto-budget (income): expected to collect this month vs collected.
  if (hutangCatId && loanExpected > 0) {
    const actual = monthActual.get(hutangCatId) ?? 0;
    budgetRows.push({ id: hutangCatId, name: cats.get(hutangCatId)?.name ?? "Hutang", budget: loanExpected, actual, pct: loanExpected ? (actual / loanExpected) * 100 : 0, auto: true, kind: "income" });
  }
  const hasBudgets = budgetRows.length > 0;
  const kindRows = (kind: string) => budgetRows.filter((r) => r.kind === kind).sort((a, b) => b.pct - a.pct);
  const monthlyTotal = (kind: string) => {
    const rs = budgetRows.filter((r) => r.kind === kind);
    return { a: rs.reduce((s, r) => s + r.actual, 0), b: rs.reduce((s, r) => s + r.budget, 0) };
  };

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

  // ---- Installments tab: this month's installments grouped by provider ----
  type ProvItem = { id: number; item: string; amount: number; paid: boolean };
  const activePL = paylater.filter((p) => p.first_month_date <= monthKey && monthKey <= p.last_month_date);
  const provBuckets = new Map<number, ProvItem[]>();
  const provUngrouped: ProvItem[] = [];
  for (const p of activePL) {
    const it: ProvItem = { id: p.id, item: p.item, amount: p.monthly_amount, paid: paylaterPaidSet.has(`${p.id}:${monthKey}`) };
    const prov = p.provider_id ? providerById.get(p.provider_id) : null;
    if (prov) (provBuckets.get(prov.id) ?? provBuckets.set(prov.id, []).get(prov.id)!).push(it);
    else provUngrouped.push(it);
  }
  const provGroups: { key: string; name: string; total: number; paid: number; owed: number; items: ProvItem[] }[] = [];
  const pushGroup = (key: string, name: string, items: ProvItem[]) => {
    const total = items.reduce((a, it) => a + it.amount, 0);
    const paidAmt = items.filter((it) => it.paid).reduce((a, it) => a + it.amount, 0);
    provGroups.push({ key, name, items, total, paid: paidAmt, owed: total - paidAmt });
  };
  for (const pr of providers) {
    const its = provBuckets.get(pr.id);
    if (its && its.length) pushGroup(String(pr.id), pr.name, its);
  }
  if (provUngrouped.length) pushGroup("none", "Other", provUngrouped);
  const installmentsTotal = provGroups.reduce((a, g) => a + g.total, 0);
  const installmentsPaid = provGroups.reduce((a, g) => a + g.paid, 0);

  const providersTab = (
    <InstallmentsTab
      month={monthKey}
      total={installmentsTotal}
      paid={installmentsPaid}
      groups={provGroups}
    />
  );

  const savInvTab = (
    <SavingInvestmentTab
      month={monthKey}
      stockRows={stockRows}
      estTotal={stockEstTotal}
      met={stockMet}
      savingTotal={savingTotal}
      investTotal={investTotal}
      savInvRows={savInvRows}
      maxSavInv={maxSavInv}
    />
  );

  // One budget row: status dot, name (+ auto badge), % used, actual/budget, bar, and its
  // transactions when expanded. `target` flips the meaning for income/saving (reaching 100%
  // is good) vs expense limits (over is bad).
  const renderBudgetRow = (r: BudgetRow, target: boolean) => {
    const items = itemsByCat.get(r.id) ?? [];
    const tone = target
      ? r.pct >= 100 ? "bg-green" : "bg-sky"
      : r.pct > 100 ? "bg-clay" : r.pct >= 80 ? "bg-amber" : "bg-green";
    const pctTone = target
      ? r.pct >= 100 ? "text-green" : "text-sky"
      : r.pct > 100 ? "text-clay" : r.pct >= 80 ? "text-amber" : "text-paper-dim";
    const header = (
      <>
        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-paper">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${tone}`} />
            {items.length > 0 && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 shrink-0 text-paper-faint transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
            )}
            <span className="truncate">{r.name}</span>
            {r.auto && (
              <span className="rounded bg-green/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">auto</span>
            )}
          </span>
          <span className="shrink-0 tabular-nums">
            <span className={pctTone}>{Math.round(r.pct)}%</span>
            <span className="text-paper-faint"> · {formatRupiahShort(r.actual)}/{formatRupiahShort(r.budget)}</span>
          </span>
        </div>
        <Bar pct={r.pct} color={tone} />
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
  };

  // One card per kind: a summary (counts + this month's bar), then the rows that matter.
  // Expense hides on-track rows behind "Show all"; income/saving targets list all of theirs.
  const budgetKindCard = (kind: "expense" | "income" | "saving", title: string) => {
    const rows = kindRows(kind);
    if (rows.length === 0) return null;
    const target = kind !== "expense";
    const { a, b } = monthlyTotal(kind);
    const pct = b ? (a / b) * 100 : 0;
    const over = rows.filter((r) => r.pct > 100).length;
    const near = rows.filter((r) => r.pct >= 80 && r.pct <= 100).length;
    const ok = rows.length - over - near;
    const met = rows.filter((r) => r.pct >= 100).length;
    const attention = target ? rows : rows.filter((r) => r.pct >= 80);
    const hidden = target ? [] : rows.filter((r) => r.pct < 80);
    const barColor = target ? (pct >= 100 ? "bg-green" : "bg-sky") : pct > 100 ? "bg-clay" : "bg-green";
    return (
      <div className="card space-y-3.5 p-4">
        <div>
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="text-sm font-medium text-paper">{title}</span>
              <span className="flex flex-wrap items-center gap-x-2 text-[11px] font-medium">
                {target ? (
                  <span className="text-paper-dim">{met} of {rows.length} met</span>
                ) : (
                  <>
                    {over > 0 && <span className="text-clay">{over} over</span>}
                    {near > 0 && <span className="text-amber">{near} near</span>}
                    <span className="text-paper-dim">{ok} on track</span>
                  </>
                )}
              </span>
            </span>
            {b > 0 && (
              <span className="shrink-0 tabular-nums text-paper-faint">
                {formatRupiahShort(a)} / {formatRupiahShort(b)} · {monthName(m)}
              </span>
            )}
          </div>
          {b > 0 && (
            <div className="mt-1.5">
              <Bar pct={pct} color={barColor} />
            </div>
          )}
        </div>

        {attention.length > 0 ? (
          <div className="space-y-3.5 border-t border-line/40 pt-3.5">
            {attention.map((r) => renderBudgetRow(r, target))}
          </div>
        ) : (
          <p className="border-t border-line/40 pt-3 text-xs text-green">✓ All {rows.length} on track.</p>
        )}

        {hidden.length > 0 && (
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-paper-dim active:text-paper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 shrink-0 text-paper-faint transition-transform">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
              </svg>
              Show all ({hidden.length} on track)
            </summary>
            <div className="mt-3 space-y-3.5">{hidden.map((r) => renderBudgetRow(r, target))}</div>
          </details>
        )}
      </div>
    );
  };

  return (
    <div className="privacy-scope stagger space-y-5 pt-4">
      <RefreshOnFocus />
      <DaySwitcher day={selectedDay} />

      <StatsTabs
        providers={providersTab}
        savingInvestment={savInvTab}
        overview={
          <div className="stagger space-y-5">

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
              <span className="label">Forex · in IDR</span>
              <span className="text-[10px] uppercase tracking-wider text-paper-faint">live rate · separate</span>
            </div>
            <div className="mt-1.5 space-y-1.5">
              {forexLines.map((a) => (
                <div key={a.id} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate">
                    <span className="text-sky">{a.name}</span>{" "}
                    <span className="tabular-nums text-paper-faint">{fmtFx(a.units)} {a.currency}</span>
                    {a.dayDelta !== 0 && (
                      <span className={`tabular-nums ${a.dayDelta > 0 ? "text-green" : "text-clay"}`}>
                        {" "}{a.dayDelta > 0 ? "▲" : "▼"} {fmtFx(Math.abs(a.dayDelta))}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-paper">{formatRupiah(a.idr)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Spent this day — the only day-scoped spending view (follows the day stepper) */}
      <section>
        <h2 className="label mb-2.5 text-amber">Spent this day</h2>
        <div className="card p-4">
          {dayExpenses.length > 0 ? (
            <details className="group">
              <summary className="flex cursor-pointer items-center justify-between gap-2">
                <span className="priv-left font-display text-2xl font-bold tabular-nums text-red">{formatRupiah(daySpent)}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs">
                  {dayEarned > 0 && <span className="text-green">+{formatRupiah(dayEarned)} in</span>}
                  <span className="flex items-center gap-1 text-paper-dim">
                    {dayExpenses.length} {dayExpenses.length === 1 ? "txn" : "txns"}
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 text-paper-faint transition-transform">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                    </svg>
                  </span>
                </span>
              </summary>
              <div className="mt-3 space-y-1.5 border-t border-line/40 pt-3">
                {dayExpenses.map((t) => (
                  <div key={t.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-paper">{t.primary}</span>
                    {t.secondary && <span className="shrink-0 text-paper-faint">{t.secondary}</span>}
                    <span className="shrink-0 tabular-nums text-paper-dim">{formatNumber(t.amt)}</span>
                  </div>
                ))}
              </div>
            </details>
          ) : (
            <div className="flex items-baseline justify-between gap-2">
              <span className="priv-left font-display text-2xl font-bold tabular-nums text-red">{formatRupiah(daySpent)}</span>
              <span className="shrink-0 text-xs text-paper-faint">Nothing spent this day</span>
            </div>
          )}
        </div>
      </section>

      {/* Daily budgets — today's spend vs each daily-limit category, as clickable rings */}
      {dailyBudgets.length > 0 && (
        <section>
          <h2 className="label mb-2.5 text-amber">Daily budgets · today</h2>
          <div className="card divide-y divide-line/50 p-1">
            {dailyBudgets.map((d) => (
              <details key={d.id} className="group">
                <summary className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 active:bg-ink-3">
                  <Ring pct={d.pct} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-paper">{d.name}</span>
                    <span className="block text-xs text-paper-dim tabular-nums">
                      <span className={d.pct > 100 ? "text-clay" : d.pct >= 80 ? "text-sand" : "text-green"}>{formatRupiah(d.spent)}</span>
                      {" / "}{formatRupiah(d.budget)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-paper-faint">
                    {d.budget - d.spent >= 0 ? `${formatRupiahShort(d.budget - d.spent)} left` : `${formatRupiahShort(d.spent - d.budget)} over`}
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3.5 w-3.5 shrink-0 text-paper-faint transition-transform">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                  </svg>
                </summary>
                <div className="space-y-1 px-3 pb-3 pl-[3.9rem]">
                  {d.items.length > 0 ? (
                    d.items.map((it) => (
                      <div key={it.id} className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="min-w-0 flex-1 truncate text-paper-dim">{it.desc}</span>
                        <span className="shrink-0 tabular-nums text-paper-faint">{formatNumber(it.amt)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-paper-faint">Nothing spent on this today.</p>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Income / Expense / Net — for the whole selected month */}
      <section>
        <h2 className="label mb-2.5 text-amber">Income &amp; expense · {monthName(m)}</h2>
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
      </section>

      {/* Budget vs actual — split into expense limits and income/saving targets */}
      {hasBudgets && (
        <section>
          <h2 className="label mb-2.5 text-amber">Budget vs actual</h2>
          <div className="space-y-3">
            {budgetKindCard("expense", "Expense")}
            {budgetKindCard("income", "Income")}
            {budgetKindCard("saving", "Saving")}
          </div>
        </section>
      )}

      {/* Spending by category */}
      {spendRows.length > 0 && (
        <details className="group" open>
          <summary className="mb-2.5 flex cursor-pointer items-center gap-1.5">
            <span className="label text-amber">Where it went · {monthName(m)}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="chevron h-3 w-3 shrink-0 text-paper-faint transition-transform">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
            <span className="priv-left ml-auto text-xs tabular-nums text-paper-dim">{formatRupiahShort(spendTotal)}</span>
          </summary>
          <div className="card p-4">
            <SpendBreakdown rows={spendBreakdown} total={spendTotal} />
          </div>
        </details>
      )}

      {txns.length === 0 && !hasAnyBalance && (
        <p className="pt-6 text-center text-sm text-paper-faint">
          Nothing logged for {monthName(m)} {y} yet.
        </p>
      )}
          </div>
        }
      />
    </div>
  );
}

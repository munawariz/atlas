import Link from "next/link";
import DaySwitcher from "@/components/DaySwitcher";
import PrivacyToggle from "@/components/PrivacyToggle";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import { ChevronRight, LineChart } from "@/components/icons";
import {
  bumpWallet,
  currentMonthKey,
  deriveWalletBalances,
  endOfMonth,
  getBudgetsForMonth,
  getCategories,
  getMonthTransactions,
  getPaylaterItems,
  getPaylaterPayments,
  getPaylaterProviders,
  getWallets,
  monthKeyOf,
  monthlyEquivalent,
  prevMonthKey,
  sumBalances,
} from "@/lib/data";
import { installmentAutoBudgets, itemActiveIn, loanAutoBudget } from "@/lib/autoBudget";
import { getForexAccounts, getForexRate, getForexTransactions } from "@/lib/forex";
import { getAverageBuyPerLot, getStockTargetsForMonth, getStockTrades, LOT_SIZE } from "@/lib/stocks";
import { missingSettings } from "@/lib/settings";
import { formatMonth, formatRupiah, monthName, todayISO } from "@/lib/format";
import type { Category, Transaction } from "@/lib/types";
import StatsTabs from "./StatsTabs";
import SpendBreakdown, { type BreakdownSlice } from "./SpendBreakdown";
import ProgressRing, { remainingLabel, usageColor } from "./ProgressRing";

export const dynamic = "force-dynamic";

export const metadata = { title: "Home · Atlas" };

/** Weeks run Monday→Sunday. */
function startOfWeek(iso: string): string {
  const [y, m, d] = iso.split("-").map((p) => parseInt(p, 10));
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = (date.getUTCDay() + 6) % 7; // Monday = 0
  date.setUTCDate(date.getUTCDate() - dow);
  return date.toISOString().slice(0, 10);
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const { d } = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? (d as string) : todayISO();
  const monthKey = monthKeyOf(day);

  const [
    wallets,
    categories,
    monthTxns,
    startBalances,
    budgets,
    loanAuto,
    installmentAuto,
    paylaterItems,
    paylaterPayments,
    providers,
    forexAccounts,
    stockTargets,
    stockTrades,
    avgBuy,
    missing,
  ] = await Promise.all([
    getWallets(),
    getCategories(true),
    getMonthTransactions(monthKey),
    deriveWalletBalances(prevMonthKey(monthKey)),
    getBudgetsForMonth(monthKey),
    loanAutoBudget(monthKey),
    installmentAutoBudgets(monthKey),
    getPaylaterItems(),
    getPaylaterPayments(),
    getPaylaterProviders(),
    getForexAccounts(),
    getStockTargetsForMonth(monthKey),
    getStockTrades(endOfMonth(monthKey)),
    getAverageBuyPerLot(),
    missingSettings(),
  ]);

  const catById = new Map(categories.map((c) => [c.id, c]));

  // =========================================================================
  // Net worth at the end of the selected day
  //
  // Start-of-month balances, then walk this month's rows up to and including the day.
  // This is implementation #3 of the balance rule (ATLAS.md §3.3) and must agree with the
  // trigger and with deriveWalletBalances exactly.
  // =========================================================================
  const balances = new Map(startBalances);
  let dayDelta = 0;

  for (const txn of monthTxns) {
    if (txn.occurred_on > day) continue;
    const before = sumBalances(balances);
    bumpWallet(balances, txn);
    if (txn.occurred_on === day) dayDelta += sumBalances(balances) - before;
  }

  const netWorth = sumBalances(balances);

  // =========================================================================
  // Overview data
  // =========================================================================
  const dayTxns = monthTxns.filter((t) => t.occurred_on === day);
  const daySpend = dayTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  const dayIncome = dayTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthIncome = monthTxns
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const monthExpense = monthTxns
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  // --- Spend per category, this month --------------------------------------
  const spentByCategory = new Map<number, number>();
  for (const txn of monthTxns) {
    if (txn.category_id == null) continue;
    const signed = txn.type === "withdrawal" ? -txn.amount : txn.amount;
    if (txn.type === "transfer") continue;
    spentByCategory.set(
      txn.category_id,
      (spentByCategory.get(txn.category_id) ?? 0) + signed
    );
  }

  // --- Daily budgets, scoped to the selected day ----------------------------
  const dailyRows = categories
    .filter((c) => c.period === "daily" && c.kind === "expense" && !c.archived)
    .map((category) => {
      const budget = budgets.get(category.id)?.amount ?? 0;
      const txns = dayTxns.filter((t) => t.category_id === category.id);
      const spent = txns.reduce((sum, t) => sum + t.amount, 0);
      return { category, budget, spent, txns };
    })
    .filter((row) => row.budget > 0 || row.spent > 0);

  // --- Budget vs actual, monthly equivalents --------------------------------
  const weekStart = startOfWeek(day);

  function actualFor(category: Category): { spent: number; txns: Transaction[] } {
    // A weekly budget is judged against this week; everything else against the month, then
    // converted to a monthly equivalent so the panel reads consistently.
    const txns = monthTxns.filter((t) => {
      if (t.category_id !== category.id) return false;
      if (category.period === "daily") return t.occurred_on === day;
      if (category.period === "weekly") {
        return t.occurred_on >= weekStart && t.occurred_on <= day;
      }
      return true;
    });
    return { spent: txns.reduce((sum, t) => sum + t.amount, 0), txns };
  }

  const budgetCards = (["expense", "income", "saving"] as const).map((kind) => {
    const rows = categories
      .filter((c) => c.kind === kind && !c.archived)
      // Installment categories are fixed and non-actionable — they live on their own tab.
      .filter((c) => !c.is_installment)
      .map((category) => {
        const auto =
          loanAuto && category.id === loanAuto.category_id ? loanAuto : null;
        const raw = auto?.amount ?? budgets.get(category.id)?.amount ?? 0;
        if (raw <= 0) return null;

        const budget = auto ? raw : monthlyEquivalent(raw, category.period);
        const { spent, txns } = actualFor(category);
        const actual = auto
          ? (spentByCategory.get(category.id) ?? 0)
          : category.period === "monthly" || category.period === "yearly"
            ? (spentByCategory.get(category.id) ?? 0)
            : spent;

        const pct = budget > 0 ? (actual / budget) * 100 : 0;
        return { category, budget, actual, pct, txns, auto: Boolean(auto) };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => b.pct - a.pct);

    return {
      kind,
      label:
        kind === "expense"
          ? "Expense limits"
          : kind === "income"
            ? "Income targets"
            : "Saving targets",
      rows,
      budgetTotal: rows.reduce((sum, r) => sum + r.budget, 0),
      actualTotal: rows.reduce((sum, r) => sum + r.actual, 0),
    };
  });

  // --- Where it went --------------------------------------------------------
  const expenseTxns = monthTxns.filter((t) => t.type === "expense");
  const byCategory = new Map<number | null, BreakdownSlice>();
  for (const txn of expenseTxns) {
    const key = txn.category_id;
    const name =
      key != null ? (catById.get(key)?.name ?? "Uncategorized") : "Uncategorized";
    let slice = byCategory.get(key);
    if (!slice) {
      slice = { categoryId: key, name, total: 0, transactions: [] };
      byCategory.set(key, slice);
    }
    slice.total += txn.amount;
    slice.transactions.push({
      id: txn.id,
      description: txn.description,
      amount: txn.amount,
      occurred_on: txn.occurred_on,
    });
  }

  const allSlices = [...byCategory.values()].sort((a, b) => b.total - a.total);
  // Top 8 plus a single "Other" — nine legible slices beats twenty slivers.
  const slices: BreakdownSlice[] = allSlices.slice(0, 8);
  const rest = allSlices.slice(8);
  if (rest.length > 0) {
    slices.push({
      categoryId: null,
      name: `Other (${rest.length})`,
      total: rest.reduce((sum, s) => sum + s.total, 0),
      transactions: rest.flatMap((s) => s.transactions),
    });
  }
  for (const slice of slices) {
    slice.transactions.sort((a, b) => b.amount - a.amount);
  }

  // --- Forex, shown separately and never inside net worth --------------------
  const forexRows = await Promise.all(
    forexAccounts
      .filter((account) => account.units !== 0)
      .map(async (account) => {
        const txns = await getForexTransactions(account.id);
        const after = txns.filter((t) => t.occurred_on > day);
        // Walk back from the current balance to the balance on the selected day.
        let unitsThen = account.units;
        for (const txn of after) {
          unitsThen += txn.direction === "buy" ? -txn.units : txn.units;
        }
        const dayMoves = txns.filter((t) => t.occurred_on === day);
        const unitChange = dayMoves.reduce(
          (sum, t) => sum + (t.direction === "buy" ? t.units : -t.units),
          0
        );
        const rate = await getForexRate(account.currency);
        return { account, units: unitsThen, unitChange, rate };
      })
  );

  return (
    <div className="space-y-4 privacy-scope">
      <RefreshOnFocus />

      {missing.length > 0 && <SetupBanner count={missing.length} />}

      <DaySwitcher day={day} />

      <StatsTabs
        overview={
          <div className="space-y-5">
            {/* --- Net worth hero -------------------------------------- */}
            <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
              <div className="flex items-start justify-between gap-2">
                <div className="label" style={{ color: "var(--color-forest-300)" }}>
                  Networth · end of day
                </div>
                <div className="-mt-1 flex items-center gap-1">
                  <PrivacyToggle className="text-forest-200 hover:bg-forest-700" />
                  <Link
                    href="/charts"
                    aria-label="Open charts"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-200 no-underline transition-colors hover:bg-forest-700"
                  >
                    <LineChart size={18} />
                  </Link>
                </div>
              </div>

              <div className="font-display text-[36px] font-extrabold leading-none tracking-[-0.03em] text-white tabular-nums">
                {formatRupiah(netWorth)}
              </div>
              <div
                className="mt-1.5 text-[13px] font-semibold tabular-nums"
                style={{
                  color:
                    dayDelta >= 0
                      ? "var(--color-lime-500)"
                      : "var(--color-negative-500)",
                }}
              >
                {dayDelta >= 0 ? "▲" : "▼"} {formatRupiah(Math.abs(dayDelta))} today
              </div>

              {wallets.length === 0 ? (
                <Link
                  href="/balances"
                  className="mt-4 inline-block text-[13px] font-semibold text-lime-500"
                >
                  Set your starting balances →
                </Link>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {wallets.map((wallet) => (
                    <div
                      key={wallet.id}
                      className="rounded-[14px] p-3"
                      style={{ background: "rgb(255 255 255 / 0.08)" }}
                    >
                      <div
                        className="truncate text-[12px] font-semibold"
                        style={{ color: "var(--color-forest-200)" }}
                      >
                        {wallet.name}
                      </div>
                      <div className="font-display text-[16px] font-bold text-white tabular-nums">
                        {formatRupiah(balances.get(wallet.id) ?? 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {forexRows.length > 0 && (
                <div
                  className="mt-4 rounded-[14px] p-3"
                  style={{ background: "rgb(255 255 255 / 0.08)" }}
                >
                  <div className="label" style={{ color: "var(--color-forest-300)" }}>
                    Forex · in IDR
                  </div>
                  {forexRows.map((row) => (
                    <div key={row.account.id} className="mt-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] text-white">
                          {row.units.toLocaleString()} {row.account.currency}
                          {row.unitChange !== 0 && (
                            <span
                              className="ml-1.5"
                              style={{ color: "var(--color-lime-500)" }}
                            >
                              {row.unitChange > 0 ? "+" : ""}
                              {row.unitChange.toLocaleString()}
                            </span>
                          )}
                        </span>
                        <span className="font-display text-[15px] font-bold text-white tabular-nums">
                          {formatRupiah(Math.round(row.units * row.rate))}
                        </span>
                      </div>
                      <div
                        className="text-[11px]"
                        style={{ color: "var(--color-forest-300)" }}
                      >
                        1 {row.account.currency} ≈ {formatRupiah(Math.round(row.rate))}
                      </div>
                    </div>
                  ))}
                  <p
                    className="mt-2 text-[11px]"
                    style={{ color: "var(--color-forest-300)" }}
                  >
                    Held separately — not part of the net worth above.
                  </p>
                </div>
              )}
            </section>

            {/* --- Spent this day -------------------------------------- */}
            <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
              <summary className="flex items-center gap-3 px-4 py-3.5">
                <span className="flex-1">
                  <span className="label block">Spent this day</span>
                  <span className="font-display text-[20px] font-bold text-ink-900 tabular-nums">
                    {formatRupiah(daySpend)}
                  </span>
                  {dayIncome > 0 && (
                    <span className="ml-2 text-[13px] font-semibold text-positive-600 tabular-nums">
                      +{formatRupiah(dayIncome)} in
                    </span>
                  )}
                </span>
                <span className="chevron text-ink-300">
                  <ChevronRight size={18} />
                </span>
              </summary>
              <TxnList
                txns={dayTxns.filter((t) => t.type === "expense")}
                catById={catById}
                empty="Nothing spent on this day."
              />
            </details>

            {/* --- Daily budgets --------------------------------------- */}
            {dailyRows.length > 0 && (
              <section>
                <h2 className="label mb-2">Daily budgets · today</h2>
                <div className="space-y-2">
                  {dailyRows.map((row) => {
                    const pct = row.budget > 0 ? (row.spent / row.budget) * 100 : 0;
                    return (
                      <details
                        key={row.category.id}
                        className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]"
                      >
                        <summary className="flex items-center gap-3 px-4 py-3">
                          <ProgressRing pct={pct} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-semibold text-ink-900">
                              {row.category.name}
                            </span>
                            <span className="block text-[13px] text-ink-500 tabular-nums">
                              {row.budget > 0
                                ? remainingLabel(row.spent, row.budget)
                                : `${formatRupiah(row.spent)} spent`}
                            </span>
                          </span>
                          <span className="chevron text-ink-300">
                            <ChevronRight size={18} />
                          </span>
                        </summary>
                        <TxnList
                          txns={row.txns}
                          catById={catById}
                          empty="Nothing here today."
                        />
                      </details>
                    );
                  })}
                </div>
              </section>
            )}

            {/* --- Income & expense ------------------------------------ */}
            <section>
              <h2 className="label mb-2">
                Income &amp; expense · {monthName(parseInt(monthKey.slice(5, 7), 10))}
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Income", value: monthIncome, tone: "text-positive-600" },
                  { label: "Expense", value: monthExpense, tone: "text-negative-600" },
                  {
                    label: "Net",
                    value: monthIncome - monthExpense,
                    tone:
                      monthIncome - monthExpense >= 0
                        ? "text-forest-800"
                        : "text-negative-600",
                  },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)]"
                  >
                    <div className="label">{card.label}</div>
                    <div
                      className={`mt-0.5 font-display text-[15px] font-bold tabular-nums ${card.tone}`}
                    >
                      {formatRupiah(card.value)}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* --- Budget vs actual ------------------------------------ */}
            <section className="space-y-3">
              <h2 className="label">Budget vs actual</h2>
              {budgetCards.map((card) => (
                <BudgetCard key={card.kind} card={card} catById={catById} />
              ))}
            </section>

            {/* --- Where it went --------------------------------------- */}
            <section>
              <h2 className="label mb-2">
                Where it went · {monthName(parseInt(monthKey.slice(5, 7), 10))}
              </h2>
              <SpendBreakdown slices={slices} total={monthExpense} />
            </section>
          </div>
        }
        installments={
          <InstallmentsTab
            monthKey={monthKey}
            items={paylaterItems}
            payments={paylaterPayments}
            providers={providers}
          />
        }
        savingInvestment={
          <SavingInvestmentTab
            monthKey={monthKey}
            targets={stockTargets}
            trades={stockTrades}
            avgBuy={avgBuy}
            monthTxns={monthTxns}
            catById={catById}
          />
        }
      />
    </div>
  );
}

// ===========================================================================
// Pieces
// ===========================================================================

function SetupBanner({ count }: { count: number }) {
  return (
    <Link
      href="/more/settings"
      className="block rounded-[var(--radius-card)] border-l-4 border-warning-500 bg-warning-100 p-4 no-underline"
    >
      <div className="text-[15px] font-semibold text-ink-900">
        Finish setting up Atlas
      </div>
      <p className="mt-1 text-[13px] text-ink-700">
        {count} automated transaction {count === 1 ? "category" : "categories"} still
        need mapping. Until then, stock trades, dividends, coupons, loan
        collections and forex conversions will refuse rather than guess.
      </p>
      <span className="mt-2 inline-block text-[13px] font-semibold text-forest-800">
        Open Settings →
      </span>
    </Link>
  );
}

function TxnList({
  txns,
  catById,
  empty,
}: {
  txns: Transaction[];
  catById: Map<number, Category>;
  empty: string;
}) {
  if (txns.length === 0) {
    return (
      <p className="border-t border-[var(--border-subtle)] px-4 py-4 text-[13px] text-ink-500">
        {empty}
      </p>
    );
  }

  return (
    <ul className="border-t border-[var(--border-subtle)]">
      {[...txns]
        .sort((a, b) => b.amount - a.amount)
        .map((txn) => (
          <li key={txn.id}>
            <Link
              href={`/history/${txn.id}`}
              className="flex items-baseline justify-between gap-3 px-4 py-2.5 no-underline"
            >
              <span className="min-w-0 flex-1 truncate text-[14px] text-ink-700">
                {txn.description ||
                  (txn.category_id != null
                    ? catById.get(txn.category_id)?.name
                    : null) ||
                  "—"}
              </span>
              <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                {formatRupiah(txn.amount)}
              </span>
            </Link>
          </li>
        ))}
    </ul>
  );
}

interface BudgetCardData {
  kind: "expense" | "income" | "saving";
  label: string;
  rows: {
    category: Category;
    budget: number;
    actual: number;
    pct: number;
    txns: Transaction[];
    auto: boolean;
  }[];
  budgetTotal: number;
  actualTotal: number;
}

function BudgetCard({
  card,
  catById,
}: {
  card: BudgetCardData;
  catById: Map<number, Category>;
}) {
  if (card.rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
        <div className="label">{card.label}</div>
        <p className="mt-1 text-[13px] text-ink-500">
          Nothing set.{" "}
          <Link href="/more/budgets" className="font-semibold text-forest-800">
            Add one
          </Link>
          .
        </p>
      </div>
    );
  }

  const isLimit = card.kind === "expense";

  const over = card.rows.filter((r) => r.pct > 100).length;
  const near = card.rows.filter((r) => r.pct >= 80 && r.pct <= 100).length;
  const onTrack = card.rows.length - over - near;
  const met = card.rows.filter((r) => r.pct >= 100).length;

  // Expense rows below 80% collapse — the ones that need attention stay visible.
  const shown = isLimit ? card.rows.filter((r) => r.pct >= 80) : card.rows;
  const hidden = isLimit ? card.rows.filter((r) => r.pct < 80) : [];

  const totalPct =
    card.budgetTotal > 0 ? (card.actualTotal / card.budgetTotal) * 100 : 0;

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div className="flex items-baseline justify-between gap-2">
        <span className="label">{card.label}</span>
        <span className="text-[12px] font-semibold text-ink-500">
          {isLimit
            ? `${over} over / ${near} near / ${onTrack} on track`
            : `${met} of ${card.rows.length} met`}
        </span>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="font-display text-[20px] font-bold text-ink-900 tabular-nums">
          {formatRupiah(card.actualTotal)}
        </span>
        <span className="text-[13px] text-ink-500 tabular-nums">
          of {formatRupiah(card.budgetTotal)}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full"
          style={{
            width: `${Math.min(100, totalPct)}%`,
            background: isLimit ? usageColor(totalPct) : "var(--color-forest-800)",
          }}
        />
      </div>

      <div className="mt-3 space-y-1">
        {shown.map((row) => (
          <BudgetLine key={row.category.id} row={row} isLimit={isLimit} catById={catById} />
        ))}
      </div>

      {hidden.length > 0 && (
        <details className="mt-2">
          <summary className="text-[13px] font-semibold text-forest-800">
            Show all ({hidden.length} on track)
          </summary>
          <div className="mt-1 space-y-1">
            {hidden.map((row) => (
              <BudgetLine
                key={row.category.id}
                row={row}
                isLimit={isLimit}
                catById={catById}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function BudgetLine({
  row,
  isLimit,
  catById,
}: {
  row: BudgetCardData["rows"][number];
  isLimit: boolean;
  catById: Map<number, Category>;
}) {
  return (
    <details>
      <summary className="flex items-center gap-2 py-1.5">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium text-ink-900">
            {row.category.name}
            {row.auto && <span className="badge ml-1.5">auto</span>}
          </span>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-cream-200">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, row.pct)}%`,
                background: isLimit
                  ? usageColor(row.pct)
                  : "var(--color-forest-800)",
              }}
            />
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[13px] font-semibold text-ink-900 tabular-nums">
            {Math.round(row.pct)}%
          </span>
          <span className="block text-[11px] text-ink-500 tabular-nums">
            {isLimit
              ? remainingLabel(row.actual, row.budget)
              : formatRupiah(row.budget)}
          </span>
        </span>
      </summary>
      <div className="ml-1 border-l-2 border-cream-200 pl-3">
        <TxnList txns={row.txns} catById={catById} empty="No entries yet." />
      </div>
    </details>
  );
}

function InstallmentsTab({
  monthKey,
  items,
  payments,
  providers,
}: {
  monthKey: string;
  items: Awaited<ReturnType<typeof getPaylaterItems>>;
  payments: Awaited<ReturnType<typeof getPaylaterPayments>>;
  providers: Awaited<ReturnType<typeof getPaylaterProviders>>;
}) {
  const active = items.filter((item) => itemActiveIn(item, monthKey));
  const paidIds = new Set(
    payments.filter((p) => p.month === monthKey).map((p) => p.item_id)
  );

  // Group by provider in provider sort order; anything unassigned trails in "Other".
  const groups = providers.map((provider) => ({
    name: provider.name,
    items: active.filter((item) => item.provider_id === provider.id),
  }));
  const orphans = active.filter(
    (item) =>
      item.provider_id == null ||
      !providers.some((p) => p.id === item.provider_id)
  );
  if (orphans.length > 0) groups.push({ name: "Other", items: orphans });

  const populated = groups.filter((g) => g.items.length > 0);

  if (populated.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center shadow-[var(--shadow-xs)]">
        <p className="text-[14px] text-ink-500">
          No installments running in {formatMonth(monthKey)}.
        </p>
        <Link
          href="/more/paylater"
          className="mt-2 inline-block text-[13px] font-semibold text-forest-800"
        >
          Manage installments →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {populated.map((group) => {
        const total = group.items.reduce((sum, i) => sum + i.monthly_amount, 0);
        const paid = group.items
          .filter((i) => paidIds.has(i.id))
          .reduce((sum, i) => sum + i.monthly_amount, 0);

        return (
          <section key={group.name}>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h2 className="label">{group.name}</h2>
              <span className="text-[12px] font-semibold text-ink-500 tabular-nums">
                {formatRupiah(paid)} paid · {formatRupiah(total - paid)} owed
              </span>
            </div>

            <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
              {group.items.map((item, i) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink-900">
                      {item.item}
                    </span>
                    <span className="block text-[13px] text-ink-500">
                      {paidIds.has(item.id) ? "Paid" : "Due"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-[15px] font-bold tabular-nums ${
                      paidIds.has(item.id) ? "text-ink-300" : "text-ink-900"
                    }`}
                  >
                    {formatRupiah(item.monthly_amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <Link
        href={`/more/paylater?m=${monthKey}`}
        className="btn btn-outline w-full no-underline"
      >
        Pay and manage installments
      </Link>
    </div>
  );
}

function SavingInvestmentTab({
  monthKey,
  targets,
  trades,
  avgBuy,
  monthTxns,
  catById,
}: {
  monthKey: string;
  targets: Awaited<ReturnType<typeof getStockTargetsForMonth>>;
  trades: Awaited<ReturnType<typeof getStockTrades>>;
  avgBuy: Map<string, number>;
  monthTxns: Transaction[];
  catById: Map<number, Category>;
}) {
  const monthEnd = endOfMonth(monthKey);

  const boughtThisMonth = new Map<string, number>();
  for (const trade of trades) {
    if (trade.side !== "buy") continue;
    if (trade.occurred_on < monthKey || trade.occurred_on > monthEnd) continue;
    boughtThisMonth.set(
      trade.ticker,
      (boughtThisMonth.get(trade.ticker) ?? 0) + trade.lots
    );
  }

  // Net contributions per bucket this month — a withdrawal subtracts.
  const buckets = new Map<number, { name: string; kind: string; net: number }>();
  for (const txn of monthTxns) {
    if (txn.category_id == null) continue;
    if (txn.type !== "saving" && txn.type !== "investment" && txn.type !== "withdrawal") {
      continue;
    }
    const category = catById.get(txn.category_id);
    if (!category) continue;
    if (category.kind !== "saving" && category.kind !== "investment") continue;

    const entry = buckets.get(category.id) ?? {
      name: category.name,
      kind: category.kind,
      net: 0,
    };
    entry.net += txn.type === "withdrawal" ? -txn.amount : txn.amount;
    buckets.set(category.id, entry);
  }

  const bucketRows = [...buckets.values()].filter((b) => b.net !== 0);
  const saved = bucketRows
    .filter((b) => b.kind === "saving")
    .reduce((sum, b) => sum + b.net, 0);
  const invested = bucketRows
    .filter((b) => b.kind === "investment")
    .reduce((sum, b) => sum + b.net, 0);
  const largest = bucketRows.reduce((max, b) => Math.max(max, Math.abs(b.net)), 0);

  return (
    <div className="space-y-5">
      <section>
        <h2 className="label mb-2">Stock buy targets · {formatMonth(monthKey)}</h2>
        {targets.length === 0 ? (
          <div className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center shadow-[var(--shadow-xs)]">
            <p className="text-[14px] text-ink-500">No buy targets set.</p>
            <Link
              href={`/stocks/targets?m=${monthKey}`}
              className="mt-2 inline-block text-[13px] font-semibold text-forest-800"
            >
              Set targets →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {targets.map((target) => {
              const bought = boughtThisMonth.get(target.ticker) ?? 0;
              const pct = target.lots > 0 ? (bought / target.lots) * 100 : 0;
              const perLot =
                target.price != null
                  ? target.price * LOT_SIZE
                  : (avgBuy.get(target.ticker) ?? null);

              return (
                <div
                  key={target.ticker}
                  className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-[15px] font-semibold text-ink-900">
                      {target.ticker}
                      {pct >= 100 && <span className="badge ml-2">✓ met</span>}
                    </span>
                    <span className="text-[13px] text-ink-500 tabular-nums">
                      {bought} / {target.lots} lot{target.lots === 1 ? "" : "s"}
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full bg-forest-800"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  {perLot != null && (
                    <div className="mt-2 text-[13px] text-ink-500 tabular-nums">
                      ≈ {formatRupiah(Math.round(perLot * target.lots))}/mo
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="label mb-2">
          Set aside · {monthName(parseInt(monthKey.slice(5, 7), 10))}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Saved", value: saved },
            { label: "Invested", value: invested },
          ].map((cell) => (
            <div
              key={cell.label}
              className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
            >
              <div className="label">{cell.label}</div>
              <div className="mt-0.5 font-display text-[18px] font-bold text-ink-900 tabular-nums">
                {formatRupiah(cell.value)}
              </div>
            </div>
          ))}
        </div>

        {bucketRows.length > 0 && (
          <div className="mt-2 space-y-2">
            {bucketRows
              .sort((a, b) => b.net - a.net)
              .map((bucket) => (
                <div
                  key={bucket.name}
                  className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)]"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[14px] font-medium text-ink-900">
                      {bucket.name}
                    </span>
                    <span className="shrink-0 text-[14px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiah(bucket.net)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-200">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${largest > 0 ? (Math.abs(bucket.net) / largest) * 100 : 0}%`,
                        background:
                          bucket.kind === "saving"
                            ? "var(--color-info-500)"
                            : "var(--color-forest-800)",
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {bucketRows.length === 0 && (
          <p className="mt-2 rounded-[var(--radius-card)] bg-white px-5 py-6 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            Nothing set aside this month.
          </p>
        )}
      </section>
    </div>
  );
}

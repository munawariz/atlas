import Link from "next/link";
import MonthSwitcher from "@/components/MonthSwitcher";
import { ChevronLeft } from "@/components/icons";
import {
  currentMonthKey,
  getBudgetsForMonth,
  getCategories,
  monthlyEquivalent,
} from "@/lib/data";
import { installmentAutoBudgets, loanAutoBudget } from "@/lib/autoBudget";
import {
  LOT_SIZE,
  getAverageBuyPerLot,
  getStockPortfolio,
  getStockTargetsForMonth,
} from "@/lib/stocks";
import { formatMonth, formatRupiah } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = { title: "Expected cashflow · Atlas" };

interface Line {
  label: string;
  amount: number;
  note?: string;
}

export default async function CashflowPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();

  const [categories, budgets, loanAuto, installmentAuto, targets, portfolio, avgBuy] =
    await Promise.all([
      getCategories(),
      getBudgetsForMonth(monthKey),
      loanAutoBudget(monthKey),
      installmentAutoBudgets(monthKey),
      getStockTargetsForMonth(monthKey),
      getStockPortfolio(),
      getAverageBuyPerLot(),
    ]);

  const income: Line[] = [];
  const expense: Line[] = [];
  const saving: Line[] = [];
  const investment: Line[] = [];

  // --- Category budgets, at their monthly equivalent -------------------------
  for (const category of categories) {
    // An installment category's real number comes from its schedule, not a typed budget.
    if (installmentAuto.byCategory.has(category.id)) continue;
    if (loanAuto && category.id === loanAuto.category_id) continue;

    const amount = budgets.get(category.id)?.amount ?? 0;
    if (amount <= 0) continue;

    const monthly = monthlyEquivalent(amount, category.period);
    const line: Line = {
      label: category.name,
      amount: monthly,
      note: category.period === "monthly" ? undefined : `${category.period} budget`,
    };

    if (category.kind === "income") income.push(line);
    else if (category.kind === "expense") expense.push(line);
    else if (category.kind === "saving") saving.push(line);
    else investment.push(line);
  }

  // --- Loan collection ------------------------------------------------------
  if (loanAuto) {
    const name =
      categories.find((c) => c.id === loanAuto.category_id)?.name ??
      "Loan collection";
    income.push({ label: name, amount: loanAuto.amount, note: loanAuto.note });
  }

  // --- Installments ---------------------------------------------------------
  for (const [categoryId, auto] of installmentAuto.byCategory) {
    const name = categories.find((c) => c.id === categoryId)?.name;
    expense.push({
      label: name ?? "Installments",
      amount: auto.amount,
      note: auto.note,
    });
  }
  if (installmentAuto.unassigned.count > 0) {
    expense.push({
      label: "Installments · no provider",
      amount: installmentAuto.unassigned.amount,
      note: `${installmentAuto.unassigned.count} item${
        installmentAuto.unassigned.count === 1 ? "" : "s"
      }`,
    });
  }

  // --- Stock buy targets ----------------------------------------------------
  // Priced by the target's own speculative price, else the live price of a held ticker, else
  // its all-time average buy. A target we cannot price is reported, not guessed at.
  const livePriceOf = new Map(
    portfolio.holdings.map((h) => [h.ticker, h.price] as const)
  );
  const unpricedTargets: string[] = [];

  for (const target of targets) {
    let perLot: number | null = null;
    if (target.price != null) perLot = target.price * LOT_SIZE;
    else {
      const live = livePriceOf.get(target.ticker);
      if (live != null) perLot = live * LOT_SIZE;
      else perLot = avgBuy.get(target.ticker) ?? null;
    }

    if (perLot == null) {
      unpricedTargets.push(target.ticker);
      continue;
    }

    investment.push({
      label: target.ticker,
      amount: Math.round(perLot * target.lots),
      note: `${target.lots} lot${target.lots === 1 ? "" : "s"} planned`,
    });
  }

  const sum = (lines: Line[]) => lines.reduce((total, l) => total + l.amount, 0);
  const incomeTotal = sum(income);
  const expenseTotal = sum(expense);
  const savingTotal = sum(saving);
  const investmentTotal = sum(investment);
  const net = incomeTotal - expenseTotal - savingTotal - investmentTotal;

  const groups: { label: string; lines: Line[]; total: number; tone: string }[] = [
    { label: "Income in", lines: income, total: incomeTotal, tone: "text-positive-600" },
    { label: "Expense out", lines: expense, total: expenseTotal, tone: "text-negative-600" },
    { label: "Saving out", lines: saving, total: savingTotal, tone: "text-info-600" },
    { label: "Investment out", lines: investment, total: investmentTotal, tone: "text-forest-800" },
  ];

  return (
    <div className="space-y-4 privacy-scope">
      <header className="flex items-center gap-1">
        <Link
          href="/more"
          aria-label="Back to more"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Expected cashflow
        </h1>
      </header>

      <MonthSwitcher monthKey={monthKey} />

      <section
        className={`rounded-[var(--radius-card)] p-5 ${
          net < 0 ? "bg-negative-100" : "bg-forest-800 on-forest"
        }`}
      >
        <div
          className="label"
          style={{ color: net < 0 ? undefined : "var(--color-forest-300)" }}
        >
          Expected net · {formatMonth(monthKey)}
        </div>
        <div
          className={`mt-1 font-display text-[34px] font-extrabold tracking-[-0.03em] tabular-nums ${
            net < 0 ? "text-negative-600" : "text-white"
          }`}
        >
          {formatRupiah(net)}
        </div>
        <p
          className="mt-1 text-[13px]"
          style={{ color: net < 0 ? "var(--color-negative-600)" : "var(--color-forest-200)" }}
        >
          What the plan says this month will do, before anything actually happens.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-2">
        {groups.map((group) => (
          <div
            key={group.label}
            className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
          >
            <div className="label">{group.label}</div>
            <div
              className={`mt-1 font-display text-[18px] font-bold tabular-nums ${group.tone}`}
            >
              {formatRupiah(group.total)}
            </div>
          </div>
        ))}
      </div>

      {unpricedTargets.length > 0 && (
        <p className="rounded-[var(--radius-card)] border-l-4 border-warning-500 bg-warning-100 p-4 text-[13px] text-ink-700">
          <strong>{unpricedTargets.join(", ")}</strong>{" "}
          {unpricedTargets.length === 1 ? "has" : "have"} a buy target but no
          price — no live quote, no past buys, no price set on the target. Those
          targets are <strong>not counted</strong> above. Set a price on{" "}
          <Link href={`/stocks/targets?m=${monthKey}`} className="underline">
            the targets page
          </Link>
          .
        </p>
      )}

      {groups.map((group) =>
        group.lines.length === 0 ? null : (
          <section key={group.label}>
            <h2 className="label mb-2">{group.label}</h2>
            <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
              {[...group.lines]
                .sort((a, b) => b.amount - a.amount)
                .map((line, i) => (
                  <div
                    key={`${line.label}-${i}`}
                    className={`flex items-baseline justify-between gap-3 px-4 py-3 ${
                      i > 0 ? "border-t border-[var(--border-subtle)]" : ""
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-medium text-ink-900">
                        {line.label}
                      </span>
                      {line.note && (
                        <span className="block text-[13px] text-ink-500">
                          {line.note}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold text-ink-900 tabular-nums">
                      {formatRupiah(line.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </section>
        )
      )}

      {groups.every((g) => g.lines.length === 0) && (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          Nothing planned for this month yet. Set some budgets to see what it
          should do.
        </p>
      )}
    </div>
  );
}

import Link from "next/link";
import MonthSwitcher from "@/components/MonthSwitcher";
import { ChevronDown, ChevronLeft } from "@/components/icons";
import {
  currentMonthKey,
  getBudgetsForMonth,
  getCategories,
  getMonthTransactions,
  monthlyEquivalent,
  prevMonthKey,
} from "@/lib/data";
import { installmentAutoBudgets, loanAutoBudget } from "@/lib/autoBudget";
import { formatMonth, formatRupiah } from "@/lib/format";
import type { CategoryKind } from "@/lib/types";
import BudgetRow from "./BudgetRow";

export const dynamic = "force-dynamic";

export const metadata = { title: "Budgets · Atlas" };

const TABS: { kind: CategoryKind; label: string; blurb: string }[] = [
  {
    kind: "expense",
    label: "Expense",
    blurb: "A limit. Going over is what the dashboard warns you about.",
  },
  {
    kind: "income",
    label: "Income",
    blurb: "A target. Meeting it is the win.",
  },
  {
    kind: "saving",
    label: "Saving",
    blurb: "A target for money you intend to set aside.",
  },
];

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; k?: string; only?: string }>;
}) {
  const { m, k, only } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();
  const activeKind = (TABS.some((t) => t.kind === k) ? k : "expense") as CategoryKind;
  const onlyBudgeted = only === "1";

  const previousMonth = prevMonthKey(monthKey);

  const [categories, budgets, loanAuto, installmentAuto, previousTxns] =
    await Promise.all([
      getCategories(),
      getBudgetsForMonth(monthKey),
      loanAutoBudget(monthKey),
      installmentAutoBudgets(monthKey),
      // The one new query on this page: what each category actually did last month, so a limit
      // is set against evidence rather than memory (atlas-ux-plan-manage-pages.md, Budgets #3).
      getMonthTransactions(previousMonth),
    ]);

  const lastMonthByCategory = new Map<number, number>();
  for (const txn of previousTxns) {
    if (txn.category_id == null || txn.type === "transfer") continue;
    const signed = txn.type === "withdrawal" ? -txn.amount : txn.amount;
    lastMonthByCategory.set(
      txn.category_id,
      (lastMonthByCategory.get(txn.category_id) ?? 0) + signed
    );
  }

  const autoByCategory = new Map(installmentAuto.byCategory);
  if (loanAuto) autoByCategory.set(loanAuto.category_id, loanAuto);

  // --- Expected cashflow: planned income − planned expense − planned saving ---
  // Every cadence converted to its monthly equivalent, so the figure means the same thing
  // whichever mix of daily/weekly/yearly budgets is in play.
  let plannedIncome = 0;
  let plannedExpense = 0;
  let plannedSaving = 0;

  for (const category of categories) {
    const auto = autoByCategory.get(category.id);
    const amount =
      auto?.amount ?? budgets.get(category.id)?.amount ?? 0;
    if (amount <= 0) continue;
    // An auto figure is already a real monthly total; a manual one carries a cadence.
    const monthly = auto ? amount : monthlyEquivalent(amount, category.period);

    if (category.kind === "income") plannedIncome += monthly;
    else if (category.kind === "expense") plannedExpense += monthly;
    else if (category.kind === "saving") plannedSaving += monthly;
  }
  plannedExpense += installmentAuto.unassigned.amount;

  const expected = plannedIncome - plannedExpense - plannedSaving;

  const tab = TABS.find((t) => t.kind === activeKind) ?? TABS[0];

  /*
   * Every category rendered a row whether budgeted or not, in category order — 30 categories
   * meant 30 rows and no way to narrow (atlas-ux-plan-manage-pages.md, Budgets UX #4). Set rows
   * now sort above unset ones, and a chip filters to just those, matching the Categories page's
   * "Show archived".
   */
  const kindRows = categories.filter((c) => c.kind === activeKind);
  const isSet = (categoryId: number) =>
    autoByCategory.has(categoryId) ||
    (budgets.get(categoryId)?.amount ?? 0) > 0;

  const unsetCount = kindRows.filter((c) => !isSet(c.id)).length;
  const rows = kindRows
    .filter((c) => !onlyBudgeted || isSet(c.id))
    .sort((a, b) => Number(isSet(b.id)) - Number(isSet(a.id)));

  return (
    <div className="space-y-4 privacy-scope">
      <header className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Link
            href="/more"
            aria-label="Back to more"
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
            Budgets
          </h1>
        </div>
        {/*
          Budgets, Expected cashflow and the dashboard's "Budget vs actual" tab are three views
          of one feature — cross-linking them so they read as such (atlas-ux-review.md #7).
        */}
        <Link
          href={`/more/cashflow?m=${monthKey}`}
          className="shrink-0 text-[13px] font-semibold text-forest-800 no-underline"
        >
          Expected cashflow →
        </Link>
      </header>

      <MonthSwitcher
        monthKey={monthKey}
        params={onlyBudgeted ? { k: activeKind, only: "1" } : { k: activeKind }}
      />

      <section
        className={`rounded-[var(--radius-card)] p-5 ${
          expected < 0 ? "bg-negative-100" : "bg-forest-800 on-forest"
        }`}
      >
        {/*
          Was also called "Expected cashflow" — the same name as the link 40px above it, which
          navigates somewhere else entirely (atlas-ux-plan-manage-pages.md, Budgets UX #2).
        */}
        <div
          className="label"
          style={{ color: expected < 0 ? undefined : "var(--color-forest-300)" }}
        >
          Left over each month
        </div>
        <div
          className={`mt-1 font-display text-[30px] font-extrabold tracking-[-0.03em] tabular-nums ${
            expected < 0 ? "text-negative-600" : "text-white"
          }`}
        >
          {formatRupiah(expected)}
        </div>
        <p
          className="mt-1 text-[13px]"
          style={{ color: expected < 0 ? "var(--color-negative-600)" : "var(--color-forest-200)" }}
        >
          {expected < 0
            ? "Your plan spends more than it earns. Trim a limit or raise a target."
            : "Planned income, less planned expense and saving."}
        </p>
      </section>

      {/*
        Moved up from a three-paragraph footer at the bottom of a long scroll, where a confused
        user has already given up. The "Scope" paragraph is gone entirely — it restated the
        per-scope hints BudgetRow already shows inline (atlas-ux-plan-manage-pages.md, Budgets #5).
      */}
      <details className="overflow-hidden rounded-[var(--radius-card)] bg-sage-100">
        <summary className="flex items-center gap-2 px-4 py-3 text-[14px] font-semibold text-forest-800">
          <span className="flex-1">How budgets work</span>
          <span className="chevron text-forest-800">
            <ChevronDown size={18} />
          </span>
        </summary>
        <div className="space-y-2 px-4 pb-4 text-[13px] text-ink-700">
          <p>
            <strong>Cadence.</strong> A daily or weekly budget is converted to a
            monthly equivalent (×30.4 and ×4.345) wherever totals are shown, so
            the numbers stay comparable. A yearly budget is one whole-year limit,
            divided by twelve.
          </p>
          <p>
            <strong>Auto rows.</strong> Loan collection and each installment
            category are derived from their own schedules, so there is nothing to
            type — and nothing to keep in sync.
          </p>
        </div>
      </details>

      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.kind}
            href={`/more/budgets?m=${monthKey}&k=${t.kind}${onlyBudgeted ? "&only=1" : ""}`}
            aria-current={t.kind === activeKind ? "page" : undefined}
            className={`chip no-underline ${t.kind === activeKind ? "chip-on" : ""}`}
          >
            {t.label}
          </Link>
        ))}
        {(onlyBudgeted || unsetCount > 0) && (
          <Link
            href={`/more/budgets?m=${monthKey}&k=${activeKind}${onlyBudgeted ? "" : "&only=1"}`}
            aria-current={onlyBudgeted ? "page" : undefined}
            className={`chip no-underline ${onlyBudgeted ? "chip-on" : ""}`}
          >
            {onlyBudgeted ? `Show all ${kindRows.length}` : "Only budgeted"}
          </Link>
        )}
      </nav>

      <p className="text-[13px] text-ink-500">{tab.blurb}</p>

      <div className="space-y-2">
        {rows.map((category) => {
          const auto = autoByCategory.get(category.id);

          if (auto) {
            return (
              /*
               * An auto row used to be styled almost identically to a BudgetRow and silently did
               * nothing when tapped — an 11px lowercase `auto` badge was the only tell. Flatter
               * ground, no chevron, a spelled-out badge and a line saying where the number comes
               * from (atlas-ux-plan-manage-pages.md, Budgets UX #7).
               */
              <div
                key={category.id}
                className="rounded-[var(--radius-card)] border border-dashed border-[var(--border-subtle)] bg-transparent p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink-700">
                      {category.name}
                      <span className="badge ml-2 bg-cream-200 text-ink-700">
                        Automatic
                      </span>
                    </span>
                    <span className="block text-[13px] text-ink-500">
                      Set from your schedule — nothing to type. {auto.note}.
                    </span>
                  </span>
                  <span className="shrink-0 font-display text-[17px] font-bold text-ink-700 tabular-nums">
                    {formatRupiah(auto.amount)}
                  </span>
                </div>
              </div>
            );
          }

          const budget = budgets.get(category.id);
          const amount = budget?.amount ?? 0;

          return (
            <BudgetRow
              key={category.id}
              categoryId={category.id}
              name={category.name}
              period={category.period}
              amount={amount}
              monthKey={monthKey}
              source={budget?.source ?? "none"}
              monthlyEquivalent={monthlyEquivalent(amount, category.period)}
              lastMonthActual={lastMonthByCategory.get(category.id) ?? 0}
              lastMonthLabel={formatMonth(previousMonth)}
            />
          );
        })}

        {rows.length === 0 && (
          <div className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            {onlyBudgeted && kindRows.length > 0 ? (
              <>
                <p>
                  No {tab.label.toLowerCase()} category has a budget yet.
                </p>
                <Link
                  href={`/more/budgets?m=${monthKey}&k=${activeKind}`}
                  className="mt-1 inline-block text-[13px] font-semibold text-forest-800 no-underline"
                >
                  Show all {kindRows.length} →
                </Link>
              </>
            ) : (
              <>
                <p>No {tab.label.toLowerCase()} categories yet.</p>
                <Link
                  href="/more/categories"
                  className="mt-1 inline-block text-[13px] font-semibold text-forest-800 no-underline"
                >
                  Add one in Categories →
                </Link>
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

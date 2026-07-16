import Link from "next/link";
import { getBudgetsForMonth, getCategories, getLoanPayments, getLoans, getPaylaterItems, getPaylaterProviders } from "@/lib/data";
import { getStockPortfolio, getStockTargetsForMonth } from "@/lib/stocks";
import { getSettings, mappedCategoryId } from "@/lib/settings";
import { formatMonth, formatNumber, formatRupiah, todayISO } from "@/lib/format";
import type { BudgetPeriod } from "@/lib/types";
import MonthSwitcher from "@/components/MonthSwitcher";

export const dynamic = "force-dynamic";

type Kind = "income" | "expense" | "saving" | "investment";
const FLOWS: { key: Kind; label: string; color: string; dir: "in" | "out" }[] = [
  { key: "income", label: "Income", color: "text-green", dir: "in" },
  { key: "expense", label: "Expense", color: "text-red", dir: "out" },
  { key: "saving", label: "Saving", color: "text-sky", dir: "out" },
  { key: "investment", label: "Investment", color: "text-plum", dir: "out" },
];

const monthlyEquiv = (amt: number, p: BudgetPeriod) =>
  p === "daily" ? amt * 30.4 : p === "weekly" ? amt * 4.345 : p === "yearly" ? amt / 12 : amt;

export default async function CashflowPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;

  const [cats, budgets, loans, payments, paylater, providers, targets, portfolio, settings] = await Promise.all([
    getCategories(true),
    getBudgetsForMonth(monthKey),
    getLoans(),
    getLoanPayments(),
    getPaylaterItems(),
    getPaylaterProviders(true),
    getStockTargetsForMonth(monthKey),
    getStockPortfolio(),
    getSettings(),
  ]);

  // Auto sources: loan collection (income) and installments (expense, by provider category).
  const hutangCatId = mappedCategoryId(settings, cats, "cat_loan", "Hutang", "income");
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const loanExpected = payments
    .filter((p) => p.period_month === monthKey)
    .reduce((s, p) => s + (loanById.get(p.loan_id)?.installment ?? 0), 0);
  const providerById = new Map(providers.map((pr) => [pr.id, pr]));
  const instByCat = new Map<number, number>();
  let otherInst = 0;
  for (const p of paylater) {
    if (!(p.first_month_date <= monthKey && monthKey <= p.last_month_date)) continue;
    const catId = p.provider_id ? providerById.get(p.provider_id)?.category_id ?? null : null;
    if (catId) instByCat.set(catId, (instByCat.get(catId) ?? 0) + p.monthly_amount);
    else otherInst += p.monthly_amount;
  }
  const budgetByCat = new Map(budgets.map((b) => [b.category_id, b.amount]));

  // Expected amount per category: loan/installments are authoritative; else the (monthly-
  // equivalent) budget you set.
  type Line = { name: string; amount: number };
  const lines: Record<Kind, Line[]> = { income: [], expense: [], saving: [], investment: [] };
  for (const c of cats) {
    if (c.id === hutangCatId) continue; // loan collection added as its own line below
    const amount = c.is_installment
      ? instByCat.get(c.id) ?? 0
      : Math.round(monthlyEquiv(budgetByCat.get(c.id) ?? 0, c.period));
    if (amount > 0) lines[c.kind].push({ name: c.name, amount });
  }
  if (loanExpected > 0) lines.income.push({ name: "Loan collection", amount: loanExpected });
  if (otherInst > 0) lines.expense.push({ name: "Installments · no provider", amount: otherInst });
  // Stock buy targets → expected investment. Use the target's speculative price, else fall
  // back to the live price of a ticker you already hold (matching the Stocks page estimate).
  const heldPrice = new Map(portfolio.holdings.filter((h) => h.price != null).map((h) => [h.ticker, h.price as number]));
  let stockUnpriced = 0;
  for (const tg of targets) {
    const price = tg.price ?? heldPrice.get(tg.ticker) ?? null;
    if (price) lines.investment.push({ name: `${tg.ticker} · ${tg.lots} lot${tg.lots > 1 ? "s" : ""}`, amount: Math.round(tg.lots * 100 * price) });
    else stockUnpriced++;
  }
  for (const k of Object.keys(lines) as Kind[]) lines[k].sort((a, b) => b.amount - a.amount);

  const total = (k: Kind) => lines[k].reduce((s, l) => s + l.amount, 0);
  const net = total("income") - total("expense") - total("saving") - total("investment");
  const moneyIn = total("income");
  const moneyOut = total("expense") + total("saving") + total("investment");
  const hasAny = moneyIn > 0 || moneyOut > 0;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Expected cashflow</h1>
        <span className="w-12" />
      </div>

      <MonthSwitcher monthKey={monthKey} basePath="/more/cashflow" />

      {/* Net hero */}
      <div className="card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(63,185,80,0.16),transparent_70%)]" />
        <div className="label">Expected net · {formatMonth(monthKey)}</div>
        <div className={`mt-1.5 font-display text-3xl font-semibold tabular-nums ${net >= 0 ? "text-green" : "text-red"}`}>
          {net >= 0 ? "+" : "−"}
          {formatRupiah(Math.abs(net))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-paper-faint">
          <span>in <span className="text-green">{formatRupiah(moneyIn)}</span></span>
          <span>out <span className="text-red">{formatRupiah(moneyOut)}</span></span>
        </div>
        {net < 0 && (
          <p className="mt-2 rounded-lg bg-red/10 px-2.5 py-1.5 text-xs text-red">
            ⚠ Your plan sends {formatRupiah(Math.abs(net))} more out than comes in this month.
          </p>
        )}
      </div>

      {!hasAny ? (
        <p className="pt-6 text-center text-sm text-paper-faint">
          Nothing planned yet — set{" "}
          <Link href="/more/budgets" className="text-green underline">budgets</Link>,{" "}
          <Link href="/more/loans" className="text-green underline">loans</Link>,{" "}
          <Link href="/more/paylater" className="text-green underline">installments</Link> or{" "}
          <Link href="/stocks" className="text-green underline">stock targets</Link>.
        </p>
      ) : (
        <>
          {/* Flow totals */}
          <div className="grid grid-cols-2 gap-2.5">
            {FLOWS.map((f) => (
              <div key={f.key} className="card p-3.5">
                <div className="flex items-center justify-between">
                  <span className="label">{f.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-paper-faint">{f.dir}</span>
                </div>
                <div className={`mt-1 font-display text-base font-bold tabular-nums ${f.color}`}>{formatRupiah(total(f.key))}</div>
                <div className="mt-0.5 text-[11px] text-paper-faint">{lines[f.key].length} source{lines[f.key].length === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>

          {/* Per-flow breakdown */}
          {FLOWS.filter((f) => lines[f.key].length > 0).map((f) => (
            <section key={f.key}>
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className={`label ${f.color}`}>{f.label}</h2>
                <span className={`text-xs tabular-nums ${f.color}`}>{formatRupiah(total(f.key))}</span>
              </div>
              <div className="card divide-y divide-line/50">
                {lines[f.key].map((r) => (
                  <div key={r.name} className="flex items-baseline justify-between gap-2 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate text-paper">{r.name}</span>
                    <span className="shrink-0 tabular-nums text-paper-dim">{formatNumber(r.amount)}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <p className="px-1 text-[11px] text-paper-faint">
            Planned, not actual: from your category budgets (converted to a monthly amount),
            expected loan collection, active installments, and stock buy targets.
          </p>
          {stockUnpriced > 0 && (
            <p className="px-1 text-[11px] text-amber">
              {stockUnpriced} stock target{stockUnpriced > 1 ? "s" : ""} not counted — set a
              speculative price/share on{" "}
              <Link href="/stocks" className="underline">Stocks</Link> to include{" "}
              {stockUnpriced > 1 ? "them" : "it"}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

import Link from "next/link";
import { getBudgetsForMonth, getCategories, getLoanPayments, getLoans, getPaylaterItems } from "@/lib/data";
import { formatNumber, formatRupiah, todayISO } from "@/lib/format";
import MonthSwitcher from "@/components/MonthSwitcher";
import { setBudget } from "../actions";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const [cats, budgets, loans, payments, paylater] = await Promise.all([
    getCategories(),
    getBudgetsForMonth(monthKey),
    getLoans(),
    getLoanPayments(),
    getPaylaterItems(),
  ]);
  const byCat = new Map(budgets.map((b) => [b.category_id, b.amount]));
  const rows = cats.filter((c) => c.kind === "income" || c.kind === "expense");

  // Auto budgets for the selected month: "Hutang" income = total expected to collect
  // from Loans; "Cicilan Paylater" expense = total installments active this month.
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const loanExpected = payments
    .filter((p) => p.period_month === monthKey)
    .reduce((s, p) => s + (loanById.get(p.loan_id)?.installment ?? 0), 0);
  const paylaterExpected = paylater
    .filter((p) => p.first_month_date <= monthKey && monthKey <= p.last_month_date)
    .reduce((s, p) => s + p.monthly_amount, 0);
  const isAuto = (name: string, kind: string) =>
    (kind === "income" && name === "Hutang") || (kind === "expense" && name === "Cicilan Paylater");
  const autoValue = (name: string) => (name === "Cicilan Paylater" ? paylaterExpected : loanExpected);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Budgets</h1>
        <span className="w-12" />
      </div>

      <MonthSwitcher monthKey={monthKey} basePath="/more/budgets" />

      <div className="space-y-2">
        {rows.map((c) =>
          isAuto(c.name, c.kind) ? (
            <div key={c.id} className="card flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-sm font-medium text-paper">
                {c.name}
                <span className="ml-1.5 rounded bg-green/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">
                  auto
                </span>
              </span>
              <span className="font-display text-sm font-medium tabular-nums text-paper">
                {formatRupiah(autoValue(c.name))}
              </span>
            </div>
          ) : (
            <form key={c.id} action={setBudget} className="card flex items-center justify-between gap-3 px-4 py-2.5">
              <input type="hidden" name="category_id" value={c.id} />
              <input type="hidden" name="month" value={monthKey} />
              <span className="shrink-0 text-sm font-medium text-paper">
                {c.name}
                <span className="ml-1.5 text-[10px] uppercase tracking-wider text-paper-faint">{c.kind}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-xs text-paper-faint">Rp</span>
                <input
                  name="amount"
                  inputMode="numeric"
                  defaultValue={byCat.get(c.id) ? formatNumber(byCat.get(c.id)!) : ""}
                  placeholder="0"
                  className="w-24 bg-transparent text-right font-display text-sm font-medium tabular-nums text-paper outline-none placeholder:text-paper-faint"
                />
                <button className="rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green active:bg-green/25">Save</button>
              </span>
            </form>
          )
        )}
      </div>

      <p className="px-1 text-xs text-paper-faint">
        <span className="text-green">Hutang</span> is auto-calculated from{" "}
        <Link href="/more/loans" className="underline">Loans</Link> — the total you expect to collect this month.{" "}
        <span className="text-red">Cicilan Paylater</span> is auto-calculated from{" "}
        <Link href="/more/paylater" className="underline">My Paylater</Link> — the total installments active this month.
      </p>
    </div>
  );
}

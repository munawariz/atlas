import Link from "next/link";
import { getBudgetsForMonth, getCategories, getLoanPayments, getLoans, getPaylaterItems } from "@/lib/data";
import { formatNumber, formatRupiah, formatRupiahShort, todayISO } from "@/lib/format";
import MonthSwitcher from "@/components/MonthSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { getSettings, mappedCategoryId } from "@/lib/settings";
import { setBudget } from "../actions";

export const dynamic = "force-dynamic";

const KINDS = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "saving", label: "Saving" },
] as const;

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ m?: string; kind?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const kind = KINDS.some((k) => k.value === sp.kind) ? (sp.kind as string) : "expense";
  const [cats, budgets, loans, payments, paylater, settings] = await Promise.all([
    getCategories(),
    getBudgetsForMonth(monthKey),
    getLoans(),
    getLoanPayments(),
    getPaylaterItems(),
    getSettings(),
  ]);
  const byCat = new Map(budgets.map((b) => [b.category_id, b.amount]));
  const recurringSet = new Set(budgets.filter((b) => b.recurring).map((b) => b.category_id));
  const rows = cats.filter((c) => c.kind === kind);

  // Auto budgets for the selected month: the configured loan-income category = total
  // expected to collect from Loans; the configured paylater-expense category =
  // installments active this month using the default category. Custom ones add on top.
  const loanById = new Map(loans.map((l) => [l.id, l]));
  const loanExpected = payments
    .filter((p) => p.period_month === monthKey)
    .reduce((s, p) => s + (loanById.get(p.loan_id)?.installment ?? 0), 0);
  const hutangCatId = mappedCategoryId(settings, cats, "cat_loan", "Hutang", "income");
  const cicilanCatId = mappedCategoryId(settings, cats, "cat_paylater", "Cicilan Paylater", "expense");
  const instByCat = new Map<number, number>();
  for (const p of paylater) {
    if (!(p.first_month_date <= monthKey && monthKey <= p.last_month_date)) continue;
    const catId = p.category_id ?? cicilanCatId;
    if (catId) instByCat.set(catId, (instByCat.get(catId) ?? 0) + p.monthly_amount);
  }
  const instFor = (id: number) => instByCat.get(id) ?? 0;
  const isAuto = (id: number) => id === hutangCatId || id === cicilanCatId;
  const autoValue = (id: number) => (id === cicilanCatId ? instFor(cicilanCatId ?? -1) : loanExpected);

  // Expected cashflow from the PLAN (budgets): income in, minus expense + saving out.
  // Effective budget = auto value, else the user budget plus any installment additions.
  const effBudget = (c: { id: number; name: string; kind: string }) =>
    isAuto(c.id) ? autoValue(c.id) : (byCat.get(c.id) ?? 0) + instFor(c.id);
  let plannedIncome = 0;
  let plannedExpense = 0;
  let plannedSaving = 0;
  for (const c of cats) {
    const eff = effBudget(c);
    if (c.kind === "income") plannedIncome += eff;
    else if (c.kind === "expense") plannedExpense += eff;
    else if (c.kind === "saving") plannedSaving += eff;
  }
  const cashflow = plannedIncome - plannedExpense - plannedSaving;

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Budgets</h1>
        <span className="w-12" />
      </div>

      <MonthSwitcher monthKey={monthKey} basePath="/more/budgets" params={{ kind }} />

      {/* Planned cashflow for the month (income budget − expense − saving budgets) */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <span className="label">Expected cashflow</span>
          <span className={`font-display text-base font-semibold tabular-nums ${cashflow >= 0 ? "text-green" : "text-red"}`}>
            {cashflow >= 0 ? "+" : "−"}
            {formatRupiah(Math.abs(cashflow))}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-paper-faint">
          <span>in <span className="text-green">{formatRupiahShort(plannedIncome)}</span></span>
          <span>spend <span className="text-red">{formatRupiahShort(plannedExpense)}</span></span>
          {plannedSaving > 0 && <span>save <span className="text-sky">{formatRupiahShort(plannedSaving)}</span></span>}
        </div>
        {cashflow < 0 && (
          <p className="mt-2 rounded-lg bg-red/10 px-2.5 py-1.5 text-xs text-red">
            ⚠ Heads up — your budget plans {formatRupiah(Math.abs(cashflow))} more going out than coming in this month.
          </p>
        )}
      </div>

      <div className="flex gap-1.5">
        {KINDS.map((k) => (
          <Link
            key={k.value}
            href={`/more/budgets?m=${monthKey}&kind=${k.value}`}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-medium transition-colors ${
              kind === k.value ? "bg-gold text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {k.label}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-paper-faint">No {kind} categories.</p>
        ) : (
          rows.map((c) =>
          isAuto(c.id) ? (
            <div key={c.id} className="card flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-sm font-medium text-paper">
                {c.name}
                <span className="ml-1.5 rounded bg-green/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-green">
                  auto
                </span>
              </span>
              <span className="font-display text-sm font-medium tabular-nums text-paper">
                {formatRupiah(autoValue(c.id))}
              </span>
            </div>
          ) : (
            <form key={c.id} action={setBudget} className="card px-4 py-2.5">
              <input type="hidden" name="category_id" value={c.id} />
              <input type="hidden" name="month" value={monthKey} />
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-sm font-medium text-paper">
                  {c.name}
                  <span className="ml-1.5 text-[10px] uppercase tracking-wider text-paper-faint">{c.kind}</span>
                  {recurringSet.has(c.id) && (
                    <span className="ml-1.5 rounded bg-sky/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky">
                      every mo
                    </span>
                  )}
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
                </span>
              </div>
              {instFor(c.id) > 0 && (
                <p className="mt-1 text-[11px] text-plum">
                  + {formatRupiah(instFor(c.id))} from installments → effective{" "}
                  <span className="text-paper-dim">{formatRupiah((byCat.get(c.id) ?? 0) + instFor(c.id))}</span>
                </p>
              )}
              <div className="mt-2 flex items-center justify-end gap-2">
                <select
                  name="scope"
                  defaultValue="forward"
                  className="rounded-lg border border-line/60 bg-ink-3 px-2 py-1 text-xs text-paper-dim outline-none [color-scheme:dark]"
                >
                  <option value="forward">This month →</option>
                  <option value="all">All months</option>
                  <option value="month">This month only</option>
                </select>
                <SubmitButton
                  pendingText="Saving…"
                  className="rounded-full bg-green/15 px-3 py-1 text-xs font-semibold text-green active:bg-green/25"
                >
                  Save
                </SubmitButton>
              </div>
            </form>
          )
          )
        )}
      </div>

      <p className="px-1 text-xs text-paper-faint">
        Pick a scope when saving: <span className="text-paper-dim">This month →</span> sets it for this month and every
        month after, <span className="text-paper-dim">All months</span> sets it everywhere, and{" "}
        <span className="text-paper-dim">This month only</span> overrides just this one. A{" "}
        <span className="rounded bg-sky/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-sky">every mo</span>{" "}
        tag means the value comes from a recurring rule.
      </p>

      {kind !== "saving" && (
        <p className="px-1 text-xs text-paper-faint">
          <span className="text-green">Hutang</span> is auto-calculated from{" "}
          <Link href="/more/loans" className="underline">Loans</Link> — the total you expect to collect this month.{" "}
          <span className="text-red">Cicilan Paylater</span> is auto-calculated from default{" "}
          <Link href="/more/paylater" className="underline">My Paylater</Link> installments. An installment set to a custom
          category instead <span className="text-plum">adds</span> to that category's budget here.
        </p>
      )}
    </div>
  );
}

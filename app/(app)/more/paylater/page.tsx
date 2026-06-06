import Link from "next/link";
import { getCategoriesByKind, getPaylaterItems, getPaylaterPayments, getWallets } from "@/lib/data";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import MonthSwitcher from "@/components/MonthSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import { addPaylater, deletePaylater } from "../actions";
import PaylaterToggle from "./PaylaterToggle";
import PaylaterEdit from "./PaylaterEdit";
import PaylaterMonths from "./PaylaterMonths";

export const dynamic = "force-dynamic";

// Every first-of-month from `first` to `last`, inclusive.
const monthsBetween = (first: string, last: string) => {
  const out: string[] = [];
  let [y, m] = first.slice(0, 7).split("-").map(Number);
  const [ly, lm] = last.slice(0, 7).split("-").map(Number);
  while (y < ly || (y === ly && m <= lm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}-01`);
    if (++m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
};

const span = (a: string, b: string) => {
  const [ay, am] = a.slice(0, 7).split("-").map(Number);
  const [by, bm] = b.slice(0, 7).split("-").map(Number);
  return by * 12 + bm - (ay * 12 + am) + 1;
};

export default async function PaylaterPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;
  const ym = monthKey.slice(0, 7);

  const [items, paid, wallets, expenseCats] = await Promise.all([
    getPaylaterItems(),
    getPaylaterPayments(),
    getWallets(),
    getCategoriesByKind("expense"),
  ]);
  const catName = new Map(expenseCats.map((c) => [c.id, c.name]));
  // Categories a user can pick for an installment (the default is Cicilan Paylater).
  const pickCats = expenseCats.filter((c) => c.name !== "Cicilan Paylater").map((c) => ({ id: c.id, name: c.name }));
  const paidSet = new Set(paid.map((p) => `${p.item_id}:${p.month}`));
  const isPaid = (p: (typeof items)[number]) => paidSet.has(`${p.id}:${monthKey}`);
  const paidWithTxn = new Set(paid.filter((p) => p.expense_txn_id != null).map((p) => `${p.item_id}:${p.month}`));
  const hasExpense = (p: (typeof items)[number]) => paidWithTxn.has(`${p.id}:${monthKey}`);

  const active = items.filter((p) => p.first_month_date <= monthKey && monthKey <= p.last_month_date);
  // Sort by: (0) one-month "1/1" installments first (top priority), then (1) expense
  // category, (2) months left owed (most first), (3) shorter total installment — so a
  // 6-month/1-left ranks above a 12-month/1-left.
  const catLabel = (p: (typeof items)[number]) =>
    p.category_id ? catName.get(p.category_id) ?? "Cicilan Paylater" : "Cicilan Paylater";
  const totalMonths = (p: (typeof items)[number]) => span(p.first_month_date, p.last_month_date);
  active.sort((a, b) => {
    const oneA = totalMonths(a) === 1;
    const oneB = totalMonths(b) === 1;
    if (oneA !== oneB) return oneA ? -1 : 1;
    const byCat = catLabel(a).localeCompare(catLabel(b));
    if (byCat !== 0) return byCat;
    const leftA = span(monthKey, a.last_month_date);
    const leftB = span(monthKey, b.last_month_date);
    if (leftA !== leftB) return leftB - leftA; // most months still owed first
    return totalMonths(a) - totalMonths(b);
  });
  const owed = active.filter((p) => !isPaid(p));
  const dueTotal = owed.reduce((a, p) => a + p.monthly_amount, 0);
  const paidTotal = active.filter(isPaid).reduce((a, p) => a + p.monthly_amount, 0);

  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">My Paylater</h1>
        <span className="w-12" />
      </div>

      <MonthSwitcher monthKey={monthKey} basePath="/more/paylater" />

      <div className="card p-4">
        <div className="text-sm text-paper-dim">
          {active.length} due in {formatMonth(monthKey)} ·{" "}
          <span className="font-display text-sand">{formatRupiah(dueTotal)}</span> owed
        </div>
        <div className="mt-1 text-xs text-paper-faint">
          <span className="text-green">{formatRupiah(paidTotal)}</span> already paid this month · {items.length} items total
        </div>
      </div>

      <form action={addPaylater} className="card space-y-2 p-4">
        <input name="item" placeholder="Item name" className="field" />
        <input name="monthly_amount" inputMode="numeric" placeholder="Monthly Rp" className="field" />
        <div className="flex gap-2">
          <label className="flex-1 text-xs text-paper-dim">
            First month
            <input type="month" name="first_month" defaultValue={ym} className="field mt-1 [color-scheme:dark]" />
          </label>
          <label className="flex-1 text-xs text-paper-dim">
            Last month
            <input type="month" name="last_month" defaultValue={ym} className="field mt-1 [color-scheme:dark]" />
          </label>
        </div>
        <label className="block text-xs text-paper-dim">
          Count in budget as
          <select name="category_id" defaultValue="" className="field mt-1 [color-scheme:dark]">
            <option value="" className="bg-ink-2">Cicilan Paylater (default)</option>
            {pickCats.map((c) => (
              <option key={c.id} value={c.id} className="bg-ink-2">{c.name}</option>
            ))}
          </select>
        </label>
        <input name="note" placeholder="Note (optional)" className="field" />
        <SubmitButton pendingText="Adding…" className="w-full rounded-2xl bg-green py-2.5 font-semibold text-ink">
          Add item
        </SubmitButton>
      </form>

      {active.length === 0 ? (
        <p className="pt-6 text-center text-sm text-paper-faint">Nothing due in {formatMonth(monthKey)}.</p>
      ) : (
        <div className="space-y-2">
          {active.map((p) => {
            const paid = isPaid(p);
            const months = span(p.first_month_date, p.last_month_date);
            const monthsLeft = span(monthKey, p.last_month_date); // this month through the last
            const monthList = monthsBetween(p.first_month_date, p.last_month_date).map((m) => ({
              month: m,
              paid: paidSet.has(`${p.id}:${m}`),
            }));
            return (
              <div key={p.id} className="card px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-paper">{p.item}</span>
                      {p.category_id && catName.get(p.category_id) && catName.get(p.category_id) !== "Cicilan Paylater" && (
                        <span className="shrink-0 rounded bg-plum/15 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-plum">
                          {catName.get(p.category_id)}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-paper-dim">
                      {formatRupiah(p.monthly_amount)}/mo · {monthsLeft}/{months} {months > 1 ? "months" : "month"} left
                      {p.note ? ` · ${p.note}` : ""}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                  <PaylaterToggle
                    itemId={p.id}
                    item={p.item}
                    month={monthKey}
                    amount={p.monthly_amount}
                    paid={paid}
                    hasExpense={hasExpense(p)}
                    wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
                  />
                  <PaylaterEdit
                    id={p.id}
                    item={p.item}
                    monthlyAmount={p.monthly_amount}
                    firstMonth={p.first_month_date}
                    lastMonth={p.last_month_date}
                    categoryId={p.category_id}
                    note={p.note}
                    categories={pickCats}
                  />
                  <form action={deletePaylater.bind(null, p.id)}>
                    <SubmitButton
                      label="Delete"
                      className="grid h-8 w-8 place-items-center rounded-lg text-clay active:bg-clay/10"
                    >
                      <TrashIcon className="h-[18px] w-[18px]" />
                    </SubmitButton>
                  </form>
                  </div>
                </div>
                <PaylaterMonths months={monthList} current={monthKey} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

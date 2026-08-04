import Link from "next/link";
import MonthSwitcher from "@/components/MonthSwitcher";
import SubmitButton from "@/components/SubmitButton";
import MoneyInput from "@/components/MoneyInput";
import { ChevronLeft } from "@/components/icons";
import {
  currentMonthKey,
  getPaylaterItems,
  getPaylaterPayments,
  getPaylaterProviders,
  getWallets,
} from "@/lib/data";
import { itemActiveIn } from "@/lib/autoBudget";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import type { PaylaterItem } from "@/lib/types";
import PaylaterItemCard from "./PaylaterItemCard";
import { addPaylaterItem, payPaylaterMonths } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "My Installment · Atlas" };

/** Total months in an item's schedule. */
function totalMonths(item: PaylaterItem): number {
  const fy = parseInt(item.first_month_date.slice(0, 4), 10);
  const fm = parseInt(item.first_month_date.slice(5, 7), 10);
  const ly = parseInt(item.last_month_date.slice(0, 4), 10);
  const lm = parseInt(item.last_month_date.slice(5, 7), 10);
  return Math.max(1, (ly - fy) * 12 + (lm - fm) + 1);
}

export default async function PaylaterPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();

  const [items, payments, providers, wallets] = await Promise.all([
    getPaylaterItems(),
    getPaylaterPayments(),
    getPaylaterProviders(),
    getWallets(),
  ]);

  const paidByItem = new Map<number, Set<string>>();
  for (const payment of payments) {
    const set = paidByItem.get(payment.item_id) ?? new Set<string>();
    set.add(payment.month);
    paidByItem.set(payment.item_id, set);
  }

  const active = items.filter((item) => itemActiveIn(item, monthKey));

  const owedItems = active.filter(
    (item) => !paidByItem.get(item.id)?.has(monthKey)
  );
  const owed = owedItems.reduce((sum, item) => sum + item.monthly_amount, 0);
  const paid = active
    .filter((item) => paidByItem.get(item.id)?.has(monthKey))
    .reduce((sum, item) => sum + item.monthly_amount, 0);

  /**
   * Sort: single-month items first, then most months still owed, then shorter total schedule.
   * The last tiebreak is what puts a 6-month/1-left above a 12-month/1-left — it is closer to
   * being finished in proportion, so it deserves the higher slot.
   */
  function rank(item: PaylaterItem): [number, number, number] {
    const total = totalMonths(item);
    const paidCount = paidByItem.get(item.id)?.size ?? 0;
    return [total === 1 ? 0 : 1, -(total - paidCount), total];
  }

  const sorted = [...active].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    for (let i = 0; i < ra.length; i += 1) {
      if (ra[i] !== rb[i]) return ra[i] - rb[i];
    }
    return a.item.localeCompare(b.item);
  });

  // Group by provider, in provider sort order, with a trailing "Other".
  const groups = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    items: sorted.filter((item) => item.provider_id === provider.id),
  }));
  const orphans = sorted.filter(
    (item) =>
      item.provider_id == null ||
      !providers.some((p) => p.id === item.provider_id)
  );
  if (orphans.length > 0) {
    groups.push({ id: -1, name: "Other", items: orphans });
  }
  const populated = groups.filter((g) => g.items.length > 0);

  const defaultWalletId = wallets[0]?.id ?? null;

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
          My Installment
        </h1>
      </header>

      <MonthSwitcher monthKey={monthKey} />

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "Due", value: `${owedItems.length}`, money: false },
          { label: "Owed", value: formatRupiah(owed), money: true },
          { label: "Paid", value: formatRupiah(paid), money: true },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)]"
          >
            <div className="label">{card.label}</div>
            <div
              className={`mt-0.5 font-display text-[15px] font-bold text-ink-900 ${
                card.money ? "tabular-nums" : ""
              }`}
            >
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <details className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-xs)]">
        <summary className="px-4 py-3.5 text-[15px] font-semibold text-ink-900">
          Add an installment
        </summary>
        <form
          action={addPaylaterItem}
          className="space-y-2 border-t border-[var(--border-subtle)] p-4"
        >
          <input
            name="item"
            placeholder="What you bought"
            aria-label="Item name"
            required
            className="field"
          />
          <MoneyInput
            name="monthly_amount"
            placeholder="Monthly amount"
            ariaLabel="Monthly amount"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="label mb-1 block">First month</span>
              <input
                type="month"
                name="first_month_date"
                defaultValue={monthKey.slice(0, 7)}
                className="field"
              />
            </label>
            <label className="block">
              <span className="label mb-1 block">Last month</span>
              <input
                type="month"
                name="last_month_date"
                defaultValue={monthKey.slice(0, 7)}
                className="field"
              />
            </label>
          </div>
          <select name="provider_id" aria-label="Provider" className="field" defaultValue="">
            <option value="">No provider</option>
            {providers.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            name="note"
            placeholder="Note (optional)"
            aria-label="Note"
            className="field"
          />
          <SubmitButton className="btn btn-primary w-full">
            Add installment
          </SubmitButton>
        </form>
      </details>

      {populated.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          Nothing running in {formatMonth(monthKey)}.
        </p>
      ) : (
        populated.map((group) => {
          const unpaid = group.items.filter(
            (item) => !paidByItem.get(item.id)?.has(monthKey)
          );

          return (
            <section key={group.id}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="label">{group.name}</h2>
                <span className="text-[12px] font-semibold text-ink-500 tabular-nums">
                  {formatRupiah(
                    unpaid.reduce((sum, i) => sum + i.monthly_amount, 0)
                  )}{" "}
                  owed
                </span>
              </div>

              {unpaid.length > 1 && (
                <details className="mb-2 overflow-hidden rounded-[var(--radius-card)] bg-sage-100">
                  <summary className="px-4 py-3 text-[14px] font-semibold text-forest-800">
                    Pay all {unpaid.length} in {group.name}
                  </summary>
                  <form action={payPaylaterMonths} className="space-y-2 p-4 pt-0">
                    <input type="hidden" name="month" value={monthKey} />
                    <input
                      type="hidden"
                      name="item_ids"
                      value={unpaid.map((i) => i.id).join(",")}
                    />
                    <select
                      name="wallet_id"
                      defaultValue={defaultWalletId ?? ""}
                      aria-label="Pay from wallet"
                      className="field"
                    >
                      <option value="">Choose a wallet</option>
                      {wallets.map((w) => (
                        <option key={w.id} value={String(w.id)}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="date"
                      name="occurred_on"
                      defaultValue={todayISO()}
                      aria-label="Payment date"
                      className="field"
                    />
                    <SubmitButton className="btn btn-primary btn-sm w-full">
                      Book {unpaid.length} expenses
                    </SubmitButton>
                  </form>
                </details>
              )}

              <div className="space-y-2">
                {group.items.map((item) => (
                  <PaylaterItemCard
                    key={item.id}
                    item={item}
                    monthKey={monthKey}
                    paidMonths={paidByItem.get(item.id) ?? new Set()}
                    wallets={wallets}
                    providers={providers}
                    defaultWalletId={defaultWalletId}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}

import Link from "next/link";
import MonthSwitcher from "@/components/MonthSwitcher";
import SubmitButton from "@/components/SubmitButton";
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
import AddInstallmentSheet from "./AddInstallmentSheet";
import PaylaterItemCard from "./PaylaterItemCard";
import { payPaylaterMonths } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Installments · Atlas" };

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

  // A schedule that ended before the month being viewed vanishes with no trace — the
  // MonthSwitcher is the only clue it ever existed. Count them so the disappearance is at
  // least stated (atlas-ux-plan-manage-pages.md, Installments UX #9).
  const finishedEarlier = items.filter(
    (item) => item.last_month_date < monthKey
  ).length;

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
          Installments
        </h1>
      </header>

      <MonthSwitcher monthKey={monthKey} />

      {/*
        One forest hero carrying the one number that matters, mirroring Lending — these two pages
        are exact opposites (what you owe monthly, what you are owed monthly) and used to be the
        two that looked least alike. The old three equal white cards rendered a COUNT ("Due 3") in
        the same slot, weight and shape as two rupiah figures (atlas-ux-plan-manage-pages.md C5).
      */}
      <section className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div className="label" style={{ color: "var(--color-forest-300)" }}>
          Left to pay in {formatMonth(monthKey)}
        </div>
        <div className="mt-1 font-display text-[32px] font-extrabold tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(owed)}
        </div>
        <p className="mt-1 text-[13px]" style={{ color: "var(--color-forest-200)" }}>
          {active.length === 0 ? (
            "Nothing scheduled this month."
          ) : (
            <>
              {owedItems.length} of {active.length}{" "}
              {active.length === 1 ? "item" : "items"} still due
              {paid > 0 && (
                <span className="tabular-nums">
                  {" "}
                  · {formatRupiah(paid)} already paid
                </span>
              )}
            </>
          )}
        </p>
      </section>

      <AddInstallmentSheet
        providers={providers}
        defaultMonth={monthKey.slice(0, 7)}
      />

      {populated.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          <p>No installments running in {formatMonth(monthKey)}.</p>
          <p className="mt-1 text-[13px]">
            Add one and it&rsquo;ll show up here.
          </p>
          {finishedEarlier > 0 && (
            <p className="mt-1 text-[13px]">
              {finishedEarlier}{" "}
              {finishedEarlier === 1 ? "schedule" : "schedules"} finished before{" "}
              {formatMonth(monthKey)}.
            </p>
          )}
        </div>
      ) : (
        <>
          {/*
            `rank()` encodes a real opinion — closest to finishing floats up — and until now the
            user had no way to know the order meant anything (atlas-ux-plan-manage-pages.md,
            Installments UX #7).
          */}
          <p className="text-[13px] text-ink-300">
            Sorted by what&rsquo;s closest to finishing.
            {finishedEarlier > 0 && (
              <>
                {" "}
                {finishedEarlier}{" "}
                {finishedEarlier === 1 ? "schedule" : "schedules"} finished before{" "}
                {formatMonth(monthKey)}.
              </>
            )}
          </p>

          {populated.map((group) => {
          const unpaid = group.items.filter(
            (item) => !paidByItem.get(item.id)?.has(monthKey)
          );
          const paidCount = group.items.length - unpaid.length;

          return (
            <section key={group.id}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h2 className="label">{group.name}</h2>
                {/*
                  The header totals only what is UNPAID, but the list below shows every item in
                  the group — a header reading "Rp 0 left" over four cards needed the second half
                  of the sentence (atlas-ux-plan-manage-pages.md, Installments UX #8).
                */}
                <span className="text-[12px] font-semibold text-ink-500 tabular-nums">
                  {formatRupiah(
                    unpaid.reduce((sum, i) => sum + i.monthly_amount, 0)
                  )}{" "}
                  left
                  {paidCount > 0 && ` · ${paidCount} paid`}
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
                      Record {unpaid.length} payments
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
          })}
        </>
      )}
    </div>
  );
}

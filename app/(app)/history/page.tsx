import MonthSwitcher from "@/components/MonthSwitcher";
import {
  currentMonthKey,
  endOfMonth,
  getCategories,
  getWallets,
  listTransactions,
} from "@/lib/data";
import { getForexLinkedTxnIds } from "@/lib/forex";
import { TXN_TYPES } from "@/lib/types";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "History · Atlas" };

const TXN_TYPE_VALUES: Set<string> = new Set(TXN_TYPES.map((t) => t.value));

export default async function HistoryPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  // `type`/`category` make a filtered view linkable — e.g. the dashboard's per-category
  // drill-down (atlas-ux-review.md #3, prerequisite in #6) — instead of only living in
  // client-side sessionStorage.
  searchParams: Promise<{ m?: string; type?: string; category?: string }>;
}) {
  const { m, type, category } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();

  const initialType = TXN_TYPE_VALUES.has(type ?? "") ? (type as string) : "";
  const initialCategoryId = /^\d+$/.test(category ?? "") ? (category as string) : "";

  const [transactions, categories, wallets, forexTxnIds] = await Promise.all([
    listTransactions({
      from: monthKey,
      to: endOfMonth(monthKey),
      limit: 1000,
    }),
    // Archived included: an old row must still resolve its category and wallet names.
    getCategories(true),
    getWallets(true),
    getForexLinkedTxnIds(),
  ]);

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          History
        </h1>
      </header>

      <MonthSwitcher monthKey={monthKey} />

      <HistoryClient
        transactions={transactions}
        categories={categories}
        wallets={wallets}
        monthKey={monthKey}
        forexTxnIds={forexTxnIds}
        initialType={initialType}
        initialCategoryId={initialCategoryId}
      />
    </div>
  );
}

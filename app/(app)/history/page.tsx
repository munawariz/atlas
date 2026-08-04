import MonthSwitcher from "@/components/MonthSwitcher";
import {
  currentMonthKey,
  endOfMonth,
  getCategories,
  getWallets,
  listTransactions,
} from "@/lib/data";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "History · Atlas" };

export default async function HistoryPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise and must be awaited.
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const monthKey = /^\d{4}-\d{2}-\d{2}$/.test(m ?? "")
    ? (m as string)
    : currentMonthKey();

  const [transactions, categories, wallets] = await Promise.all([
    listTransactions({
      from: monthKey,
      to: endOfMonth(monthKey),
      limit: 1000,
    }),
    // Archived included: an old row must still resolve its category and wallet names.
    getCategories(true),
    getWallets(true),
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
      />
    </div>
  );
}

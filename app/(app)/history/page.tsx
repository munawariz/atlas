import { getCategories, getWallets, listTransactions } from "@/lib/data";
import { todayISO } from "@/lib/format";
import MonthSwitcher from "@/components/MonthSwitcher";
import RefreshOnFocus from "@/components/RefreshOnFocus";
import HistoryClient from "./HistoryClient";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const sp = await searchParams;
  const monthKey = sp.m ?? `${todayISO().slice(0, 7)}-01`;

  const [txns, cats, wallets] = await Promise.all([
    listTransactions({ monthKey, limit: 1000 }),
    getCategories(true),
    getWallets(true),
  ]);

  return (
    <div className="space-y-4 pt-4">
      <RefreshOnFocus />
      <header className="mb-1">
        <p className="label">Ledger</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">History</h1>
      </header>

      <MonthSwitcher monthKey={monthKey} basePath="/history" />

      <HistoryClient
        transactions={txns}
        categories={cats.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
      />
    </div>
  );
}

import Link from "next/link";
import { deriveWalletBalances, getOpeningBalances, getWallets } from "@/lib/data";
import { todayISO } from "@/lib/format";
import BalancesForm from "./BalancesForm";

export const dynamic = "force-dynamic";

export default async function BalancesPage() {
  const monthKey = `${todayISO().slice(0, 7)}-01`;
  const [wallets, opening, current] = await Promise.all([
    getWallets(),
    getOpeningBalances(),
    deriveWalletBalances(monthKey),
  ]);

  const currentNetworth = wallets.reduce((a, w) => a + (current.get(w.id) ?? 0), 0);

  return (
    <div className="pt-4">
      <div className="mb-5 flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">
          ‹ More
        </Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Starting balances</h1>
        <span className="w-12" />
      </div>
      <BalancesForm
        currentNetworth={currentNetworth}
        wallets={wallets.map((w) => ({
          id: w.id,
          name: w.name,
          opening: opening.get(w.id) ?? 0,
          current: current.get(w.id) ?? 0,
        }))}
      />
    </div>
  );
}

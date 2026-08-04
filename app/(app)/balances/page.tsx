import {
  currentMonthKey,
  deriveWalletBalances,
  getOpeningBalances,
  getOpeningMonth,
  getWallets,
  sumBalances,
} from "@/lib/data";
import { formatMonth, formatRupiah } from "@/lib/format";
import BalancesForm from "./BalancesForm";

export const dynamic = "force-dynamic";

export const metadata = { title: "Starting balances · Atlas" };

export default async function BalancesPage() {
  const [wallets, openingMonth, openingRows] = await Promise.all([
    getWallets(),
    getOpeningMonth(),
    getOpeningBalances(),
  ]);
  const balances = await deriveWalletBalances(currentMonthKey());

  const opening: Record<number, number> = {};
  for (const row of openingRows) opening[row.wallet_id] = row.balance;

  const current: Record<number, number> = {};
  for (const wallet of wallets) current[wallet.id] = balances.get(wallet.id) ?? 0;

  return (
    <div className="space-y-5 privacy-scope">
      <header>
        <h1 className="font-display text-[28px] font-extrabold tracking-[-0.03em] text-ink-900">
          Starting balances
        </h1>
        <p className="mt-1 text-[14px] text-ink-500">
          What each wallet held at {formatMonth(openingMonth)}, before any
          transaction in this ledger. Everything since is derived from it.
        </p>
      </header>

      <div className="rounded-[var(--radius-card)] bg-forest-800 p-5 on-forest">
        <div
          className="label"
          style={{ color: "var(--color-forest-300)" }}
        >
          Net worth now
        </div>
        <div className="mt-1 font-display text-[34px] font-extrabold tracking-[-0.03em] text-white tabular-nums">
          {formatRupiah(sumBalances(balances))}
        </div>
      </div>

      {wallets.length === 0 ? (
        <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
          No wallets yet. Add one under More → Wallets.
        </p>
      ) : (
        <BalancesForm wallets={wallets} opening={opening} current={current} />
      )}
    </div>
  );
}

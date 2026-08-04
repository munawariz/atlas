import Link from "next/link";
import { getWallets } from "@/lib/data";
import { ChevronLeft } from "@/components/icons";
import ManageRow from "../ManageRow";
import {
  addWallet,
  deleteWallet,
  moveWallet,
  renameWallet,
  toggleWalletArchived,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata = { title: "Wallets · Atlas" };

export default async function WalletsPage() {
  const wallets = await getWallets(true);
  const active = wallets.filter((w) => !w.archived);

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-1">
        <Link
          href="/more"
          aria-label="Back to more"
          className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
        >
          <ChevronLeft size={20} />
        </Link>
        <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
          Wallets
        </h1>
      </header>

      <p className="text-[14px] text-ink-500">
        Wallets hold real cash. Their total is your net worth — savings and
        investment buckets sit outside it.
      </p>

      <form action={addWallet} className="flex gap-2">
        <input
          name="name"
          placeholder="New wallet name"
          aria-label="New wallet name"
          required
          className="field flex-1"
        />
        <button type="submit" className="btn btn-primary shrink-0 px-5">
          Add
        </button>
      </form>

      <div className="space-y-2">
        {wallets.map((wallet) => {
          const activeIndex = active.findIndex((w) => w.id === wallet.id);
          return (
            <ManageRow
              key={wallet.id}
              name={wallet.name}
              archived={wallet.archived}
              onRename={renameWallet.bind(null, wallet.id)}
              onToggleArchive={toggleWalletArchived.bind(
                null,
                wallet.id,
                !wallet.archived
              )}
              onDelete={deleteWallet.bind(null, wallet.id)}
              onMoveUp={
                activeIndex > 0 ? moveWallet.bind(null, wallet.id, -1) : undefined
              }
              onMoveDown={
                activeIndex >= 0 && activeIndex < active.length - 1
                  ? moveWallet.bind(null, wallet.id, 1)
                  : undefined
              }
            />
          );
        })}

        {wallets.length === 0 && (
          <p className="rounded-[var(--radius-card)] bg-white px-5 py-8 text-center text-[14px] text-ink-500 shadow-[var(--shadow-xs)]">
            No wallets yet. Add your first one above.
          </p>
        )}
      </div>
    </div>
  );
}

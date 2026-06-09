import Link from "next/link";
import { getWallets } from "@/lib/data";
import SubmitButton from "@/components/SubmitButton";
import ManageRow from "../ManageRow";
import { addWallet, moveWallet, renameWallet, toggleWalletArchived } from "../actions";

export const dynamic = "force-dynamic";

export default async function WalletsPage() {
  const wallets = await getWallets(true);
  return (
    <div className="space-y-4 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Wallets</h1>
        <span className="w-12" />
      </div>

      <form action={addWallet} className="flex gap-2">
        <input name="name" placeholder="New wallet name" className="field flex-1" />
        <SubmitButton pendingText="…" className="rounded-2xl bg-gold px-5 font-semibold text-ink">
          Add
        </SubmitButton>
      </form>

      <div className="card overflow-hidden">
        {wallets.map((w, i) => (
          <div key={w.id} className={i > 0 ? "hr-dash border-t" : ""}>
            <ManageRow
              id={w.id}
              name={w.name}
              archived={w.archived}
              isFirst={i === 0}
              isLast={i === wallets.length - 1}
              rename={renameWallet}
              move={moveWallet}
              toggleArchive={toggleWalletArchived}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

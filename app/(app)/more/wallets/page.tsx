import Link from "next/link";
import { getWallets } from "@/lib/data";
import SubmitButton from "@/components/SubmitButton";
import { addWallet, toggleWalletArchived } from "../actions";

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
          <div key={w.id} className={`flex items-center justify-between px-4 py-3 ${i > 0 ? "hr-dash border-t" : ""}`}>
            <span className={`text-sm ${w.archived ? "text-paper-faint line-through" : "text-paper"}`}>{w.name}</span>
            <form action={toggleWalletArchived.bind(null, w.id)}>
              <SubmitButton className="text-xs text-paper-dim active:text-paper">
                {w.archived ? "Restore" : "Archive"}
              </SubmitButton>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}

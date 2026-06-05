"use client";

import { useActionState } from "react";
import type { Category, Transaction, Wallet } from "@/lib/types";
import TxnFields from "@/components/TxnFields";
import { deleteTransaction, updateTransaction, type EditState } from "../actions";

export default function EditForm({
  txn,
  wallets,
  categories,
}: {
  txn: Transaction;
  wallets: Wallet[];
  categories: Category[];
}) {
  const update = updateTransaction.bind(null, txn.id);
  const del = deleteTransaction.bind(null, txn.id);
  const [state, formAction, pending] = useActionState<EditState, FormData>(update, {});

  return (
    <div>
      <form action={formAction}>
        <TxnFields
          wallets={wallets}
          categories={categories}
          initialToday={txn.occurred_on.slice(0, 10)}
          initial={{
            type: txn.type,
            amount: txn.amount,
            date: txn.occurred_on.slice(0, 10),
            description: txn.description ?? "",
            categoryId: txn.category_id,
            sourceWalletId: txn.source_wallet_id,
            destWalletId: txn.dest_wallet_id,
          }}
        />

        {state.error && <p className="mt-4 text-sm text-clay">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-2xl bg-gold py-4 text-lg font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(63,185,80,0.6)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form
        action={del}
        onSubmit={(e) => {
          if (!confirm("Delete this transaction?")) e.preventDefault();
        }}
        className="mt-3"
      >
        <button type="submit" className="w-full rounded-2xl border border-clay/40 py-3 text-clay transition-colors active:bg-clay/10">
          Delete
        </button>
      </form>
    </div>
  );
}

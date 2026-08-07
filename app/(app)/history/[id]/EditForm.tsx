"use client";

import TxnFields from "@/components/TxnFields";
import SubmitButton from "@/components/SubmitButton";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { deleteTransaction, updateTransaction } from "../actions";
import type { Category, Transaction, Wallet } from "@/lib/types";

export default function EditForm({
  transaction,
  wallets,
  categories,
  monthKey,
}: {
  transaction: Transaction;
  wallets: Wallet[];
  categories: Category[];
  monthKey: string;
}) {
  // `.bind(null, id)` is the convention for row-bound actions — it keeps the id off the form,
  // where a client could edit it.
  const save = updateTransaction.bind(null, transaction.id);
  const remove = deleteTransaction.bind(null, transaction.id);

  return (
    <div className="space-y-5">
      <form action={save} className="space-y-5">
        <TxnFields
          wallets={wallets}
          categories={categories}
          initial={transaction}
        />
        <SubmitButton pendingChildren="Saving…">Save changes</SubmitButton>
      </form>

      <ConfirmDeleteButton
        action={(formData) => {
          formData.set("month", monthKey);
          return remove(formData);
        }}
        message="Delete this transaction permanently? This can't be undone."
        variant="block"
      />
    </div>
  );
}

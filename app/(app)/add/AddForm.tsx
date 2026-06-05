"use client";

import { useActionState, useEffect, useState } from "react";
import type { Category, Wallet } from "@/lib/types";
import TxnFields from "@/components/TxnFields";
import { createTransaction, type AddState } from "./actions";

export default function AddForm({
  wallets,
  categories,
  initialToday,
}: {
  wallets: Wallet[];
  categories: Category[];
  initialToday: string;
}) {
  const [state, formAction, pending] = useActionState<AddState, FormData>(createTransaction, {});
  const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.nonce) {
      setFormKey((k) => k + 1);
      setToast(state.savedLabel ?? "Saved");
      const t = setTimeout(() => setToast(null), 1600);
      return () => clearTimeout(t);
    }
  }, [state.nonce, state.ok, state.savedLabel]);

  return (
    <div className="pt-4">
      <header className="mb-5">
        <p className="label">New entry</p>
        <h1 className="font-display text-3xl font-medium tracking-tight text-paper">Add to ledger</h1>
      </header>

      <form action={formAction}>
        <TxnFields key={formKey} wallets={wallets} categories={categories} initialToday={initialToday} persist />

        {state.error && <p className="mt-4 text-sm text-clay">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-2xl bg-gold py-4 text-lg font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(63,185,80,0.6)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save entry"}
        </button>
      </form>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center px-6">
          <div className="pop flex items-center gap-2 rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-[0_12px_30px_-10px_rgba(63,185,80,0.7)]">
            <span className="text-base">✦</span> {toast}
          </div>
        </div>
      )}
    </div>
  );
}

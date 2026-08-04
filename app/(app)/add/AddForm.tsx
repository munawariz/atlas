"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import TxnFields from "@/components/TxnFields";
import SubmitButton from "@/components/SubmitButton";
import { addTransaction, type AddState } from "./actions";
import type { Category, Wallet } from "@/lib/types";

const INITIAL: AddState = {};

export default function AddForm({
  wallets,
  categories,
}: {
  wallets: Wallet[];
  categories: Category[];
}) {
  const [state, formAction] = useActionState(addTransaction, INITIAL);

  // Remounting TxnFields via an incrementing key is what clears it. Resetting the <form>
  // would not help — every field inside TxnFields is controlled React state.
  const [formKey, setFormKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const lastNonce = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    setFormKey((k) => k + 1);
    setToast(state.savedLabel ?? "Saved");
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [state]);

  return (
    <>
      <form action={formAction} className="space-y-5">
        <TxnFields
          key={formKey}
          wallets={wallets}
          categories={categories}
          persist
        />

        {state.error && (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
          >
            {state.error}
          </p>
        )}

        <SubmitButton pendingChildren="Saving…">Save</SubmitButton>
      </form>

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{
              animation: "pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both",
              boxShadow: "var(--shadow-float)",
            }}
          >
            {toast}
          </span>
        </div>
      )}
    </>
  );
}

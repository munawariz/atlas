"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SubmitButton from "@/components/SubmitButton";
import TxnFields from "@/components/TxnFields";
import { Trash, X } from "@/components/icons";
import {
  deleteTransactionSheet,
  updateTransactionSheet,
  type EditSheetState,
} from "@/app/(app)/history/actions";
import type { Category, Transaction, Wallet } from "@/lib/types";

/**
 * Edit an existing row in a bottom sheet over History — the counterpart of AddSheet.
 *
 * Unlike Add there is no staged reveal: the row already answered every question, so the
 * full editor shows at once, pre-filled. Forex-linked rows never open this sheet; History
 * sends them to the conversion editor page instead.
 */

const INITIAL: EditSheetState = {};

export default function EditSheet({
  transaction,
  wallets,
  categories,
  onClose,
}: {
  /** The row being edited, or null when the sheet is closed. */
  transaction: Transaction | null;
  wallets: Wallet[];
  categories: Category[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const open = transaction !== null;

  // The sheet owns the screen while open: lock the page scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function handleDone(label: string) {
    setToast(label);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1600);
    // No navigation happens, so the page underneath must be told its numbers moved.
    router.refresh();
    onClose();
  }

  return (
    <>
      {transaction && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Edit transaction"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <div
            className="absolute inset-x-0 bottom-0 mx-auto flex min-h-[50dvh] max-h-[80dvh] max-w-md flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            <div className="flex items-center justify-between px-5 pb-2 pt-4">
              <h2 className="font-display text-[18px] font-bold text-ink-900">
                Edit transaction
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-2 p-2 text-ink-500"
              >
                <X size={20} />
              </button>
            </div>

            {/* Keyed by row id so a different row always mounts a fresh editor. */}
            <SheetBody
              key={transaction.id}
              transaction={transaction}
              wallets={wallets}
              categories={categories}
              onDone={handleDone}
            />
          </div>
        </div>
      )}

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

function SheetBody({
  transaction,
  wallets,
  categories,
  onDone,
}: {
  transaction: Transaction;
  wallets: Wallet[];
  categories: Category[];
  onDone: (label: string) => void;
}) {
  const [saveState, saveAction] = useActionState(
    updateTransactionSheet.bind(null, transaction.id),
    INITIAL
  );
  const [deleteState, deleteAction] = useActionState(
    deleteTransactionSheet.bind(null, transaction.id),
    INITIAL
  );

  const lastNonce = useRef<number | undefined>(undefined);

  useEffect(() => {
    const done = [saveState, deleteState].find(
      (s) => s.ok && s.nonce && s.nonce !== lastNonce.current
    );
    if (!done) return;
    lastNonce.current = done.nonce;
    onDone(done.savedLabel ?? "Saved");
  }, [saveState, deleteState, onDone]);

  const error = saveState.error ?? deleteState.error;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
      <form action={saveAction} className="space-y-5">
        <TxnFields
          wallets={wallets}
          categories={categories}
          initial={transaction}
        />

        {error && (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
          >
            {error}
          </p>
        )}

        <SubmitButton pendingChildren="Saving…">Save changes</SubmitButton>
      </form>

      <form action={deleteAction} className="mt-3">
        <SubmitButton
          className="btn btn-ghost w-full text-negative-600"
          pendingChildren="Deleting…"
        >
          <Trash size={18} />
          Delete
        </SubmitButton>
      </form>
    </div>
  );
}

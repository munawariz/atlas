"use client";

import { useState, useTransition } from "react";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import { payPaylaterMonth, unpayPaylaterMonth } from "../actions";

export default function PaylaterToggle({
  itemId,
  item,
  month,
  amount,
  paid,
  wallets,
}: {
  itemId: number;
  item: string;
  month: string;
  amount: number;
  paid: boolean;
  wallets: { id: number; name: string }[];
}) {
  const [modal, setModal] = useState(false);
  const [walletId, setWalletId] = useState<number | null>(wallets[0]?.id ?? null);
  const [pending, startTransition] = useTransition();

  const open = () => {
    if (!paid) {
      try {
        const last = Number(localStorage.getItem("ft_pay_wallet"));
        setWalletId(last && wallets.some((w) => w.id === last) ? last : wallets[0]?.id ?? null);
      } catch {
        setWalletId(wallets[0]?.id ?? null);
      }
    }
    setModal(true);
  };

  const confirm = () => {
    startTransition(async () => {
      if (!paid) {
        if (!walletId) return;
        try {
          localStorage.setItem("ft_pay_wallet", String(walletId));
        } catch {}
        await payPaylaterMonth(itemId, month, walletId, todayISO());
      } else {
        await unpayPaylaterMonth(itemId, month);
      }
      setModal(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
          paid ? "border-green/30 bg-green/15 text-green" : "border-amber/30 bg-amber/15 text-amber"
        }`}
      >
        {paid ? "Paid ✓" : "Owed"}
      </button>

      {modal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => !pending && setModal(false)}
        >
          <div className="card pop w-full max-w-xs bg-ink-2 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {!paid ? (
              <>
                <h3 className="font-display text-lg font-medium text-paper">Pay installment</h3>
                <p className="mt-1 text-sm text-paper-dim">{item} · {formatMonth(month)}</p>
                <p className="mt-2 font-display text-2xl font-bold text-red">− {formatRupiah(amount)}</p>
                <p className="label mt-4 mb-2">Withdraw from</p>
                {wallets.length === 0 ? (
                  <p className="text-xs text-amber">Add a wallet first.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {wallets.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => setWalletId(w.id)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                          walletId === w.id ? "bg-green text-ink" : "border border-line/60 bg-ink-3 text-paper-dim"
                        }`}
                      >
                        {w.name}
                      </button>
                    ))}
                  </div>
                )}
                <p className="mt-3 text-[11px] text-paper-faint">Adds a Cicilan Paylater expense from that wallet.</p>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-medium text-paper">Undo payment?</h3>
                <p className="mt-1 text-sm text-paper-dim">{item} · {formatMonth(month)}</p>
                <p className="mt-3 text-sm text-paper">
                  Marks it <span className="font-semibold text-amber">owed</span> again and deletes the{" "}
                  <span className="font-semibold">{formatRupiah(amount)}</span> expense.
                </p>
              </>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setModal(false)}
                className="flex-1 rounded-xl border border-line/70 py-2.5 text-sm font-medium text-paper-dim disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || (!paid && !walletId)}
                onClick={confirm}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-ink disabled:opacity-60 ${
                  !paid ? "bg-green" : "bg-amber"
                }`}
              >
                {pending ? "Saving…" : !paid ? "Pay" : "Undo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

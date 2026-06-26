"use client";

import { useState, useTransition } from "react";
import { formatMonth, formatRupiah, todayISO } from "@/lib/format";
import { payPaylaterMonths } from "../actions";

// "Pay all" for one provider group: books an expense for every still-owed installment in
// the group from a single chosen wallet, mirroring the single-item pay flow.
export default function PaylaterPayGroup({
  groupName,
  items,
  month,
  wallets,
}: {
  groupName: string;
  items: { id: number; item: string; amount: number }[];
  month: string;
  wallets: { id: number; name: string }[];
}) {
  const [modal, setModal] = useState(false);
  const [walletId, setWalletId] = useState<number | null>(wallets[0]?.id ?? null);
  const [skipTxn, setSkipTxn] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = items.reduce((a, it) => a + it.amount, 0);

  const open = () => {
    setSkipTxn(false);
    try {
      const last = Number(localStorage.getItem("ft_pay_wallet"));
      setWalletId(last && wallets.some((w) => w.id === last) ? last : wallets[0]?.id ?? null);
    } catch {
      setWalletId(wallets[0]?.id ?? null);
    }
    setModal(true);
  };

  const confirm = () => {
    startTransition(async () => {
      if (!skipTxn && !walletId) return;
      if (!skipTxn) {
        try {
          localStorage.setItem("ft_pay_wallet", String(walletId));
        } catch {}
      }
      await payPaylaterMonths(items.map((it) => it.id), month, walletId ?? 0, todayISO(), skipTxn);
      setModal(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="rounded-full border border-green/30 bg-green/15 px-3 py-1 text-xs font-semibold text-green transition-colors active:bg-green/25"
      >
        Pay all ({items.length})
      </button>

      {modal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => !pending && setModal(false)}
        >
          <div className="card pop w-full max-w-xs bg-ink-2 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-medium text-paper">Pay all · {groupName}</h3>
            <p className="mt-1 text-sm text-paper-dim">
              {items.length} owed installment{items.length > 1 ? "s" : ""} · {formatMonth(month)}
            </p>
            <p className="mt-2 font-display text-2xl font-bold text-red">− {formatRupiah(total)}</p>

            <div className="mt-3 max-h-28 space-y-1 overflow-y-auto rounded-xl bg-ink-3/60 p-2.5">
              {items.map((it) => (
                <div key={it.id} className="flex items-baseline justify-between gap-2 text-[11px]">
                  <span className="min-w-0 flex-1 truncate text-paper-dim">{it.item}</span>
                  <span className="shrink-0 tabular-nums text-paper-faint">{formatRupiah(it.amount)}</span>
                </div>
              ))}
            </div>

            <div className={skipTxn ? "pointer-events-none opacity-40" : ""}>
              <p className="label mb-2 mt-4">Withdraw from</p>
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
            </div>
            <label className="mt-3 flex items-center gap-2 text-xs text-paper-dim">
              <input
                type="checkbox"
                checked={skipTxn}
                onChange={(e) => setSkipTxn(e.target.checked)}
                className="h-4 w-4 accent-green"
              />
              Already paid elsewhere — don&apos;t create transactions
            </label>
            <p className="mt-2 text-[11px] text-paper-faint">
              {skipTxn
                ? "Marks every month paid only — no expenses are created."
                : `Adds ${items.length} expense${items.length > 1 ? "s" : ""} from that wallet (each under its own category).`}
            </p>

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
                disabled={pending || (!skipTxn && !walletId)}
                onClick={confirm}
                className="flex-1 rounded-xl bg-green py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {pending ? "Saving…" : "Pay all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

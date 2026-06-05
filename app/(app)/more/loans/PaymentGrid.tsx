"use client";

import { useState, useTransition } from "react";
import { formatMonth, formatMonthShort, formatRupiah, todayISO } from "@/lib/format";
import {
  collectLoanPayment,
  scheduleMonth,
  uncollectLoanPayment,
  unscheduleMonth,
} from "../actions";

export type Cell = { month: string; state: "paid" | "unpaid" };

export default function PaymentGrid({
  loanId,
  person,
  installment,
  wallets,
  schedule,
}: {
  loanId: number;
  person: string;
  installment: number;
  wallets: { id: number; name: string }[];
  schedule: Cell[]; // sorted ascending by month
}) {
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState<{ type: "collect" | "uncollect"; month: string } | null>(null);
  const [walletId, setWalletId] = useState<number | null>(wallets[0]?.id ?? null);
  const [newMonth, setNewMonth] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); });

  const onCell = (month: string, state: "paid" | "unpaid") => {
    if (editing) {
      if (state === "unpaid") run(() => unscheduleMonth(loanId, month)); // collected months are locked
      return;
    }
    if (state === "unpaid") {
      try {
        const last = Number(localStorage.getItem("ft_collect_wallet"));
        setWalletId(last && wallets.some((w) => w.id === last) ? last : wallets[0]?.id ?? null);
      } catch {
        setWalletId(wallets[0]?.id ?? null);
      }
      setModal({ type: "collect", month });
    } else {
      setModal({ type: "uncollect", month });
    }
  };

  const addMonth = () => {
    if (!/^\d{4}-\d{2}$/.test(newMonth)) return;
    const m = `${newMonth}-01`;
    setNewMonth("");
    run(() => scheduleMonth(loanId, m));
  };

  const confirm = () => {
    if (!modal) return;
    const month = modal.month;
    startTransition(async () => {
      if (modal.type === "collect") {
        if (!walletId) return;
        try {
          localStorage.setItem("ft_collect_wallet", String(walletId));
        } catch {}
        await collectLoanPayment(loanId, month, walletId, todayISO());
      } else {
        await uncollectLoanPayment(loanId, month);
      }
      setModal(null);
    });
  };

  return (
    <>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-3 text-[10px] text-paper-faint">
          {editing ? (
            <span>tap an owed month to remove it</span>
          ) : (
            <>
              <span className="text-amber">◼ owed</span>
              <span className="text-green">◼ collected</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="font-display text-[10px] uppercase tracking-wider text-paper-dim active:text-paper"
        >
          {editing ? "Done" : "Edit months"}
        </button>
      </div>

      {schedule.length === 0 && !editing ? (
        <p className="mt-2 text-xs text-paper-faint">No promised months — tap “Edit months” to add.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {schedule.map((c) => {
            const locked = editing && c.state === "paid";
            return (
              <button
                key={c.month}
                type="button"
                disabled={locked}
                onClick={() => onCell(c.month, c.state)}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide ${
                  c.state === "paid" ? "bg-green text-ink" : "bg-amber text-ink"
                } ${locked ? "opacity-50" : "active:scale-95"}`}
              >
                {formatMonthShort(c.month)}
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <div className="mt-2 flex gap-2">
          <input
            type="month"
            value={newMonth}
            onChange={(e) => setNewMonth(e.target.value)}
            className="field flex-1 py-2 text-sm [color-scheme:dark]"
          />
          <button
            type="button"
            onClick={addMonth}
            disabled={pending || !newMonth}
            className="rounded-xl bg-green px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => !pending && setModal(null)}
        >
          <div className="card pop w-full max-w-xs bg-ink-2 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {modal.type === "collect" ? (
              <>
                <h3 className="font-display text-lg font-medium text-paper">Collect payment</h3>
                <p className="mt-1 text-sm text-paper-dim">{person} · {formatMonth(modal.month)}</p>
                <p className="mt-2 font-display text-2xl font-bold text-green">+ {formatRupiah(installment)}</p>
                <p className="label mt-4 mb-2">Where did it go?</p>
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
                <p className="mt-3 text-[11px] text-paper-faint">Adds a Hutang income record to that wallet.</p>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-medium text-paper">Undo collection?</h3>
                <p className="mt-1 text-sm text-paper-dim">{person} · {formatMonth(modal.month)}</p>
                <p className="mt-3 text-sm text-paper">
                  Marks it <span className="font-semibold text-amber">owed</span> again and deletes the{" "}
                  <span className="font-semibold">{formatRupiah(installment)}</span> income record.
                </p>
              </>
            )}

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setModal(null)}
                className="flex-1 rounded-xl border border-line/70 py-2.5 text-sm font-medium text-paper-dim disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || (modal.type === "collect" && !walletId)}
                onClick={confirm}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold text-ink disabled:opacity-60 ${
                  modal.type === "collect" ? "bg-green" : "bg-amber"
                }`}
              >
                {pending ? "Saving…" : modal.type === "collect" ? "Collect" : "Undo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

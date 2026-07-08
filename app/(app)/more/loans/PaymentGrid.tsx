"use client";

import { useState, useTransition } from "react";
import { formatMonth, formatMonthShort, formatNumber, formatRupiah, todayISO } from "@/lib/format";
import {
  collectLoanPayment,
  scheduleMonth,
  uncollectLoanPayment,
  unscheduleMonth,
} from "../actions";
import { CheckIcon, PencilIcon } from "@/components/icons";

export type Cell = {
  month: string;
  state: "paid" | "unpaid";
  hasIncome?: boolean;
  collected?: number | null; // amount received for a paid month
  partial?: boolean; // paid but less than the full installment
};

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
  const [skipTxn, setSkipTxn] = useState(false);
  const [amount, setAmount] = useState(""); // raw digits collected for the month
  const [newMonth, setNewMonth] = useState("");
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) => startTransition(async () => { await fn(); });

  const onCell = (month: string, state: "paid" | "unpaid") => {
    if (editing) {
      if (state === "unpaid") run(() => unscheduleMonth(loanId, month)); // collected months are locked
      return;
    }
    if (state === "unpaid") {
      setSkipTxn(false);
      setAmount(String(installment)); // default to the full installment; edit for a partial
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
        if (!skipTxn && !walletId) return;
        if (!skipTxn) {
          try {
            localStorage.setItem("ft_collect_wallet", String(walletId));
          } catch {}
        }
        const amt = parseInt(amount || "0", 10);
        await collectLoanPayment(loanId, month, walletId ?? 0, todayISO(), skipTxn, amt > 0 ? amt : installment);
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
              <span className="text-green">◪ partial</span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-label={editing ? "Done editing months" : "Edit months"}
          title={editing ? "Done" : "Edit months"}
          className={`grid h-8 w-8 place-items-center rounded-lg active:bg-ink-3 ${
            editing ? "text-green" : "text-paper-dim active:text-paper"
          }`}
        >
          {editing ? <CheckIcon className="h-[18px] w-[18px]" /> : <PencilIcon className="h-[18px] w-[18px]" />}
        </button>
      </div>

      {schedule.length === 0 && !editing ? (
        <p className="mt-2 text-xs text-paper-faint">No promised months — tap the pencil to add.</p>
      ) : (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {schedule.map((c) => {
            const locked = editing && c.state === "paid";
            const tone =
              c.state === "paid"
                ? c.partial
                  ? "bg-green/55 text-ink ring-1 ring-inset ring-amber"
                  : "bg-green text-ink"
                : "bg-amber text-ink";
            return (
              <button
                key={c.month}
                type="button"
                disabled={locked}
                onClick={() => onCell(c.month, c.state)}
                title={c.state === "paid" && c.collected != null ? `Collected ${formatRupiah(c.collected)}` : undefined}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold tracking-wide ${tone} ${locked ? "opacity-50" : "active:scale-95"}`}
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
                <p className="label mb-1.5 mt-4">Amount received</p>
                <div className="flex items-center gap-2 rounded-xl border border-line/70 bg-ink-3 px-3 py-2.5">
                  <span className="text-sm text-paper-faint">Rp</span>
                  <input
                    inputMode="numeric"
                    value={amount ? formatNumber(parseInt(amount, 10)) : ""}
                    onChange={(e) => setAmount(e.target.value.replace(/\D/g, ""))}
                    placeholder={formatNumber(installment)}
                    className="w-full flex-1 bg-transparent font-display text-xl font-bold tabular-nums text-green outline-none placeholder:text-paper-faint"
                  />
                </div>
                {amount !== "" && parseInt(amount, 10) !== installment && (
                  <p className="mt-1.5 text-[11px] text-amber">
                    {parseInt(amount, 10) < installment ? "Partial payment" : "Over the installment"} · full is {formatRupiah(installment)}
                  </p>
                )}
                <div className={skipTxn ? "pointer-events-none opacity-40" : ""}>
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
                </div>
                <label className="mt-3 flex items-center gap-2 text-xs text-paper-dim">
                  <input
                    type="checkbox"
                    checked={skipTxn}
                    onChange={(e) => setSkipTxn(e.target.checked)}
                    className="h-4 w-4 accent-green"
                  />
                  Already received elsewhere — don&apos;t create a transaction
                </label>
                <p className="mt-2 text-[11px] text-paper-faint">
                  {skipTxn
                    ? "Marks it collected only — no income record is created."
                    : "Adds a Hutang income record to that wallet."}
                </p>
              </>
            ) : (
              <>
                <h3 className="font-display text-lg font-medium text-paper">Undo collection?</h3>
                <p className="mt-1 text-sm text-paper-dim">{person} · {formatMonth(modal.month)}</p>
                <p className="mt-3 text-sm text-paper">
                  {schedule.find((c) => c.month === modal.month)?.hasIncome === false ? (
                    <>
                      Marks it <span className="font-semibold text-amber">owed</span> again. No income record was created
                      for this month, so nothing else is removed.
                    </>
                  ) : (
                    <>
                      Marks it <span className="font-semibold text-amber">owed</span> again and deletes the{" "}
                      <span className="font-semibold">
                        {formatRupiah(schedule.find((c) => c.month === modal.month)?.collected ?? installment)}
                      </span>{" "}
                      income record.
                    </>
                  )}
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
                disabled={pending || (modal.type === "collect" && !skipTxn && !walletId)}
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

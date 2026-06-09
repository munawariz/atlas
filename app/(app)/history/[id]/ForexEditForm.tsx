"use client";

import { useActionState, useState } from "react";
import type { ForexAccount, ForexTransaction, Transaction, Wallet } from "@/lib/types";
import { formatNumber } from "@/lib/format";
import SubmitButton from "@/components/SubmitButton";
import { TrashIcon } from "@/components/icons";
import { updateForexTransaction, deleteForexTransaction } from "../../more/actions";

// Forex buy/sell entries are a ledger transaction + a forex log row + a holding balance,
// so they can't be edited with the generic TxnFields (the currency isn't a category).
// This form edits all of it and the bound actions keep the three parts in sync.
export default function ForexEditForm({
  txn,
  forexTxn,
  accounts,
  wallets,
}: {
  txn: Transaction;
  forexTxn: ForexTransaction;
  accounts: ForexAccount[];
  wallets: Wallet[];
}) {
  const update = updateForexTransaction.bind(null, forexTxn.id, txn.id);
  const del = deleteForexTransaction.bind(null, forexTxn.id, txn.id);
  const [state, formAction, pending] = useActionState(update, {} as { error?: string });

  const [accountId, setAccountId] = useState(forexTxn.account_id);
  const [direction, setDirection] = useState<"buy" | "sell">(forexTxn.direction);
  const [idr, setIdr] = useState(forexTxn.idr ? String(forexTxn.idr) : "");
  const [unitsStr, setUnitsStr] = useState(forexTxn.units ? String(forexTxn.units) : "");
  const [walletId, setWalletId] = useState<number>(forexTxn.wallet_id ?? wallets[0]?.id ?? 0);
  const [date, setDate] = useState(txn.occurred_on.slice(0, 10));

  const currency = accounts.find((a) => a.id === accountId)?.currency ?? "";
  const idrNum = parseInt(idr || "0", 10);
  const unitsNum = parseFloat(unitsStr || "0") || 0;
  const rate = unitsNum > 0 ? idrNum / unitsNum : 0;

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <div>
          <div className="label mb-2.5">Currency</div>
          <select
            name="account_id"
            value={accountId}
            onChange={(e) => setAccountId(parseInt(e.target.value, 10))}
            className="field"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id} className="bg-ink-2">
                {a.name} · {a.currency}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="label mb-2.5">Direction</div>
          <select
            name="direction"
            value={direction}
            onChange={(e) => setDirection(e.target.value === "sell" ? "sell" : "buy")}
            className="field"
          >
            <option value="buy" className="bg-ink-2">Buy · IDR → {currency}</option>
            <option value="sell" className="bg-ink-2">Sell · {currency} → IDR</option>
          </select>
        </div>

        <div>
          <div className="label mb-2.5">{direction === "buy" ? "Paid from" : "Received in"}</div>
          <select
            name="wallet_id"
            value={walletId}
            onChange={(e) => setWalletId(parseInt(e.target.value, 10))}
            className="field"
          >
            {wallets.map((w) => (
              <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <label className="flex-1 text-xs text-paper-dim">
            IDR amount
            <input
              name="idr"
              inputMode="numeric"
              value={idr ? formatNumber(idrNum) : ""}
              onChange={(e) => setIdr(e.target.value.replace(/\D/g, ""))}
              placeholder="Rp"
              className="field mt-1"
            />
          </label>
          <label className="flex-1 text-xs text-paper-dim">
            {currency || "Foreign"} amount
            <input
              name="units"
              inputMode="decimal"
              value={unitsStr}
              onChange={(e) => setUnitsStr(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder={currency}
              className="field mt-1"
            />
          </label>
        </div>

        <p className="text-[11px] text-paper-faint">
          {rate > 0 ? (
            <>
              Your rate:{" "}
              <span className="text-paper">
                Rp {rate.toLocaleString("id-ID", { maximumFractionDigits: 2 })} / {currency}
              </span>{" "}
              — your exact amounts are recorded, not the live rate.
            </>
          ) : (
            <>Enter both your broker&apos;s IDR and {currency || "foreign"} amounts.</>
          )}
        </p>

        <div>
          <div className="label mb-2.5">Date</div>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="field [color-scheme:dark]"
          />
        </div>

        {state.error && <p className="text-sm text-clay">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-gold py-4 text-lg font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(63,185,80,0.6)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form
        action={del}
        onSubmit={(e) => {
          if (!confirm("Delete this forex entry?")) e.preventDefault();
        }}
        className="mt-3 flex justify-end"
      >
        <SubmitButton
          label="Delete forex entry"
          className="grid h-11 w-11 place-items-center rounded-2xl border border-clay/40 text-clay active:bg-clay/10"
        >
          <TrashIcon className="h-5 w-5" />
        </SubmitButton>
      </form>
    </div>
  );
}

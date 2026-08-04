"use client";

import { useActionState, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { Trash } from "@/components/icons";
import type { ForexAccount, ForexTransaction, Wallet } from "@/lib/types";
import {
  deleteForexTransaction,
  updateForexTransaction,
  type ForexState,
} from "../../more/forex/actions";

const INITIAL: ForexState = {};

/**
 * Editing a forex-booked row.
 *
 * The ordinary transaction editor cannot be used here: this ledger row is one of two or three
 * that a single conversion produced, and its amount is a derived cost basis. Editing the
 * conversion instead lets the action revert and re-book the whole set consistently.
 */
export default function ForexEditForm({
  forexTxn,
  accounts,
  wallets,
}: {
  forexTxn: ForexTransaction;
  accounts: ForexAccount[];
  wallets: Wallet[];
}) {
  const bound = updateForexTransaction.bind(null, forexTxn.id);
  const [state, formAction] = useActionState(
    async (_prev: ForexState, formData: FormData) => bound(formData),
    INITIAL
  );
  const [direction, setDirection] = useState<"buy" | "sell">(forexTxn.direction);

  return (
    <div className="space-y-4">
      <p className="rounded-[var(--radius-card)] bg-sage-100 p-4 text-[13px] text-ink-700">
        This entry was created by a <strong>forex conversion</strong>. Editing it
        reverses the whole conversion and books it again — a sell&rsquo;s cost basis
        depends on the rest of your log, so it cannot be changed in isolation.
      </p>

      <form action={formAction} className="space-y-2">
        <input type="hidden" name="direction" value={direction} />

        <div className="flex gap-2">
          {(["buy", "sell"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setDirection(value)}
              aria-pressed={direction === value}
              className={`chip flex-1 justify-center ${
                direction === value ? "chip-on" : ""
              }`}
            >
              {value === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        <select
          name="account_id"
          defaultValue={forexTxn.account_id}
          aria-label="Currency"
          className="field"
        >
          {accounts.map((account) => (
            <option key={account.id} value={String(account.id)}>
              {account.name} ({account.currency})
            </option>
          ))}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <MoneyInput
            name="idr"
            defaultValue={forexTxn.idr}
            ariaLabel="Rupiah amount"
          />
          <input
            name="units"
            inputMode="decimal"
            defaultValue={forexTxn.units}
            aria-label="Units"
            className="field"
          />
        </div>

        <select
          name="wallet_id"
          defaultValue={forexTxn.wallet_id ?? ""}
          aria-label="Wallet"
          className="field"
        >
          <option value="">Choose a wallet</option>
          {wallets.map((w) => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          name="occurred_on"
          defaultValue={forexTxn.occurred_on}
          aria-label="Date"
          className="field"
        />

        {state.error && (
          <p
            role="alert"
            className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
          >
            {state.error}
          </p>
        )}
        {state.ok && (
          <p
            role="status"
            className="rounded-[var(--radius-input)] bg-positive-100 px-4 py-3 text-[14px] font-medium text-positive-600"
          >
            Conversion updated.
          </p>
        )}

        <SubmitButton pendingChildren="Saving…">Save conversion</SubmitButton>
      </form>

      <form action={deleteForexTransaction.bind(null, forexTxn.id)}>
        <SubmitButton
          className="btn btn-ghost w-full text-negative-600"
          pendingChildren="Deleting…"
        >
          <Trash size={18} />
          Delete conversion
        </SubmitButton>
      </form>
    </div>
  );
}

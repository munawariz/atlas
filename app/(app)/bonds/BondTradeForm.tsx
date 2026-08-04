"use client";

import { useActionState, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import { recordBondTrade, type BondState } from "./actions";

const INITIAL: BondState = {};

const SIDES = [
  { value: "buy", label: "Buy" },
  { value: "sell", label: "Sell" },
  { value: "coupon", label: "Coupon" },
] as const;

export default function BondTradeForm({
  wallets,
  defaultWalletId,
  names,
}: {
  wallets: Wallet[];
  defaultWalletId: number | null;
  names: string[];
}) {
  const [state, formAction] = useActionState(recordBondTrade, INITIAL);
  const [side, setSide] = useState<"buy" | "sell" | "coupon">("buy");

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="side" value={side} />

      <div className="flex gap-2">
        {SIDES.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSide(option.value)}
            aria-pressed={side === option.value}
            className={`chip flex-1 justify-center ${
              side === option.value ? "chip-on" : ""
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <input
        name="name"
        list="bond-names"
        placeholder="Bond series or issue name"
        aria-label="Bond name"
        required
        className="field"
      />
      <datalist id="bond-names">
        {names.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      <div className={side === "coupon" ? "" : "grid grid-cols-2 gap-2"}>
        <MoneyInput
          name="idr"
          placeholder={
            side === "buy"
              ? "Principal paid"
              : side === "sell"
                ? "Amount received"
                : "Coupon received"
          }
          ariaLabel="Amount"
        />
        {side !== "coupon" && (
          <input
            name="units"
            inputMode="decimal"
            placeholder="Units"
            aria-label="Units"
            className="field"
          />
        )}
      </div>

      <select
        name="wallet_id"
        defaultValue={defaultWalletId ?? ""}
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
        defaultValue={todayISO()}
        aria-label="Date"
        className="field"
      />

      {side === "coupon" && (
        <p className="text-[13px] text-ink-500">
          A coupon is income — it does not change the principal you hold.
        </p>
      )}

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
          Recorded.
        </p>
      )}

      <SubmitButton pendingChildren="Saving…">
        Record {SIDES.find((s) => s.value === side)?.label.toLowerCase()}
      </SubmitButton>
    </form>
  );
}

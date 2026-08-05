"use client";

import { useActionState, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import { addForexAccount, convertForex, type ForexState } from "./actions";

const INITIAL: ForexState = {};

export function ForexConvert({
  accountId,
  currency,
  wallets,
}: {
  accountId: number;
  currency: string;
  wallets: Wallet[];
}) {
  const [state, formAction] = useActionState(convertForex, INITIAL);
  const [direction, setDirection] = useState<"buy" | "sell">("buy");

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="account_id" value={accountId} />
      <input type="hidden" name="direction" value={direction} />

      <PillSwitcher<"buy" | "sell">
        options={[
          { key: "buy", label: `Buy ${currency}` },
          { key: "sell", label: `Sell ${currency}` },
        ]}
        value={direction}
        onChange={setDirection}
        ariaLabel="Direction"
        grow
      />

      <div className="grid grid-cols-2 gap-2">
        <MoneyInput
          name="idr"
          placeholder={direction === "buy" ? "Rupiah paid" : "Rupiah received"}
          ariaLabel="Rupiah amount"
        />
        <input
          name="units"
          inputMode="decimal"
          placeholder={`${currency} units`}
          aria-label={`${currency} units`}
          className="field"
        />
      </div>

      <select
        name="wallet_id"
        defaultValue={wallets[0]?.id ?? ""}
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
          Converted.
        </p>
      )}

      <SubmitButton className="btn btn-primary btn-sm w-full" pendingChildren="Saving…">
        {direction === "buy" ? "Buy" : "Sell"} {currency}
      </SubmitButton>
    </form>
  );
}

export function ForexAddCurrency() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-outline w-full"
      >
        Add a currency
      </button>
    );
  }

  return (
    <form
      action={async (formData: FormData) => {
        await addForexAccount(formData);
        setOpen(false);
      }}
      className="space-y-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
    >
      <div className="label">Add a currency</div>

      <div className="grid grid-cols-2 gap-2">
        <input
          name="currency"
          placeholder="ISO code (JPY)"
          aria-label="Currency code"
          required
          maxLength={3}
          autoCapitalize="characters"
          className="field uppercase"
        />
        <input
          name="name"
          placeholder="Name (optional)"
          aria-label="Display name"
          className="field"
        />
      </div>

      <p className="text-[13px] text-ink-500">
        Already holding some? Enter the balance <em>and</em> what it cost, so the
        holding starts with a real cost basis.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <input
          name="opening_units"
          inputMode="decimal"
          placeholder="Opening balance"
          aria-label="Opening balance"
          className="field"
        />
        <MoneyInput
          name="opening_idr"
          placeholder="What it cost"
          ariaLabel="Opening cost in rupiah"
        />
      </div>

      <input
        type="date"
        name="opening_date"
        defaultValue={todayISO()}
        aria-label="Opening date"
        className="field"
      />

      <div className="flex gap-2">
        <SubmitButton className="btn btn-primary btn-sm flex-1">
          Add currency
        </SubmitButton>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="btn btn-sm btn-ghost"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

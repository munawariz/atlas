"use client";

import { useActionState, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import { recordCryptoTrade, type CryptoState } from "./actions";

const INITIAL: CryptoState = {};

export default function CryptoTradeForm({
  wallets,
  defaultWalletId,
  symbols,
}: {
  wallets: Wallet[];
  defaultWalletId: number | null;
  symbols: string[];
}) {
  const [state, formAction] = useActionState(recordCryptoTrade, INITIAL);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [opening, setOpening] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="opening" value={opening ? "1" : "0"} />

      <PillSwitcher<"buy" | "sell">
        options={[
          { key: "buy", label: "Buy" },
          { key: "sell", label: "Sell" },
        ]}
        value={side}
        onChange={(value) => {
          setSide(value);
          if (value === "sell") setOpening(false);
        }}
        ariaLabel="Trade side"
        grow
      />

      <input
        name="symbol"
        list="crypto-symbols"
        placeholder="Symbol (e.g. BTC)"
        aria-label="Coin symbol"
        required
        autoCapitalize="characters"
        className="field uppercase"
      />
      <datalist id="crypto-symbols">
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol} />
        ))}
      </datalist>

      <div className="grid grid-cols-2 gap-2">
        {/* Coins are fractional — decimal, never the whole-number input stocks uses. */}
        <input
          name="units"
          inputMode="decimal"
          placeholder="Coins"
          aria-label="Coins"
          required
          className="field"
        />
        <MoneyInput
          name="idr"
          placeholder={side === "buy" ? "Total paid" : "Total received"}
          ariaLabel={side === "buy" ? "Total paid" : "Total received"}
        />
      </div>

      {!opening && (
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
      )}

      <input
        type="date"
        name="occurred_on"
        defaultValue={todayISO()}
        aria-label="Trade date"
        className="field"
      />

      {side === "buy" && (
        <label className="flex items-start gap-2.5 rounded-[var(--radius-input)] bg-cream-100 p-3">
          <input
            type="checkbox"
            checked={opening}
            onChange={(e) => setOpening(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-forest-800)]"
          />
          <span className="text-[13px] text-ink-700">
            <strong>Opening position.</strong> Coins you already had. It sets the
            cost basis but books no money movement.
          </span>
        </label>
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
          Trade recorded.
        </p>
      )}

      <SubmitButton pendingChildren="Saving…">
        {side === "buy" ? "Record buy" : "Record sell"}
      </SubmitButton>
    </form>
  );
}

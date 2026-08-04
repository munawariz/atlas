"use client";

import { useActionState, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { todayISO } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import {
  recordStockDividend,
  recordStockTrade,
  type StockState,
} from "./actions";

const INITIAL: StockState = {};

function Feedback({ state, okText }: { state: StockState; okText: string }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
      >
        {state.error}
      </p>
    );
  }
  if (state.ok) {
    return (
      <p
        role="status"
        className="rounded-[var(--radius-input)] bg-positive-100 px-4 py-3 text-[14px] font-medium text-positive-600"
      >
        {okText}
      </p>
    );
  }
  return null;
}

export function StockTradeForm({
  wallets,
  defaultWalletId,
}: {
  wallets: Wallet[];
  defaultWalletId: number | null;
}) {
  const [state, formAction] = useActionState(recordStockTrade, INITIAL);
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [opening, setOpening] = useState(false);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="side" value={side} />
      <input type="hidden" name="opening" value={opening ? "1" : "0"} />

      <div className="flex gap-2">
        {(["buy", "sell"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => {
              setSide(value);
              if (value === "sell") setOpening(false);
            }}
            aria-pressed={side === value}
            className={`chip flex-1 justify-center ${side === value ? "chip-on" : ""}`}
          >
            {value === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <input
        name="ticker"
        placeholder="Ticker (e.g. BBCA)"
        aria-label="Ticker"
        required
        autoCapitalize="characters"
        className="field uppercase"
      />

      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          name="lots"
          min={1}
          placeholder="Lots"
          aria-label="Lots"
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
            <strong>Opening position.</strong> A holding you already had. It sets
            the cost basis but books no money movement.
          </span>
        </label>
      )}

      <Feedback state={state} okText="Trade recorded." />

      <SubmitButton pendingChildren="Saving…">
        {side === "buy" ? "Record buy" : "Record sell"}
      </SubmitButton>
    </form>
  );
}

export function StockDividendForm({
  wallets,
  defaultWalletId,
  tickers,
}: {
  wallets: Wallet[];
  defaultWalletId: number | null;
  tickers: string[];
}) {
  const [state, formAction] = useActionState(recordStockDividend, INITIAL);

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="ticker"
        list="dividend-tickers"
        placeholder="Ticker"
        aria-label="Ticker"
        required
        autoCapitalize="characters"
        className="field uppercase"
      />
      <datalist id="dividend-tickers">
        {tickers.map((ticker) => (
          <option key={ticker} value={ticker} />
        ))}
      </datalist>

      <MoneyInput name="idr" placeholder="Amount received" ariaLabel="Dividend amount" />

      <select
        name="wallet_id"
        defaultValue={defaultWalletId ?? ""}
        aria-label="Received in wallet"
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
        aria-label="Payment date"
        className="field"
      />

      <input name="note" placeholder="Note (optional)" aria-label="Note" className="field" />

      <Feedback state={state} okText="Dividend logged." />

      <SubmitButton className="btn btn-primary btn-sm w-full" pendingChildren="Saving…">
        Log dividend
      </SubmitButton>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import FormSheet from "@/components/FormSheet";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { formatRupiah, formatUsd, todayISO } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import {
  addEtfBroker,
  recordEtfMove,
  recordEtfTrade,
  type EtfState,
} from "./actions";

const INITIAL: EtfState = {};

interface Broker {
  id: number;
  name: string;
}

const decimal = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;

/** A broker select — or, with a single broker, nothing to choose. */
function BrokerField({ brokers }: { brokers: Broker[] }) {
  if (brokers.length === 1) {
    return <input type="hidden" name="account_id" value={brokers[0].id} />;
  }
  return (
    <select
      name="account_id"
      defaultValue={brokers[0]?.id ?? ""}
      aria-label="Broker"
      className="field"
    >
      {brokers.map((b) => (
        <option key={b.id} value={String(b.id)}>
          {b.name}
        </option>
      ))}
    </select>
  );
}

function Feedback({ state, done }: { state: EtfState; done: string }) {
  return (
    <>
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
          {done}
        </p>
      )}
    </>
  );
}

/**
 * Money crossing between rupiah and dollars — the only ETF entries the IDR ledger sees.
 * A top-up is typed in rupiah, a withdrawal in dollars; the other side is previewed from the
 * rate as you type, and is exactly what the action will store.
 */
export function EtfMoveForm({
  brokers,
  wallets,
  defaultWalletId,
}: {
  brokers: Broker[];
  wallets: Wallet[];
  defaultWalletId: number | null;
}) {
  const [state, formAction] = useActionState(recordEtfMove, INITIAL);
  const [side, setSide] = useState<"topup" | "withdraw">("topup");
  const [preview, setPreview] = useState<string | null>(null);

  const recompute = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const rate = decimal(data.get("rate"));
    // Money inputs carry thousands separators; `decimal` strips them.
    const charges = decimal(data.get("fee")) + decimal(data.get("tax"));
    if (!(rate > 0)) return setPreview(null);
    if (side === "topup") {
      const paid = decimal(data.get("idr"));
      if (!(paid > 0)) return setPreview(null);
      // Fee and tax come off the rupiah paid; only the rest is converted.
      const converted = paid - charges;
      if (converted <= 0) return setPreview(null);
      const credited = `${formatUsd(Math.round((converted / rate) * 100) / 100)} credited`;
      setPreview(
        charges > 0 ? `${credited} · ${formatRupiah(converted)} converted` : credited
      );
    } else {
      const usd = decimal(data.get("usd"));
      if (!(usd > 0)) return setPreview(null);
      setPreview(`${formatRupiah(Math.round(usd * rate) - charges)} received`);
    }
  };

  return (
    <form
      action={formAction}
      onChange={(e) => recompute(e.currentTarget)}
      className="space-y-2"
    >
      <input type="hidden" name="side" value={side} />

      <PillSwitcher<"topup" | "withdraw">
        options={[
          { key: "topup", label: "Top up" },
          { key: "withdraw", label: "Withdraw" },
        ]}
        value={side}
        onChange={(value) => {
          setSide(value);
          setPreview(null);
        }}
        ariaLabel="Direction"
        grow
      />

      <BrokerField brokers={brokers} />

      <div className="grid grid-cols-2 gap-2">
        {side === "topup" ? (
          <MoneyInput key="idr" name="idr" placeholder="Rupiah paid" ariaLabel="Rupiah paid" />
        ) : (
          <input
            key="usd"
            name="usd"
            inputMode="decimal"
            placeholder="USD withdrawn"
            aria-label="USD withdrawn"
            className="field text-right tabular-nums"
          />
        )}
        <input
          name="rate"
          inputMode="decimal"
          placeholder="Rate (Rp per $)"
          aria-label="Rate in rupiah per dollar"
          className="field text-right tabular-nums"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <MoneyInput name="fee" placeholder="Fee (optional)" ariaLabel="Conversion fee in rupiah" />
        <MoneyInput name="tax" placeholder="Tax (optional)" ariaLabel="Tax in rupiah" />
      </div>

      {preview && (
        <p className="text-right text-[13px] font-semibold text-ink-700 tabular-nums">
          ≈ {preview}
        </p>
      )}

      <select
        name="wallet_id"
        defaultValue={defaultWalletId ?? ""}
        aria-label={side === "topup" ? "Paid from wallet" : "Received into wallet"}
        className="field"
      >
        <option value="">
          {side === "topup" ? "Paid from which wallet?" : "Received into which wallet?"}
        </option>
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

      <p className="text-[13px] text-ink-500">
        {side === "topup"
          ? "Enter the full rupiah paid from the wallet. Any fee and tax come off it first and are booked as expenses; the rest converts at the broker's rate."
          : "Brings dollars back to rupiah. Whatever they fetch beyond what they cost is booked as profit; any fee and tax come off what you receive, as expenses."}
      </p>

      <Feedback state={state} done={side === "topup" ? "Topped up." : "Withdrawn."} />

      <SubmitButton pendingChildren="Saving…">
        {side === "topup" ? "Record top-up" : "Record withdrawal"}
      </SubmitButton>
    </form>
  );
}

/** Buys, sells and dividends — all in dollars, all inside the broker. */
export function EtfTradeForm({
  brokers,
  tickers,
}: {
  brokers: Broker[];
  tickers: string[];
}) {
  const [state, formAction] = useActionState(recordEtfTrade, INITIAL);
  const [side, setSide] = useState<"buy" | "sell" | "dividend">("buy");

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="side" value={side} />

      <PillSwitcher<"buy" | "sell" | "dividend">
        options={[
          { key: "buy", label: "Buy" },
          { key: "sell", label: "Sell" },
          { key: "dividend", label: "Dividend" },
        ]}
        value={side}
        onChange={setSide}
        ariaLabel="Entry type"
        grow
      />

      <BrokerField brokers={brokers} />

      <input
        name="ticker"
        list="etf-tickers"
        placeholder="Ticker (e.g. VOO)"
        aria-label="ETF ticker"
        required
        autoCapitalize="characters"
        className="field uppercase"
      />
      <datalist id="etf-tickers">
        {tickers.map((ticker) => (
          <option key={ticker} value={ticker} />
        ))}
      </datalist>

      <div className={side === "dividend" ? "" : "grid grid-cols-2 gap-2"}>
        {side !== "dividend" && (
          <input
            name="units"
            inputMode="decimal"
            placeholder="Units"
            aria-label="Units"
            className="field"
          />
        )}
        <input
          name="usd"
          inputMode="decimal"
          placeholder={
            side === "buy"
              ? "USD paid"
              : side === "sell"
                ? "USD received"
                : "Dividend (USD)"
          }
          aria-label="Amount in USD"
          className="field text-right tabular-nums"
        />
      </div>

      <input
        type="date"
        name="occurred_on"
        defaultValue={todayISO()}
        aria-label="Date"
        className="field"
      />

      {side === "dividend" && (
        <p className="text-[13px] text-ink-500">
          Recorded as USD income and added to the broker&apos;s cash. It reaches your
          rupiah books as profit when you withdraw.
        </p>
      )}

      <Feedback
        state={state}
        done={side === "dividend" ? "Dividend recorded." : "Trade recorded."}
      />

      <SubmitButton pendingChildren="Saving…">
        {side === "buy" ? "Record buy" : side === "sell" ? "Record sell" : "Record dividend"}
      </SubmitButton>
    </form>
  );
}

/**
 * The add-broker sheet, closing itself once the broker is saved. It lives on the client side
 * because FormSheet's `close` callback is a function, and the server page cannot pass one.
 */
export function EtfAddBrokerSheet() {
  return (
    <FormSheet triggerLabel="Add a broker" title="Add a broker">
      {(close) => <EtfAddBroker onDone={close} />}
    </FormSheet>
  );
}

function EtfAddBroker({ onDone }: { onDone?: () => void }) {
  const [state, formAction] = useActionState(addEtfBroker, INITIAL);

  useEffect(() => {
    if (state.ok) onDone?.();
  }, [state.nonce, state.ok, onDone]);

  return (
    <form action={formAction} className="space-y-2">
      <input
        name="name"
        placeholder="Broker name"
        aria-label="Broker name"
        required
        className="field"
      />
      <p className="text-[13px] text-ink-500">
        Each broker keeps its own USD cash, so top-ups, trades and dividends are recorded
        against one.
      </p>
      <Feedback state={state} done="Broker added." />
      <SubmitButton pendingChildren="Saving…">Add broker</SubmitButton>
    </form>
  );
}

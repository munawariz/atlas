"use client";

import { useActionState, useEffect, useState } from "react";
import { formatNumber, todayISO } from "@/lib/format";
import { addBondTrade, type BondState } from "./actions";

type Side = "buy" | "sell" | "coupon";
const SIDES: { value: Side; label: string; color: string }[] = [
  { value: "buy", label: "Buy", color: "bg-plum text-ink" },
  { value: "sell", label: "Sell", color: "bg-sky text-ink" },
  { value: "coupon", label: "Coupon", color: "bg-green text-ink" },
];

export default function BondTradeForm({
  wallets,
  defaultWalletId,
}: {
  wallets: { id: number; name: string }[];
  defaultWalletId: number | null;
}) {
  const [state, formAction, pending] = useActionState<BondState, FormData>(addBondTrade, {});
  const [side, setSide] = useState<Side>("buy");
  const [name, setName] = useState("");
  const [units, setUnits] = useState("");
  const [idr, setIdr] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.nonce) {
      setName("");
      setUnits("");
      setIdr("");
      setToast(state.savedLabel ?? "Saved");
      const t = setTimeout(() => setToast(null), 1600);
      return () => clearTimeout(t);
    }
  }, [state.nonce, state.ok, state.savedLabel]);

  const idrNum = parseInt(idr || "0", 10);
  const unitsNum = parseFloat(units || "0") || 0;
  const amountLabel = side === "buy" ? "Money spent" : side === "sell" ? "Money received" : "Coupon received";

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="side" value={side} />
      <div className="flex gap-1.5">
        {SIDES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSide(s.value)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
              side === s.value ? s.color : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <input
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="Bond / series (e.g. ORI024)"
        className="field uppercase"
        maxLength={12}
      />

      {side !== "coupon" && (
        <label className="block text-xs text-paper-dim">
          Units <span className="text-paper-faint">· 1 unit = Rp 1jt nominal</span>
          <input
            name="units"
            inputMode="decimal"
            value={units}
            onChange={(e) => setUnits(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="e.g. 5"
            className="field mt-1"
          />
        </label>
      )}

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-paper-dim">
          {amountLabel}
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
          {side === "buy" ? "Pay from" : "Receive in"}
          <select name="wallet_id" defaultValue={defaultWalletId ?? wallets[0]?.id} className="field mt-1 [color-scheme:dark]">
            {wallets.map((w) => (
              <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
            ))}
          </select>
        </label>
      </div>

      <input type="date" name="date" defaultValue={todayISO()} className="field [color-scheme:dark]" />

      {side !== "coupon" && unitsNum > 0 && idrNum > 0 && (
        <p className="text-[11px] text-paper-faint">
          ≈ Rp {Math.round(idrNum / unitsNum).toLocaleString("id-ID")}/unit
          {" · "}
          {(idrNum / (unitsNum * 1_000_000) * 100).toFixed(2)}% of nominal
        </p>
      )}

      <p className="text-[11px] text-paper-faint">
        {side === "buy"
          ? "Moves money into the Bonds bucket."
          : side === "sell"
          ? "Returns principal from the Bonds bucket to your wallet."
          : "Books interest as Kupon income — your bond principal stays."}
      </p>

      {state.error && <p className="text-sm text-clay">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-2xl py-2.5 font-semibold text-ink transition-opacity disabled:opacity-60 ${
          side === "buy" ? "bg-plum" : side === "sell" ? "bg-sky" : "bg-green"
        }`}
      >
        {pending ? "Saving…" : side === "buy" ? "Log buy" : side === "sell" ? "Log sell" : "Log coupon"}
      </button>

      {toast && <p className="text-center text-xs font-semibold text-green">✦ {toast}</p>}
    </form>
  );
}

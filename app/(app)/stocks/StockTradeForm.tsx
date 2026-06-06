"use client";

import { useActionState, useEffect, useState } from "react";
import { formatNumber, todayISO } from "@/lib/format";
import { addStockTrade, type StockState } from "./actions";

export default function StockTradeForm({
  wallets,
  defaultWalletId,
}: {
  wallets: { id: number; name: string }[];
  defaultWalletId: number | null;
}) {
  const [state, formAction, pending] = useActionState<StockState, FormData>(addStockTrade, {});
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [ticker, setTicker] = useState("");
  const [lots, setLots] = useState("");
  const [idr, setIdr] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.nonce) {
      setTicker("");
      setLots("");
      setIdr("");
      setToast(state.savedLabel ?? "Saved");
      const t = setTimeout(() => setToast(null), 1600);
      return () => clearTimeout(t);
    }
  }, [state.nonce, state.ok, state.savedLabel]);

  const idrNum = parseInt(idr || "0", 10);

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input type="hidden" name="side" value={side} />
      <div className="flex gap-1.5">
        {(["buy", "sell"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSide(s)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize transition-colors ${
              side === s
                ? s === "buy"
                  ? "bg-plum text-ink"
                  : "bg-green text-ink"
                : "border border-line/60 bg-ink-3 text-paper-dim"
            }`}
          >
            {s === "buy" ? "Buy" : "Sell"}
          </button>
        ))}
      </div>

      <input
        name="ticker"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="Ticker (e.g. BBCA)"
        className="field uppercase"
        maxLength={6}
      />

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-paper-dim">
          Lots
          <input
            name="lots"
            inputMode="numeric"
            value={lots}
            onChange={(e) => setLots(e.target.value.replace(/\D/g, ""))}
            placeholder="0"
            className="field mt-1"
          />
        </label>
        <label className="flex-1 text-xs text-paper-dim">
          {side === "buy" ? "Money spent" : "Money received"}
          <input
            name="idr"
            inputMode="numeric"
            value={idr ? formatNumber(idrNum) : ""}
            onChange={(e) => setIdr(e.target.value.replace(/\D/g, ""))}
            placeholder="Rp"
            className="field mt-1"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-paper-dim">
          {side === "buy" ? "Pay from" : "Receive in"}
          <select name="wallet_id" defaultValue={defaultWalletId ?? wallets[0]?.id} className="field mt-1 [color-scheme:dark]">
            {wallets.map((w) => (
              <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-xs text-paper-dim">
          Date
          <input type="date" name="date" defaultValue={todayISO()} className="field mt-1 [color-scheme:dark]" />
        </label>
      </div>

      {lots && idrNum > 0 && (
        <p className="text-[11px] text-paper-faint">
          ≈ Rp {Math.round(idrNum / (parseInt(lots, 10) * 100)).toLocaleString("id-ID")}/share
          {" · "}
          {parseInt(lots, 10) * 100} shares
        </p>
      )}

      {state.error && <p className="text-sm text-clay">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className={`w-full rounded-2xl py-2.5 font-semibold text-ink transition-opacity disabled:opacity-60 ${
          side === "buy" ? "bg-plum" : "bg-green"
        }`}
      >
        {pending ? "Saving…" : side === "buy" ? "Log buy" : "Log sell"}
      </button>

      {toast && (
        <p className="text-center text-xs font-semibold text-green">✦ {toast}</p>
      )}
    </form>
  );
}

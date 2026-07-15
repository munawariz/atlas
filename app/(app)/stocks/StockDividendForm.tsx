"use client";

import { useActionState, useEffect, useState } from "react";
import { formatNumber, todayISO } from "@/lib/format";
import { addStockDividend, type StockState } from "./actions";

export default function StockDividendForm({
  wallets,
  defaultWalletId,
  tickers,
}: {
  wallets: { id: number; name: string }[];
  defaultWalletId: number | null;
  tickers: string[];
}) {
  const [state, formAction, pending] = useActionState<StockState, FormData>(addStockDividend, {});
  const [ticker, setTicker] = useState("");
  const [idr, setIdr] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok && state.nonce) {
      setTicker("");
      setIdr("");
      setToast(state.savedLabel ?? "Saved");
      const t = setTimeout(() => setToast(null), 1600);
      return () => clearTimeout(t);
    }
  }, [state.nonce, state.ok, state.savedLabel]);

  const idrNum = parseInt(idr || "0", 10);

  return (
    <form action={formAction} className="card space-y-3 p-4">
      <input
        name="ticker"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
        placeholder="Ticker (e.g. BBCA)"
        className="field uppercase"
        maxLength={6}
        list="div-tickers"
      />
      <datalist id="div-tickers">
        {tickers.map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>

      <div className="flex gap-2">
        <label className="flex-1 text-xs text-paper-dim">
          Dividend received
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
          Date
          <input type="date" name="date" defaultValue={todayISO()} className="field mt-1 [color-scheme:dark]" />
        </label>
      </div>

      <label className="block text-xs text-paper-dim">
        Receive in
        <select name="wallet_id" defaultValue={defaultWalletId ?? wallets[0]?.id} className="field mt-1 [color-scheme:dark]">
          {wallets.map((w) => (
            <option key={w.id} value={w.id} className="bg-ink-2">{w.name}</option>
          ))}
        </select>
      </label>

      <input name="note" placeholder="Note (optional)" className="field" maxLength={80} />

      {state.error && <p className="text-sm text-clay">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-green py-2.5 font-semibold text-ink transition-opacity disabled:opacity-60"
      >
        {pending ? "Saving…" : "Log dividend"}
      </button>

      {toast && <p className="text-center text-xs font-semibold text-green">✦ {toast}</p>}
    </form>
  );
}

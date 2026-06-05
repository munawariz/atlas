"use client";

import { useActionState, useEffect, useState } from "react";
import { formatNumber, formatRupiah, formatRupiahShort } from "@/lib/format";
import { saveOpeningBalances, type BalancesState } from "./actions";

export default function BalancesForm({
  currentNetworth,
  wallets,
}: {
  currentNetworth: number;
  wallets: { id: number; name: string; opening: number; current: number }[];
}) {
  const [state, formAction, pending] = useActionState<BalancesState, FormData>(saveOpeningBalances, {});
  const [vals, setVals] = useState<Record<number, string>>(
    () => Object.fromEntries(wallets.map((w) => [w.id, w.opening ? String(w.opening) : ""]))
  );
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (state.ok && state.nonce) {
      setToast(true);
      const t = setTimeout(() => setToast(false), 1600);
      return () => clearTimeout(t);
    }
  }, [state.nonce, state.ok]);

  return (
    <div className="space-y-4">
      <div className="card relative overflow-hidden p-5 text-center">
        <div className="pointer-events-none absolute inset-x-0 -top-12 h-28 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(63,185,80,0.16),transparent)]" />
        <div className="label">Current networth</div>
        <div className="mt-1 font-display text-3xl font-medium tabular-nums text-paper">{formatRupiah(currentNetworth)}</div>
        <div className="mt-1 text-[11px] text-paper-faint">Starting balance + every income, expense &amp; transfer.</div>
      </div>

      <form action={formAction} className="space-y-2">
        {wallets.map((w) => (
          <label key={w.id} className="card flex items-center justify-between gap-3 px-4 py-3">
            <span className="min-w-0">
              <span className="block text-sm font-medium text-paper">{w.name}</span>
              <span className="block text-[11px] text-paper-faint">now {formatRupiahShort(w.current)}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="text-sm text-paper-faint">Rp</span>
              <input
                name={`w_${w.id}`}
                inputMode="numeric"
                value={vals[w.id] ? formatNumber(parseInt(vals[w.id], 10)) : ""}
                onChange={(e) => setVals((v) => ({ ...v, [w.id]: e.target.value.replace(/\D/g, "") }))}
                placeholder="0"
                className="w-28 bg-transparent text-right font-display text-base font-medium tabular-nums text-paper outline-none placeholder:text-paper-faint"
              />
            </span>
          </label>
        ))}

        {state.error && <p className="text-sm text-clay">{state.error}</p>}

        <p className="px-1 pt-1 text-[11px] text-paper-faint">
          “Starting” is each wallet’s balance before you began logging — the app adds your transactions on top to get “now”.
        </p>

        <button
          type="submit"
          disabled={pending}
          className="mt-1 w-full rounded-2xl bg-green py-4 text-lg font-semibold text-ink shadow-[0_10px_30px_-12px_rgba(63,185,80,0.6)] transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save starting balances"}
        </button>
      </form>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-30 flex justify-center">
          <div className="pop rounded-full bg-green px-5 py-2.5 text-sm font-semibold text-ink shadow-lg">✦ Saved</div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { addForexAccount } from "../actions";
import MoneyInput from "@/components/MoneyInput";

export default function ForexAddCurrency() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await addForexAccount(fd);
      setOpen(false);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-2xl border border-dashed border-line/70 py-3 text-sm font-medium text-paper-dim active:bg-ink-3 active:text-paper"
      >
        + Add a currency
      </button>

      {open && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
          onClick={() => !pending && setOpen(false)}
        >
          <form
            onSubmit={onSubmit}
            onClick={(e) => e.stopPropagation()}
            className="card pop w-full max-w-xs space-y-2 bg-ink-2 p-5 shadow-2xl"
          >
            <h3 className="font-display text-lg font-medium text-paper">Add a currency</h3>
            <div className="flex gap-2">
              <input name="currency" placeholder="ISO · e.g. USD" maxLength={4} className="field w-32 uppercase" />
              <input name="name" placeholder="Name (optional)" className="field flex-1" />
            </div>
            <div className="flex gap-2">
              <label className="flex-1 text-xs text-paper-dim">
                Starting balance
                <input name="units" inputMode="decimal" placeholder="e.g. 1000" className="field mt-1" />
              </label>
              <label className="flex-1 text-xs text-paper-dim">
                Its IDR cost
                <MoneyInput name="idr" placeholder="Rp" className="field mt-1" />
              </label>
            </div>
            <p className="text-[11px] text-paper-faint">
              Optional — the foreign amount you already hold and the IDR you paid for it.
              Giving both lets Atlas track gain/loss. Live rate is fetched from the ISO code (e.g. USD, EUR, SGD).
            </p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-line/70 py-2.5 text-sm font-medium text-paper-dim disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 rounded-xl bg-green py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
              >
                {pending ? "Adding…" : "Add currency"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

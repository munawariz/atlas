"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {} as { error?: string });

  return (
    <main className="min-h-full flex flex-col items-center justify-center px-7 safe-top safe-bottom">
      <div className="w-full max-w-sm reveal">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 h-20 w-20 overflow-hidden rounded-[22px] shadow-[0_14px_40px_-12px_rgba(29,181,106,0.55)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="Atlas" className="h-full w-full" />
          </div>
          <h1 className="font-display text-5xl font-semibold lowercase leading-none tracking-tight text-paper">
            atlas
          </h1>
          <p className="label mt-3 text-green" style={{ letterSpacing: "0.34em" }}>Financial Tracker</p>
          <p className="mt-4 text-sm text-paper-dim">Track your finances. Gain clarity.</p>
        </div>

        <form action={formAction} className="space-y-3">
          <input
            type="password"
            name="password"
            autoFocus
            autoComplete="current-password"
            placeholder="Enter passphrase"
            className="field px-5 py-4 text-center text-lg tracking-wide"
          />
          {state?.error && <p className="text-center text-sm text-clay">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-gold px-4 py-4 text-lg font-semibold text-ink transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {pending ? "Unlocking…" : "Unlock"}
          </button>
        </form>

        <p className="mt-8 text-center text-[11px] text-paper-faint">
          Your ledger is private — only this passphrase opens it.
        </p>
      </div>
    </main>
  );
}

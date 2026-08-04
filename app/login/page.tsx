"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, INITIAL);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="card p-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-forest-800">
              <svg width="40" height="40" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2c.6 5.2 4.2 8.8 9.4 9.4v1.2C16.2 13.2 12.6 16.8 12 22h-1.2C10.2 16.8 6.6 13.2 1.4 12.6v-1.2C6.6 10.8 10.2 7.2 10.8 2z"
                  fill="var(--color-lime-500)"
                />
              </svg>
            </span>

            <h1 className="mt-6 font-display text-[56px] font-extrabold lowercase leading-[1.05] tracking-[-0.045em] text-ink-900">
              atlas
            </h1>

            <span className="label mt-1" style={{ letterSpacing: "0.34em" }}>
              Financial Tracker
            </span>

            <p className="mt-4 text-sm leading-relaxed text-ink-700">
              Every movement of your money, in one ledger.
            </p>
          </div>

          <form action={formAction} className="mt-8 flex flex-col gap-3">
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              autoFocus
              required
              placeholder="Password"
              className="field"
            />

            {state.error && (
              <p className="text-sm font-medium text-negative-600" role="alert">
                {state.error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary mt-1 w-full"
            >
              {pending ? "Unlocking…" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

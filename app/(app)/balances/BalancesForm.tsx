"use client";

import { useActionState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { formatRupiah } from "@/lib/format";
import type { Wallet } from "@/lib/types";
import { saveOpeningBalances, type BalancesState } from "./actions";

const INITIAL: BalancesState = {};

export default function BalancesForm({
  wallets,
  opening,
  current,
}: {
  wallets: Wallet[];
  /** wallet id -> opening balance stored at the opening month. */
  opening: Record<number, number>;
  /** wallet id -> balance derived for today, shown alongside for sanity-checking. */
  current: Record<number, number>;
}) {
  const [state, formAction] = useActionState(saveOpeningBalances, INITIAL);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        {wallets.map((wallet) => (
          <div
            key={wallet.id}
            className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
          >
            <label
              htmlFor={`wallet_${wallet.id}`}
              className="mb-2 flex items-baseline justify-between"
            >
              <span className="text-[15px] font-semibold text-ink-900">
                {wallet.name}
              </span>
              <span className="text-[13px] text-ink-500 tabular-nums">
                now {formatRupiah(current[wallet.id] ?? 0)}
              </span>
            </label>
            <MoneyInput
              id={`wallet_${wallet.id}`}
              name={`wallet_${wallet.id}`}
              defaultValue={opening[wallet.id] ?? 0}
            />
          </div>
        ))}
      </div>

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
          Opening balances saved.
        </p>
      )}

      <SubmitButton pendingChildren="Saving…">Save opening balances</SubmitButton>
    </form>
  );
}

"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { formatMonthShort, formatRupiah, todayISO } from "@/lib/format";
import type { Loan, LoanPayment, Wallet } from "@/lib/types";
import {
  collectLoanMonth,
  scheduleLoanMonth,
  uncollectLoanMonth,
  unscheduleLoanMonth,
} from "./actions";

/**
 * The schedule strip for one loan.
 *
 * Tapping an uncollected month opens a collect form (wallet, date, optional partial amount);
 * tapping a collected one offers to undo. An edit mode adds and removes scheduled months.
 */
export default function PaymentGrid({
  loan,
  payments,
  wallets,
  defaultWalletId,
}: {
  loan: Loan;
  payments: LoanPayment[];
  wallets: Wallet[];
  defaultWalletId: number | null;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sorted = [...payments].sort((a, b) =>
    a.period_month < b.period_month ? -1 : 1
  );

  // The month after the last scheduled one — what "add a month" appends.
  const last = sorted[sorted.length - 1]?.period_month;
  const nextMonth = last
    ? (() => {
        const y = parseInt(last.slice(0, 4), 10);
        const m = parseInt(last.slice(5, 7), 10);
        return m === 12
          ? `${y + 1}-01-01`
          : `${y}-${String(m + 1).padStart(2, "0")}-01`;
      })()
    : null;

  return (
    <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="label">Schedule</span>
        <button
          type="button"
          onClick={() => {
            setEditing((e) => !e);
            setOpenMonth(null);
          }}
          className="text-[13px] font-semibold text-forest-800"
        >
          {editing ? "Done" : "Edit months"}
        </button>
      </div>

      <div className="flex flex-wrap gap-1">
        {sorted.map((payment) => {
          const collected = payment.paid;
          return (
            <button
              key={payment.id}
              type="button"
              onClick={() =>
                setOpenMonth((prev) =>
                  prev === payment.period_month ? null : payment.period_month
                )
              }
              aria-pressed={openMonth === payment.period_month}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                collected
                  ? "bg-lime-200 text-forest-800"
                  : "bg-cream-200 text-ink-500"
              } ${openMonth === payment.period_month ? "ring-2 ring-forest-800" : ""}`}
            >
              {formatMonthShort(payment.period_month)}
            </button>
          );
        })}

        {editing && nextMonth && (
          <form action={scheduleLoanMonth} className="contents">
            <input type="hidden" name="loan_id" value={loan.id} />
            <input type="hidden" name="period_month" value={nextMonth} />
            <button
              type="submit"
              className="rounded-full border border-dashed border-[var(--border-default)] px-2.5 py-1 text-[11px] font-semibold text-forest-800"
            >
              + {formatMonthShort(nextMonth)}
            </button>
          </form>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-[var(--radius-input)] bg-negative-100 px-3 py-2 text-[13px] font-medium text-negative-600"
        >
          {error}
        </p>
      )}

      {openMonth &&
        (() => {
          const payment = sorted.find((p) => p.period_month === openMonth);
          if (!payment) return null;

          if (payment.paid) {
            return (
              <div className="mt-3 rounded-[var(--radius-input)] bg-cream-100 p-3">
                <p className="text-[13px] text-ink-700">
                  {formatMonthShort(openMonth)} collected —{" "}
                  <strong className="tabular-nums">
                    {formatRupiah(payment.amount ?? loan.installment)}
                  </strong>
                  {payment.amount != null && payment.amount !== loan.installment && (
                    <span className="text-ink-500"> (partial)</span>
                  )}
                </p>
                <form action={uncollectLoanMonth} className="mt-2">
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="period_month" value={openMonth} />
                  <SubmitButton className="btn btn-sm btn-ghost">
                    Undo collection
                  </SubmitButton>
                </form>
              </div>
            );
          }

          return (
            <div className="mt-3 space-y-2 rounded-[var(--radius-input)] bg-cream-100 p-3">
              <form
                action={async (formData: FormData) => {
                  const result = await collectLoanMonth(formData);
                  setError(result.error ?? null);
                  if (result.ok) setOpenMonth(null);
                }}
                className="space-y-2"
              >
                <input type="hidden" name="loan_id" value={loan.id} />
                <input type="hidden" name="period_month" value={openMonth} />

                <div className="label">Collect {formatMonthShort(openMonth)}</div>

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

                <MoneyInput
                  name="amount"
                  placeholder={`${formatRupiah(loan.installment)} (full)`}
                  ariaLabel="Amount collected"
                />

                <input
                  type="date"
                  name="occurred_on"
                  defaultValue={todayISO()}
                  aria-label="Collection date"
                  className="field"
                />

                <SubmitButton className="btn btn-primary btn-sm w-full">
                  Collect
                </SubmitButton>
              </form>

              {editing && (
                <form action={unscheduleLoanMonth}>
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="period_month" value={openMonth} />
                  <SubmitButton className="btn btn-sm btn-ghost w-full text-negative-600">
                    Remove this month from the schedule
                  </SubmitButton>
                </form>
              )}
            </div>
          );
        })()}
    </div>
  );
}

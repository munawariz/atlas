"use client";

import { useEffect, useRef, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { Check, CircleHalf } from "@/components/icons";
import {
  formatDateShort,
  formatMonthShort,
  formatRupiah,
  todayISO,
} from "@/lib/format";
import type { Loan, LoanCollection, LoanPayment, Wallet } from "@/lib/types";
import {
  collectLoanMonth,
  scheduleLoanMonth,
  uncollectLoanMonth,
  undoLoanCollection,
  unscheduleLoanMonth,
} from "./actions";

/**
 * The schedule strip for one loan.
 *
 * Tapping a month opens its panel: what has been collected so far, each collection with its
 * own undo, and — for as long as the month is not square — a form to collect the rest. An
 * edit mode adds and removes scheduled months.
 */
export default function PaymentGrid({
  loan,
  payments,
  collections,
  wallets,
  defaultWalletId,
}: {
  loan: Loan;
  payments: LoanPayment[];
  collections: LoanCollection[];
  wallets: Wallet[];
  defaultWalletId: number | null;
}) {
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // The panel opens below the whole strip, so on a 24-month loan it lands four wrapped rows
  // further down — frequently off-screen, with nothing to say it opened at all
  // (atlas-ux-plan-manage-pages.md C4e).
  useEffect(() => {
    if (!openMonth) return;
    const node = panelRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "nearest" });
    // The collect form first: on a partly collected month the panel now leads with the list
    // of what has come in, and landing focus on an "Undo" is the opposite of the intent.
    const focusable =
      node.querySelector<HTMLElement>("[data-collect] select, [data-collect] input") ??
      node.querySelector<HTMLElement>("select, input, button, [tabindex]");
    focusable?.focus();
  }, [openMonth]);

  const sorted = [...payments].sort((a, b) =>
    a.period_month < b.period_month ? -1 : 1
  );

  const collectionsOf = (paymentId: number) =>
    collections.filter((c) => c.payment_id === paymentId);

  /** How much of a month is in hand. A month with nothing collected reads 0, not null. */
  const collectedOn = (payment: LoanPayment) =>
    payment.amount ?? (payment.paid ? loan.installment : 0);

  /*
   * A one-payment loan still stores its collection in a month slot, because that is what
   * `loan_payments` is keyed by — but the month was never asked for (the form takes a
   * deadline instead), so labelling the chip with it would show the user a date they did
   * not choose. Everything here reads by state instead. Adding a month through "Edit
   * months" makes the loan monthly, and the month labels come back on their own.
   */
  const once = sorted.length === 1;

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
        <span className="label">{once ? "Payment" : "Schedule"}</span>
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
          // A month with money against it but not enough to close it is its own state — it
          // is neither done nor untouched, and the whole point is that it stays collectable.
          const partial = !collected && collectedOn(payment) > 0;
          const state = collected
            ? "collected"
            : partial
              ? "partly collected"
              : "not collected";
          const label = once
            ? collected
              ? "Collected"
              : partial
                ? "Partly collected"
                : "Not collected"
            : formatMonthShort(payment.period_month);
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
              aria-label={
                once
                  ? label
                  : `${formatMonthShort(payment.period_month)}, ${state}`
              }
              className={`inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors ${
                collected
                  ? "bg-lime-200 text-forest-800"
                  : partial
                    ? "bg-warning-100 text-warning-600"
                    : "bg-cream-200 text-ink-500"
              } ${openMonth === payment.period_month ? "ring-2 ring-forest-800" : ""}`}
            >
              {/* Colour was the only carrier of collected-vs-not, and these chips are the
                  primary interaction on the page (atlas-ux-plan-manage-pages.md C4a, C4b).
                  A half-filled glyph says "part of it" without a second word of label. */}
              {collected && <Check size={12} />}
              {partial && <CircleHalf size={12} />}
              {label}
            </button>
          );
        })}

        {editing && nextMonth && (
          <form action={scheduleLoanMonth} className="contents">
            <input type="hidden" name="loan_id" value={loan.id} />
            <input type="hidden" name="period_month" value={nextMonth} />
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-full border border-dashed border-[var(--border-default)] px-2.5 text-[11px] font-semibold text-forest-800"
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

          const received = collectionsOf(payment.id);
          const collected = collectedOn(payment);
          const remaining = Math.max(0, loan.installment - collected);

          /*
           * One panel for every state, because a month moves between them: what is in hand,
           * every collection that got it there, and — while anything is still owed — the form
           * to collect the rest. Previously a collected month offered nothing but undo, so a
           * partial payment locked the month with money still to come.
           */
          return (
            <div
              key={openMonth}
              ref={panelRef}
              className="mt-3 space-y-3 rounded-[var(--radius-input)] bg-cream-100 p-3"
            >
              {collected > 0 && (
                <div>
                  <p className="text-[13px] text-ink-700">
                    {once ? "Collected" : `${formatMonthShort(openMonth)} collected`} —{" "}
                    <strong className="tabular-nums">{formatRupiah(collected)}</strong>{" "}
                    of{" "}
                    <span className="tabular-nums">
                      {formatRupiah(loan.installment)}
                    </span>
                    {remaining > 0 && (
                      <>
                        {" "}
                        ·{" "}
                        <span className="tabular-nums text-warning-600">
                          {formatRupiah(remaining)} still to collect
                        </span>
                      </>
                    )}
                  </p>

                  {/* Each collection undoes on its own: taking back the last Rp 200k should
                      not also unpick the Rp 800k that came in a month earlier. */}
                  <ul className="mt-2 space-y-1">
                    {received.map((collection) => (
                      <li
                        key={collection.id}
                        className="flex items-center justify-between gap-2 text-[13px] text-ink-700"
                      >
                        <span className="tabular-nums">
                          {formatRupiah(collection.amount)}
                          <span className="text-ink-500">
                            {" "}
                            · {formatDateShort(collection.occurred_on)}
                          </span>
                        </span>
                        <form action={undoLoanCollection}>
                          <input
                            type="hidden"
                            name="collection_id"
                            value={collection.id}
                          />
                          <SubmitButton className="btn btn-sm btn-ghost">
                            Undo
                          </SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>

                  {/* A month collected before collections were itemised has no rows to list,
                      so it keeps the one control it always had. */}
                  {received.length === 0 && (
                    <form action={uncollectLoanMonth} className="mt-2">
                      <input type="hidden" name="loan_id" value={loan.id} />
                      <input type="hidden" name="period_month" value={openMonth} />
                      <SubmitButton className="btn btn-sm btn-ghost">
                        Undo collection
                      </SubmitButton>
                    </form>
                  )}
                </div>
              )}

              {remaining > 0 && (
                <form
                  action={async (formData: FormData) => {
                    const result = await collectLoanMonth(formData);
                    setError(result.error ?? null);
                    if (result.ok) setOpenMonth(null);
                  }}
                  className="space-y-2"
                  data-collect
                >
                  <input type="hidden" name="loan_id" value={loan.id} />
                  <input type="hidden" name="period_month" value={openMonth} />

                  <div className="label">
                    {collected > 0
                      ? "Collect the rest"
                      : once
                        ? "Collect payment"
                        : `Collect ${formatMonthShort(openMonth)}`}
                  </div>

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

                  <MoneyInput name="amount" ariaLabel="Amount collected" />
                  {/* This used to be the placeholder — the one string explaining what a blank
                      field collects, gone the moment you typed (Lending UX #8). */}
                  <p className="text-[13px] text-ink-500">
                    Leave blank to collect the{" "}
                    {collected > 0 ? "remaining" : "full"}{" "}
                    <span className="tabular-nums">{formatRupiah(remaining)}</span>
                    . Less than that leaves the {once ? "loan" : "month"} open.
                  </p>

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
              )}

              {/* Unscheduling deletes the slot, which would take its collections — and their
                  income rows — with it, so it is offered only while nothing is collected. */}
              {editing && collected === 0 && (
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

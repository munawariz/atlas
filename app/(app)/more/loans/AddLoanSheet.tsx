"use client";

import { useActionState, useEffect, useRef } from "react";
import FormSheet from "@/components/FormSheet";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { addLoan, type LoanState } from "./actions";

/**
 * The add-a-loan form, behind a `FormSheet` trigger (atlas-ux-plan-manage-pages.md C2).
 *
 * The `<details>` it replaces rendered its summary as plain semibold text — no chevron, no
 * button affordance — so "Add a loan" read as a section heading, and opening it shoved the loan
 * list 300px down the page.
 */

const EMPTY: LoanState = {};

export default function AddLoanSheet({ defaultMonth }: { defaultMonth: string }) {
  return (
    <FormSheet triggerLabel="Add a loan" title="Add a loan">
      {(close) => <AddLoanForm defaultMonth={defaultMonth} onSaved={close} />}
    </FormSheet>
  );
}

function AddLoanForm({
  defaultMonth,
  onSaved,
}: {
  defaultMonth: string;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(addLoan, EMPTY);
  const lastNonce = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="label mb-1 block">Who owes you</span>
        <input
          name="person"
          placeholder="A name"
          required
          autoComplete="off"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Via</span>
        {/* "Lender" was backwards: on this page YOU are the lender. */}
        <input
          name="lender"
          placeholder="Optional — a shop, platform or middleman"
          autoComplete="off"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Per month</span>
        <MoneyInput name="installment" ariaLabel="Amount per month" />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label mb-1 block">Start month</span>
          <input
            type="month"
            name="start_month"
            defaultValue={defaultMonth}
            className="field"
          />
        </label>
        <label className="block">
          <span className="label mb-1 block">Months</span>
          <input
            type="number"
            name="months"
            min={1}
            max={60}
            defaultValue={1}
            aria-label="Number of months"
            className="field"
          />
        </label>
      </div>

      <label className="block">
        <span className="label mb-1 block">Note</span>
        <input
          name="note"
          placeholder="Optional"
          autoComplete="off"
          className="field"
        />
      </label>

      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-negative-100 px-3 py-2 text-[13px] font-medium text-negative-600"
        >
          {state.error}
        </p>
      )}

      <SubmitButton className="btn btn-primary w-full" pendingChildren="Adding…">
        Add loan
      </SubmitButton>
    </form>
  );
}

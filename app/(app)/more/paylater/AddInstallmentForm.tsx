"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import type { PaylaterProvider } from "@/lib/types";
import { addPaylaterItem, type InstallmentState } from "./actions";

/**
 * The add-an-installment form, for a `FormSheet` (atlas-ux-plan-manage-pages.md C2).
 *
 * It carries its own month-range check as well as the server's. The client one is what keeps the
 * submit honest — the pair of `<input type="month">`s is right there and a disabled button plus a
 * line of copy beats a round trip. The server one is what makes it true, since a backwards range
 * used to write a row no month could ever show (C3).
 */

const EMPTY: InstallmentState = {};

export default function AddInstallmentForm({
  providers,
  defaultMonth,
  onSaved,
}: {
  providers: PaylaterProvider[];
  /** `YYYY-MM` — the month being viewed, which is what a new schedule usually starts in. */
  defaultMonth: string;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(addPaylaterItem, EMPTY);
  const [first, setFirst] = useState(defaultMonth);
  const [last, setLast] = useState(defaultMonth);
  const lastNonce = useRef<number | undefined>(undefined);

  const backwards = Boolean(first && last && last < first);

  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    onSaved();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="space-y-3">
      <label className="block">
        <span className="label mb-1 block">Item</span>
        <input
          name="item"
          placeholder="Phone, laptop, sofa…"
          required
          autoComplete="off"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Per month</span>
        <MoneyInput name="monthly_amount" ariaLabel="Amount per month" />
      </label>

      <div>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label mb-1 block">First month</span>
            <input
              type="month"
              name="first_month_date"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              className="field"
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Last month</span>
            <input
              type="month"
              name="last_month_date"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              className="field"
            />
          </label>
        </div>
        <p
          className={`mt-1 text-[13px] ${
            backwards ? "font-medium text-negative-600" : "text-ink-500"
          }`}
          role={backwards ? "alert" : undefined}
        >
          {backwards
            ? "Last month can't be before the first."
            : "The month the first and last payments are due."}
        </p>
      </div>

      <label className="block">
        <span className="label mb-1 block">Provider</span>
        <select name="provider_id" className="field" defaultValue="">
          <option value="">None</option>
          {providers.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
      </label>

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

      <SubmitButton
        className="btn btn-primary w-full"
        pendingChildren="Adding…"
        disabled={backwards}
      >
        Add installment
      </SubmitButton>
    </form>
  );
}

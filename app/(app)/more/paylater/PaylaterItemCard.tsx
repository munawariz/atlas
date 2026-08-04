"use client";

import { useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { Pencil, Trash, X } from "@/components/icons";
import { formatMonthShort, formatRupiah, todayISO } from "@/lib/format";
import type { PaylaterItem, PaylaterProvider, Wallet } from "@/lib/types";
import {
  deletePaylaterItem,
  payPaylaterMonth,
  unpayPaylaterMonth,
  updatePaylaterItem,
} from "./actions";

/** Every month in the item's schedule, inclusive. */
function scheduleMonths(item: PaylaterItem): string[] {
  const months: string[] = [];
  let cursor = item.first_month_date;
  // Guard at 600 so a bad range can never spin forever.
  for (let i = 0; i < 600 && cursor <= item.last_month_date; i += 1) {
    months.push(cursor);
    const y = parseInt(cursor.slice(0, 4), 10);
    const m = parseInt(cursor.slice(5, 7), 10);
    cursor =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  return months;
}

export default function PaylaterItemCard({
  item,
  monthKey,
  paidMonths,
  wallets,
  providers,
  defaultWalletId,
}: {
  item: PaylaterItem;
  monthKey: string;
  /** Every month of this item already marked paid. */
  paidMonths: Set<string>;
  wallets: Wallet[];
  providers: PaylaterProvider[];
  defaultWalletId: number | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const months = scheduleMonths(item);
  const paidCount = months.filter((m) => paidMonths.has(m)).length;
  const monthsLeft = months.length - paidCount;
  const isPaidThisMonth = paidMonths.has(monthKey);
  const activeThisMonth =
    item.first_month_date <= monthKey && monthKey <= item.last_month_date;

  if (editing) {
    return (
      <form
        action={async (formData: FormData) => {
          await updatePaylaterItem(item.id, formData);
          setEditing(false);
        }}
        className="space-y-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
      >
        <div className="flex items-center justify-between">
          <span className="label">Edit installment</span>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Cancel edit"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500"
          >
            <X size={16} />
          </button>
        </div>

        <input
          name="item"
          defaultValue={item.item}
          aria-label="Item name"
          required
          className="field"
        />
        <MoneyInput
          name="monthly_amount"
          defaultValue={item.monthly_amount}
          ariaLabel="Monthly amount"
        />
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="label mb-1 block">First month</span>
            <input
              type="month"
              name="first_month_date"
              defaultValue={item.first_month_date.slice(0, 7)}
              className="field"
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Last month</span>
            <input
              type="month"
              name="last_month_date"
              defaultValue={item.last_month_date.slice(0, 7)}
              className="field"
            />
          </label>
        </div>
        <select
          name="provider_id"
          defaultValue={item.provider_id ?? ""}
          aria-label="Provider"
          className="field"
        >
          <option value="">No provider</option>
          {providers.map((p) => (
            <option key={p.id} value={String(p.id)}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          name="note"
          defaultValue={item.note ?? ""}
          placeholder="Note (optional)"
          aria-label="Note"
          className="field"
        />

        <p className="text-[13px] text-ink-500">
          Months you have already paid keep the expense they booked — only future
          months use the new amount.
        </p>

        <SubmitButton className="btn btn-primary btn-sm w-full">
          Save changes
        </SubmitButton>
      </form>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-ink-900">
            {item.item}
          </div>
          <div className="text-[13px] text-ink-500 tabular-nums">
            {formatRupiah(item.monthly_amount)}/mo · {monthsLeft} of{" "}
            {months.length} left
          </div>
          {item.note && (
            <div className="mt-0.5 truncate text-[13px] text-ink-300">
              {item.note}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Edit ${item.item}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-500 hover:bg-forest-50"
          >
            <Pencil size={16} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${item.item}`}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-negative-600 hover:bg-forest-50"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      {/* Per-month chip strip. */}
      <div className="mt-3 flex flex-wrap gap-1">
        {months.map((month) => {
          const paid = paidMonths.has(month);
          return (
            <span
              key={month}
              title={`${formatMonthShort(month)} — ${paid ? "paid" : "unpaid"}`}
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                paid
                  ? "bg-lime-200 text-forest-800"
                  : month === monthKey
                    ? "bg-warning-100 text-warning-600"
                    : "bg-cream-200 text-ink-500"
              }`}
            >
              {formatMonthShort(month)}
            </span>
          );
        })}
      </div>

      {activeThisMonth && (
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
          {isPaidThisMonth ? (
            <form action={unpayPaylaterMonth}>
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="month" value={monthKey} />
              <SubmitButton className="btn btn-sm btn-ghost w-full">
                Undo this month&rsquo;s payment
              </SubmitButton>
            </form>
          ) : payOpen ? (
            <form action={payPaylaterMonth} className="space-y-2">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="month" value={monthKey} />

              <select
                name="wallet_id"
                defaultValue={defaultWalletId ?? ""}
                aria-label="Pay from wallet"
                className="field"
              >
                <option value="">Choose a wallet</option>
                {wallets.map((w) => (
                  <option key={w.id} value={String(w.id)}>
                    {w.name}
                  </option>
                ))}
              </select>

              <input
                type="date"
                name="occurred_on"
                defaultValue={todayISO()}
                aria-label="Payment date"
                className="field"
              />

              <SubmitButton className="btn btn-primary btn-sm w-full">
                Pay {formatRupiah(item.monthly_amount)}
              </SubmitButton>

              <SubmitButton
                name="skip_transaction"
                value="1"
                className="btn btn-sm btn-ghost w-full"
              >
                Mark paid without a transaction
              </SubmitButton>

              <button
                type="button"
                onClick={() => setPayOpen(false)}
                className="btn btn-sm btn-ghost w-full text-ink-500"
              >
                Cancel
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="btn btn-accent btn-sm w-full"
            >
              Pay this month
            </button>
          )}
        </div>
      )}

      {confirmingDelete && (
        <div className="mt-3 rounded-[var(--radius-input)] bg-negative-100 p-3">
          <p className="text-[13px] text-negative-600">
            Delete <strong>{item.item}</strong>? Every expense it booked is
            removed from the ledger too.
          </p>
          <div className="mt-2 flex gap-2">
            <form action={deletePaylaterItem.bind(null, item.id)}>
              <button
                type="submit"
                className="btn btn-sm bg-negative-500 text-white"
              >
                Delete
              </button>
            </form>
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="btn btn-sm btn-ghost"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

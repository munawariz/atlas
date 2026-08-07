"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { Check, Pencil, Trash, X } from "@/components/icons";
import { formatMonthShort, formatRupiah, todayISO } from "@/lib/format";
import type { PaylaterItem, PaylaterProvider, Wallet } from "@/lib/types";
import {
  deletePaylaterItem,
  payPaylaterMonth,
  unpayPaylaterMonth,
  updatePaylaterItem,
  type InstallmentState,
} from "./actions";

/**
 * Every month in the item's schedule, inclusive.
 *
 * The bounds are ordered first, for the same reason `itemActiveIn` orders them: a row written
 * before the range was validated would otherwise render an empty strip and no way to fix it.
 */
function scheduleMonths(item: PaylaterItem): string[] {
  const [from, to] =
    item.first_month_date <= item.last_month_date
      ? [item.first_month_date, item.last_month_date]
      : [item.last_month_date, item.first_month_date];

  const months: string[] = [];
  let cursor = from;
  // Guard at 600 so a bad range can never spin forever.
  for (let i = 0; i < 600 && cursor <= to; i += 1) {
    months.push(cursor);
    const y = parseInt(cursor.slice(0, 4), 10);
    const m = parseInt(cursor.slice(5, 7), 10);
    cursor =
      m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  }
  return months;
}

/** Schedules this short cost nothing to show in full, so they skip the disclosure. */
const ALWAYS_SHOW_UP_TO = 3;

const EMPTY: InstallmentState = {};

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
  const [showSchedule, setShowSchedule] = useState(false);
  /**
   * Which month's pay/undo panel is open. Any month, not just this one — the actions have always
   * taken an arbitrary month, and only this card's "current month only" gating stood between the
   * user and correcting a mis-marked one (atlas-ux-plan-manage-pages.md C4c, preferred option).
   */
  const [openMonth, setOpenMonth] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const months = scheduleMonths(item);
  const paidCount = months.filter((m) => paidMonths.has(m)).length;
  const monthsLeft = months.length - paidCount;
  const isPaidThisMonth = paidMonths.has(monthKey);
  const activeThisMonth =
    months.length > 0 && months[0] <= monthKey && monthKey <= months[months.length - 1];
  const pct = months.length > 0 ? (paidCount / months.length) * 100 : 0;

  // The panel opens BELOW a strip that can wrap to four rows, so on a long schedule it lands
  // off-screen with nothing to say it appeared (C4e).
  useEffect(() => {
    if (!openMonth) return;
    const node = panelRef.current;
    if (!node) return;
    node.scrollIntoView({ block: "nearest" });
    node.querySelector<HTMLElement>(
      "select, input, button, [tabindex]"
    )?.focus();
  }, [openMonth]);

  if (editing) {
    return (
      <EditForm
        item={item}
        providers={providers}
        onDone={() => setEditing(false)}
      />
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
            {months.length} months left
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
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-forest-50"
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            aria-label={`Delete ${item.item}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-negative-600 hover:bg-forest-50"
          >
            <Trash size={18} />
          </button>
        </div>
      </div>

      {/*
        The progress bar is the primary indicator — a 24-month schedule used to render 24 chips
        across four wrapped lines above a card whose real content is three (C4d). Same markup
        Lending already uses, so the two pages finally read alike.
      */}
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-cream-200">
        <div
          className="h-full rounded-full bg-forest-800"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-[12px] text-ink-500 tabular-nums">
          {Math.round(pct)}% paid · {paidCount} of {months.length} months
        </span>
        {months.length > ALWAYS_SHOW_UP_TO && (
          <button
            type="button"
            onClick={() => setShowSchedule((s) => !s)}
            aria-expanded={showSchedule}
            className="shrink-0 text-[12px] font-semibold text-forest-800"
          >
            {showSchedule ? "Hide schedule" : "Show schedule"}
          </button>
        )}
      </div>

      {(showSchedule || months.length <= ALWAYS_SHOW_UP_TO) && (
        <div className="mt-2 flex flex-wrap gap-1">
          {months.map((month) => {
            const paid = paidMonths.has(month);
            return (
              <button
                key={month}
                type="button"
                onClick={() =>
                  setOpenMonth((prev) => (prev === month ? null : month))
                }
                aria-pressed={openMonth === month}
                aria-label={`${formatMonthShort(month)}, ${paid ? "paid" : "unpaid"}`}
                className={`inline-flex min-h-11 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold transition-colors ${
                  paid
                    ? "bg-lime-200 text-forest-800"
                    : month === monthKey
                      ? "bg-warning-100 text-warning-600"
                      : "bg-cream-200 text-ink-500"
                } ${openMonth === month ? "ring-2 ring-forest-800" : ""}`}
              >
                {/* Colour alone carried paid-vs-unpaid, with a `title` as the only textual
                    fallback — and `title` does not exist on touch (C4a). */}
                {paid && <Check size={12} />}
                {formatMonthShort(month)}
              </button>
            );
          })}
        </div>
      )}

      {activeThisMonth && openMonth == null && (
        <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">
          {isPaidThisMonth ? (
            <form action={unpayPaylaterMonth}>
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="month" value={monthKey} />
              <SubmitButton className="btn btn-sm btn-ghost w-full">
                Undo this month&rsquo;s payment
              </SubmitButton>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setOpenMonth(monthKey)}
              className="btn btn-accent btn-sm w-full"
            >
              Pay this month
            </button>
          )}
        </div>
      )}

      {openMonth && (
        <div
          ref={panelRef}
          className="mt-3 space-y-2 rounded-[var(--radius-input)] bg-cream-100 p-3"
        >
          {paidMonths.has(openMonth) ? (
            <>
              <p className="text-[13px] text-ink-700">
                {formatMonthShort(openMonth)} paid —{" "}
                <strong className="tabular-nums">
                  {formatRupiah(item.monthly_amount)}
                </strong>
              </p>
              <form action={unpayPaylaterMonth}>
                <input type="hidden" name="item_id" value={item.id} />
                <input type="hidden" name="month" value={openMonth} />
                <SubmitButton className="btn btn-sm btn-ghost">
                  Undo this payment
                </SubmitButton>
              </form>
            </>
          ) : (
            <form action={payPaylaterMonth} className="space-y-2">
              <input type="hidden" name="item_id" value={item.id} />
              <input type="hidden" name="month" value={openMonth} />

              <div className="label">Pay {formatMonthShort(openMonth)}</div>

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
                Mark paid — don&rsquo;t record an expense
              </SubmitButton>
            </form>
          )}

          <button
            type="button"
            onClick={() => setOpenMonth(null)}
            className="btn btn-sm btn-ghost w-full text-ink-500"
          >
            Close
          </button>
        </div>
      )}

      {confirmingDelete && (
        <div className="mt-3 rounded-[var(--radius-input)] bg-negative-100 p-3">
          <p className="text-[13px] text-negative-600">
            Delete <strong>{item.item}</strong>?{" "}
            {/* Counted from every payment on record, not just the ones inside the current
                schedule — editing the range can leave paid months outside it, and the delete
                takes those with it too. */}
            {paidMonths.size > 0 ? (
              <>
                The {paidMonths.size}{" "}
                {paidMonths.size === 1 ? "expense" : "expenses"} it recorded{" "}
                {paidMonths.size === 1 ? "is" : "are"} deleted from your history
                too.
              </>
            ) : (
              "It has recorded nothing yet, so nothing else goes with it."
            )}{" "}
            This can&rsquo;t be undone.
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

/** The edit form. Split out so its `useActionState` is scoped to the form's own lifetime. */
function EditForm({
  item,
  providers,
  onDone,
}: {
  item: PaylaterItem;
  providers: PaylaterProvider[];
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(
    updatePaylaterItem.bind(null, item.id),
    EMPTY
  );
  const [first, setFirst] = useState(item.first_month_date.slice(0, 7));
  const [last, setLast] = useState(item.last_month_date.slice(0, 7));
  const lastNonce = useRef<number | undefined>(undefined);

  const backwards = Boolean(first && last && last < first);

  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    onDone();
  }, [state, onDone]);

  return (
    <form
      action={formAction}
      className="space-y-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
    >
      <div className="flex items-center justify-between">
        <span className="label">Edit installment</span>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancel edit"
          className="-m-2 p-2 text-ink-500"
        >
          <X size={18} />
        </button>
      </div>

      <label className="block">
        <span className="label mb-1 block">Item</span>
        <input
          name="item"
          defaultValue={item.item}
          required
          autoComplete="off"
          className="field"
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Per month</span>
        <MoneyInput
          name="monthly_amount"
          defaultValue={item.monthly_amount}
          ariaLabel="Amount per month"
        />
      </label>

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
        className={`text-[13px] ${
          backwards ? "font-medium text-negative-600" : "text-ink-500"
        }`}
        role={backwards ? "alert" : undefined}
      >
        {backwards
          ? "Last month can't be before the first."
          : "The month the first and last payments are due."}
      </p>

      <label className="block">
        <span className="label mb-1 block">Provider</span>
        <select
          name="provider_id"
          defaultValue={item.provider_id ?? ""}
          className="field"
        >
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
          defaultValue={item.note ?? ""}
          placeholder="Optional"
          autoComplete="off"
          className="field"
        />
      </label>

      <p className="text-[13px] text-ink-500">
        Months you&rsquo;ve already paid keep the expense they created. Only
        future months use the new amount.
      </p>

      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-negative-100 px-3 py-2 text-[13px] font-medium text-negative-600"
        >
          {state.error}
        </p>
      )}

      <SubmitButton
        className="btn btn-primary btn-sm w-full"
        pendingChildren="Saving…"
        disabled={backwards}
      >
        Save changes
      </SubmitButton>
    </form>
  );
}

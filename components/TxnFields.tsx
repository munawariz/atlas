"use client";

import { useEffect, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import OptionPicker from "@/components/OptionPicker";
import { formatNumber, todayISO } from "@/lib/format";
import {
  TXN_TYPES,
  TYPE_TO_CATEGORY_KIND,
  type Category,
  type Transaction,
  type TxnType,
  type Wallet,
} from "@/lib/types";

/**
 * The shared transaction editor, used by both Add and Edit.
 *
 * Every value is submitted through a hidden input, so the parent only needs
 * `<form action={…}>` — it never has to lift or thread state.
 */

const LAST_KEY = "ft_last";

const NO_WALLETS = "No wallets yet. Add one under More → Wallets.";

/**
 * Per-type accent. The design system ships two brand hues, so the six ledger types borrow the
 * derived semantic ramp: money out reads negative, money in reads positive, and the three
 * "moved, not spent" types take the neutral/info/accent slots.
 */
export const TYPE_ACCENT: Record<TxnType, { on: string; dot: string }> = {
  expense: { on: "bg-negative-500 text-white border-negative-500", dot: "bg-negative-500" },
  income: { on: "bg-positive-500 text-white border-positive-500", dot: "bg-positive-500" },
  saving: { on: "bg-info-500 text-white border-info-500", dot: "bg-info-500" },
  investment: { on: "bg-forest-800 text-white border-forest-800", dot: "bg-forest-800" },
  transfer: { on: "bg-warning-500 text-forest-900 border-warning-500", dot: "bg-warning-500" },
  withdrawal: { on: "bg-info-600 text-white border-info-600", dot: "bg-info-600" },
};

/** Section labels change per type so the form reads as a sentence rather than a schema. */
export function categoryLabel(type: TxnType): string {
  if (type === "saving" || type === "investment") return "Goes to";
  if (type === "withdrawal") return "Take from";
  return "Category";
}

export function walletLabel(type: TxnType): string {
  if (type === "expense") return "Paid from";
  if (type === "income" || type === "withdrawal") return "Received in";
  return "From wallet";
}

/**
 * The hero amount shrinks as the number grows, inside a FIXED-HEIGHT slot — so the card never
 * resizes and the layout never jumps mid-entry.
 */
export function amountFontSize(text: string): number {
  const n = text.length;
  if (n <= 7) return 42;
  if (n <= 9) return 36;
  if (n <= 11) return 30;
  if (n <= 13) return 25;
  return 21;
}

interface TxnFieldsProps {
  wallets: Wallet[];
  categories: Category[];
  /** Editing an existing row. Omit for Add. */
  initial?: Transaction;
  /**
   * Add only: restore the last-used type and wallets from localStorage on mount, and write
   * them back on change. Amount, description and category are deliberately never persisted.
   */
  persist?: boolean;
}

export default function TxnFields({
  wallets,
  categories,
  initial,
  persist = false,
}: TxnFieldsProps) {
  const [type, setType] = useState<TxnType>(initial?.type ?? "expense");
  const [amount, setAmount] = useState(
    initial ? formatNumber(initial.amount) : ""
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initial?.category_id ?? null
  );
  const [sourceWalletId, setSourceWalletId] = useState<number | null>(
    initial?.source_wallet_id ?? null
  );
  const [destWalletId, setDestWalletId] = useState<number | null>(
    initial?.dest_wallet_id ?? null
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [occurredOn, setOccurredOn] = useState(
    initial?.occurred_on ?? todayISO()
  );
  const [hydrated, setHydrated] = useState(false);

  // --- Restore, THEN persist -------------------------------------------------
  // Gated on `hydrated` because StrictMode double-invokes effects: without the flag the
  // second pass writes the freshly-mounted defaults back over the saved value (ATLAS.md §14.8).
  useEffect(() => {
    if (!persist) return;
    setOccurredOn(todayISO());
    try {
      const raw = localStorage.getItem(LAST_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as {
          type?: TxnType;
          sourceWalletId?: number | null;
          destWalletId?: number | null;
        };
        if (saved.type && TXN_TYPES.some((t) => t.value === saved.type)) {
          setType(saved.type);
        }
        if (saved.sourceWalletId != null) setSourceWalletId(saved.sourceWalletId);
        if (saved.destWalletId != null) setDestWalletId(saved.destWalletId);
      }
    } catch {
      // Corrupt or unavailable storage just means we start from the defaults.
    }
    setHydrated(true);
  }, [persist]);

  useEffect(() => {
    if (!persist || !hydrated) return;
    try {
      localStorage.setItem(
        LAST_KEY,
        JSON.stringify({ type, sourceWalletId, destWalletId })
      );
    } catch {
      // Non-fatal: the form still works, it just will not pre-fill next time.
    }
  }, [persist, hydrated, type, sourceWalletId, destWalletId]);

  // --- Derived ---------------------------------------------------------------
  const kind = TYPE_TO_CATEGORY_KIND[type];
  const visibleCategories = categories.filter((c) => {
    if (type === "transfer") return false;
    // A withdrawal draws from either bucket kind, so it shows both.
    if (type === "withdrawal") return c.kind === "saving" || c.kind === "investment";
    return c.kind === kind;
  });

  const showCategory = type !== "transfer";
  const showSource = type === "expense" || type === "saving" || type === "investment";
  const showDest = type === "income" || type === "withdrawal";
  const isTransfer = type === "transfer";
  const noteLabel =
    type === "saving" || type === "investment" || type === "withdrawal"
      ? "Note"
      : "Description";

  function changeType(next: TxnType) {
    setType(next);
    // The old category almost certainly belongs to the wrong kind now.
    setCategoryId(null);
  }

  const amountText = amount || "0";

  return (
    <div className="space-y-5">
      {/* --- Type pills ----------------------------------------------------- */}
      <div className="-mx-4 overflow-x-auto px-4 no-scrollbar">
        <div className="flex w-max gap-2">
          {TXN_TYPES.map((option) => {
            const active = option.value === type;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => changeType(option.value)}
                aria-pressed={active}
                className={`chip ${active ? TYPE_ACCENT[option.value].on : ""}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- Hero amount ---------------------------------------------------- */}
      <div className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center shadow-[var(--shadow-sm)]">
        <div className="label mb-2">Amount</div>
        <div className="flex h-[52px] items-center justify-center gap-2">
          <span className="font-display text-[20px] font-bold text-ink-300">
            Rp
          </span>
          <input
            value={amount}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "");
              setAmount(raw ? formatNumber(parseInt(raw, 10)) : "");
            }}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            aria-label="Amount in rupiah"
            style={{ fontSize: `${amountFontSize(amountText)}px` }}
            className="w-full max-w-[280px] border-0 bg-transparent p-0 text-center font-display font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums outline-none placeholder:text-ink-200"
          />
        </div>
      </div>

      {/* --- Category ------------------------------------------------------- */}
      {showCategory && (
        <OptionPicker
          label={categoryLabel(type)}
          options={visibleCategories}
          selected={categoryId}
          onSelect={setCategoryId}
          emptyMessage="No categories yet. Add one under More → Categories."
        />
      )}

      {/* --- Wallets -------------------------------------------------------- */}
      {isTransfer ? (
        <>
          <OptionPicker
            label="From"
            options={wallets}
            selected={sourceWalletId}
            onSelect={setSourceWalletId}
            emptyMessage={NO_WALLETS}
          />
          <OptionPicker
            label="To"
            options={wallets}
            selected={destWalletId}
            onSelect={setDestWalletId}
            emptyMessage={NO_WALLETS}
          />
        </>
      ) : showDest ? (
        <OptionPicker
          label={walletLabel(type)}
          options={wallets}
          selected={destWalletId}
          onSelect={setDestWalletId}
          emptyMessage={NO_WALLETS}
        />
      ) : showSource ? (
        <OptionPicker
          label={walletLabel(type)}
          options={wallets}
          selected={sourceWalletId}
          onSelect={setSourceWalletId}
          emptyMessage={NO_WALLETS}
        />
      ) : null}

      {/* --- Transfer admin fee (Add only — Edit sees the fee as its own row) - */}
      {isTransfer && !initial && (
        <section>
          <label htmlFor="txn-admin-fee" className="label mb-2 block">
            Admin fee
          </label>
          <MoneyInput
            id="txn-admin-fee"
            name="admin_fee"
            placeholder="Optional"
            ariaLabel="Admin fee in rupiah"
          />
          <p className="mt-1.5 text-[12px] text-ink-500">
            Booked as a separate expense from the “From” wallet, using your
            admin-fee category (More → Settings).
          </p>
        </section>
      )}

      {/* --- Note + date ---------------------------------------------------- */}
      <section className="space-y-3">
        <div>
          <label htmlFor="txn-description" className="label mb-2 block">
            {noteLabel}
          </label>
          <input
            id="txn-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            autoComplete="off"
            className="field"
          />
        </div>
        <div>
          <label htmlFor="txn-date" className="label mb-2 block">
            Date
          </label>
          <input
            id="txn-date"
            type="date"
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="field"
          />
        </div>
      </section>

      {/* --- Hidden inputs: the actual form payload ------------------------- */}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="amount" value={amount} />
      <input type="hidden" name="category_id" value={categoryId ?? ""} />
      <input type="hidden" name="source_wallet_id" value={sourceWalletId ?? ""} />
      <input type="hidden" name="dest_wallet_id" value={destWalletId ?? ""} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="occurred_on" value={occurredOn} />
    </div>
  );
}


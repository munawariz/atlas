"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MoneyInput from "@/components/MoneyInput";
import SubmitButton from "@/components/SubmitButton";
import { X } from "@/components/icons";
import {
  TYPE_ACCENT,
  amountFontSize,
  categoryLabel,
  walletLabel,
} from "@/components/TxnFields";
import { addTransaction, type AddState } from "@/app/(app)/add/actions";
import { formatNumber, todayISO } from "@/lib/format";
import {
  TXN_TYPES,
  TYPE_TO_CATEGORY_KIND,
  type Category,
  type TxnType,
  type Wallet,
} from "@/lib/types";

/**
 * The staged Add flow, as a bottom sheet over whatever page you are on.
 *
 * The sheet grows one step at a time — type, then category (or the From wallet for a
 * transfer), then the wallet (or the To wallet), and only then the amount — so each tap
 * answers exactly one question. The date sits as a small row at the top because it is
 * almost always "today" and only occasionally edited.
 *
 * Submits the same `addTransaction` action as the /add page, which stays available as a
 * direct URL.
 */

const INITIAL: AddState = {};

export default function AddSheet({
  wallets,
  categories,
  open,
  onClose,
}: {
  wallets: Wallet[];
  categories: Category[];
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(addTransaction, INITIAL);

  const [type, setType] = useState<TxnType | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [sourceWalletId, setSourceWalletId] = useState<number | null>(null);
  const [destWalletId, setDestWalletId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [occurredOn, setOccurredOn] = useState(todayISO());

  const [toast, setToast] = useState<string | null>(null);
  const lastNonce = useRef<number | undefined>(undefined);
  const bodyRef = useRef<HTMLDivElement>(null);

  // A fresh flow every time the sheet opens — staged reveal only works from a blank slate.
  useEffect(() => {
    if (!open) return;
    setType(null);
    setCategoryId(null);
    setSourceWalletId(null);
    setDestWalletId(null);
    setAmount("");
    setDescription("");
    setOccurredOn(todayISO());
  }, [open]);

  // The sheet owns the screen while open: lock the page scroll, close on Escape.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  // Each answered step reveals the next below the fold — keep it in view as the sheet grows.
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() =>
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    );
    return () => cancelAnimationFrame(raf);
  }, [open, type, categoryId, sourceWalletId, destWalletId]);

  // Success: toast, close, and refresh the page underneath — unlike the /add flow there is
  // no navigation to re-render the numbers this row just changed.
  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    setToast(state.savedLabel ?? "Saved");
    router.refresh();
    onClose();
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [state, router, onClose]);

  // --- Steps -----------------------------------------------------------------
  const isTransfer = type === "transfer";
  const kind = type ? TYPE_TO_CATEGORY_KIND[type] : null;
  const visibleCategories =
    !type || isTransfer
      ? []
      : type === "withdrawal"
        ? categories.filter((c) => c.kind === "saving" || c.kind === "investment")
        : categories.filter((c) => c.kind === kind);

  const showCategoryStep = type !== null && !isTransfer;
  const walletIsDest = type === "income" || type === "withdrawal";
  const showWalletStep = isTransfer || (showCategoryStep && categoryId !== null);
  const showToStep = isTransfer && sourceWalletId !== null;
  const detailsReady =
    type !== null &&
    (isTransfer
      ? sourceWalletId !== null && destWalletId !== null
      : categoryId !== null &&
        (walletIsDest ? destWalletId !== null : sourceWalletId !== null));

  function changeType(next: TxnType) {
    setType(next);
    // Everything downstream almost certainly belongs to the wrong type now.
    setCategoryId(null);
    setSourceWalletId(null);
    setDestWalletId(null);
  }

  function chooseFrom(id: number) {
    setSourceWalletId(id);
    if (destWalletId === id) setDestWalletId(null);
  }

  const amountText = amount || "0";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Add a transaction"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <form
            action={formAction}
            className="absolute inset-x-0 bottom-0 mx-auto flex max-h-[90dvh] max-w-md flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            <div className="flex items-center gap-2 px-5 pb-2 pt-4">
              <h2 className="min-w-0 flex-1 truncate font-display text-[18px] font-bold text-ink-900">
                Add a transaction
              </h2>
              {/* Date, compact in the top-right corner. Almost always "today". */}
              <input
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                aria-label="Date"
                className="h-9 w-1/3 shrink-0 rounded-[var(--radius-button)] border-0 bg-cream-100 px-2.5 text-[13px] font-semibold text-ink-900"
              />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-m-2 p-2 text-ink-500"
              >
                <X size={20} />
              </button>
            </div>

            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
              {/* --- Step 1: type ------------------------------------------ */}
              <section className="mb-4">
                <div className="label mb-2">What is it?</div>
                <div className="flex flex-wrap gap-2">
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
              </section>

              {/* --- Step 2: category (or From wallet for transfers) ------- */}
              {showCategoryStep && (
                <ChoiceGrid
                  label={categoryLabel(type!)}
                  options={visibleCategories}
                  selected={categoryId}
                  onSelect={setCategoryId}
                  emptyMessage="No categories yet. Add one under More → Categories."
                />
              )}
              {isTransfer && (
                <ChoiceGrid
                  label="From"
                  options={wallets}
                  selected={sourceWalletId}
                  onSelect={chooseFrom}
                  emptyMessage="No wallets yet. Add one under More → Wallets."
                />
              )}

              {/* --- Step 3: wallet (or To wallet for transfers) ----------- */}
              {showWalletStep && !isTransfer && (
                <ChoiceGrid
                  label={walletLabel(type!)}
                  options={wallets}
                  selected={walletIsDest ? destWalletId : sourceWalletId}
                  onSelect={walletIsDest ? setDestWalletId : setSourceWalletId}
                  emptyMessage="No wallets yet. Add one under More → Wallets."
                />
              )}
              {showToStep && (
                <ChoiceGrid
                  label="To"
                  options={wallets.filter((w) => w.id !== sourceWalletId)}
                  selected={destWalletId}
                  onSelect={setDestWalletId}
                  emptyMessage="No other wallet to move to. Add one under More → Wallets."
                />
              )}

              {/* --- Step 4: the amount, last ------------------------------ */}
              {detailsReady && (
                <div style={{ animation: "pop 0.22s var(--ease-standard) both" }}>
                  <section className="mb-4 rounded-[var(--radius-card)] bg-cream-100 px-5 py-5 text-center">
                    <div className="label mb-2">Amount</div>
                    <div className="flex h-[48px] items-center justify-center gap-2">
                      <span className="font-display text-[18px] font-bold text-ink-300">
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
                        autoFocus
                        placeholder="0"
                        aria-label="Amount in rupiah"
                        style={{ fontSize: `${amountFontSize(amountText)}px` }}
                        className="w-full max-w-[240px] border-0 bg-transparent p-0 text-center font-display font-extrabold tracking-[-0.03em] text-ink-900 tabular-nums outline-none placeholder:text-ink-200"
                      />
                    </div>
                  </section>

                  {isTransfer && (
                    <section className="mb-4">
                      <label htmlFor="sheet-admin-fee" className="label mb-2 block">
                        Admin fee
                      </label>
                      <MoneyInput
                        id="sheet-admin-fee"
                        name="admin_fee"
                        placeholder="Optional"
                        ariaLabel="Admin fee in rupiah"
                      />
                      <p className="mt-1.5 text-[12px] text-ink-500">
                        Booked as a separate expense from the “From” wallet, using
                        your admin-fee category (More → Settings).
                      </p>
                    </section>
                  )}

                  <section className="mb-4">
                    <label htmlFor="sheet-description" className="label mb-2 block">
                      {type === "saving" ||
                      type === "investment" ||
                      type === "withdrawal"
                        ? "Note"
                        : "Description"}
                    </label>
                    <input
                      id="sheet-description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Optional"
                      autoComplete="off"
                      className="field"
                    />
                  </section>

                  {state.error && (
                    <p
                      role="alert"
                      className="mb-4 rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
                    >
                      {state.error}
                    </p>
                  )}

                  <SubmitButton pendingChildren="Saving…">Save</SubmitButton>
                </div>
              )}

              {/* --- Hidden inputs: the actual form payload ---------------- */}
              <input type="hidden" name="type" value={type ?? ""} />
              <input type="hidden" name="amount" value={amount} />
              <input type="hidden" name="category_id" value={categoryId ?? ""} />
              <input
                type="hidden"
                name="source_wallet_id"
                value={sourceWalletId ?? ""}
              />
              <input
                type="hidden"
                name="dest_wallet_id"
                value={destWalletId ?? ""}
              />
              <input type="hidden" name="description" value={description} />
              <input type="hidden" name="occurred_on" value={occurredOn} />
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className="pointer-events-none fixed inset-x-0 bottom-28 z-40 flex justify-center px-4"
        >
          <span
            className="inline-flex items-center gap-2 rounded-full bg-forest-800 px-5 py-2.5 text-[14px] font-semibold text-white"
            style={{
              animation: "pop 0.22s cubic-bezier(0.2, 0.8, 0.2, 1) both",
              boxShadow: "var(--shadow-float)",
            }}
          >
            {toast}
          </span>
        </div>
      )}
    </>
  );
}

/** One step's options: a tidy two-column grid, selected item in solid forest. */
function ChoiceGrid({
  label,
  options,
  selected,
  onSelect,
  emptyMessage,
}: {
  label: string;
  options: { id: number; name: string }[];
  selected: number | null;
  onSelect: (id: number) => void;
  emptyMessage: string;
}) {
  return (
    <section
      className="mb-4"
      style={{ animation: "pop 0.22s var(--ease-standard) both" }}
    >
      <div className="label mb-2">{label}</div>
      {options.length === 0 ? (
        <p className="text-[14px] text-ink-500">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {options.map((option) => {
            const active = selected === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                aria-pressed={active}
                className={`flex h-11 items-center justify-center rounded-[var(--radius-input)] border px-3 text-[14px] transition-colors ${
                  active
                    ? "border-forest-800 bg-forest-800 font-semibold text-white"
                    : "border-[var(--border-default)] bg-white font-medium text-ink-700 hover:border-forest-800 hover:text-forest-800"
                }`}
              >
                <span className="truncate">{option.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

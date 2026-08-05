"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { X } from "@/components/icons";
import { TYPE_ACCENT, amountFontSize, walletLabel } from "@/components/TxnFields";
import { addTransaction, type AddState } from "@/app/(app)/actions";
import { formatNumber, todayISO } from "@/lib/format";
import type { Category, TxnType, Wallet } from "@/lib/types";

/**
 * Moving money, as a staged bottom sheet — the counterpart to AddSheet for the two types
 * that shuffle money around rather than record it:
 *
 * - transfer:   wallet → wallet, with an optional admin fee booked as its own expense.
 * - withdrawal: saving/investment bucket → wallet ("Withdraw").
 *
 * Same skeleton as AddSheet: each answered step reveals the next, the amount comes last,
 * and a successful save toasts + refreshes the page underneath.
 */

const INITIAL: AddState = {};

const MOVE_TYPES: { value: TxnType; label: string }[] = [
  { value: "transfer", label: "Transfer" },
  { value: "withdrawal", label: "Withdraw" },
];

export default function MoveSheet({
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

  // Swipe between Transfer and Withdraw: a horizontal swipe anywhere on the sheet
  // steps to the neighbouring type, mirroring AddSheet's tab swipe.
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  // A fresh flow every time the sheet opens.
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

  // Keep the newest revealed step in view as the sheet grows.
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() =>
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
    );
    return () => cancelAnimationFrame(raf);
  }, [open, type, categoryId, sourceWalletId, destWalletId]);

  // Success: toast and close — the action's layout revalidate already re-rendered the page
  // underneath in the same POST response.
  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    setToast(state.savedLabel ?? "Saved");
    onClose();
  }, [state, onClose]);

  // The dismiss timer lives in its own effect, keyed only by the toast. Sharing the
  // success effect would let its cleanup (onClose gets a new identity when the parent
  // re-renders) clear the timer before it ever fires, stranding the toast on screen.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  // --- Steps -----------------------------------------------------------------
  const isTransfer = type === "transfer";
  const isWithdrawal = type === "withdrawal";
  // A withdrawal draws from either bucket kind.
  const buckets = categories.filter(
    (c) => !c.archived && (c.kind === "saving" || c.kind === "investment")
  );

  const showFromStep = isTransfer;
  const showBucketStep = isWithdrawal;
  const showToStep = isTransfer
    ? sourceWalletId !== null
    : isWithdrawal
      ? categoryId !== null
      : false;
  const detailsReady =
    type !== null &&
    destWalletId !== null &&
    (isTransfer ? sourceWalletId !== null : categoryId !== null);

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

  function onSheetTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function onSheetTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || type === null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    // A deliberate sideways swipe only: far enough, and clearly more horizontal than
    // the vertical scroll gesture the sheet body already owns.
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const index = MOVE_TYPES.findIndex((option) => option.value === type);
    const next = index + (dx < 0 ? 1 : -1);
    if (next < 0 || next >= MOVE_TYPES.length) return;
    changeType(MOVE_TYPES[next].value);
  }

  const amountText = amount || "0";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-50"
          role="dialog"
          aria-modal="true"
          aria-label="Move money"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />

          <form
            action={formAction}
            onTouchStart={onSheetTouchStart}
            onTouchEnd={onSheetTouchEnd}
            className="absolute inset-x-0 bottom-0 mx-auto flex min-h-[50dvh] max-h-[80dvh] max-w-md flex-col rounded-t-[var(--radius-card-lg)] bg-white safe-bottom"
            style={{
              boxShadow: "var(--shadow-float)",
              animation: "rise 0.34s var(--ease-standard) both",
            }}
          >
            <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-4">
              <h2 className="min-w-0 flex-1 truncate font-display text-[18px] font-bold text-ink-900">
                Move money
              </h2>
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
              {/* --- Step 1: transfer or withdraw. Borderless labels, one gliding
                     pill — and a sideways swipe anywhere flips between them. ---- */}
              <section className="mb-4">
                <div className="label mb-2">What are you doing?</div>
                <PillSwitcher<TxnType>
                  options={MOVE_TYPES.map((option) => ({
                    key: option.value,
                    label: option.label,
                    pillClassName: TYPE_ACCENT[option.value].pill,
                    activeTextClassName: TYPE_ACCENT[option.value].onText,
                  }))}
                  value={type}
                  onChange={changeType}
                  ariaLabel="What are you doing?"
                  bordered={false}
                  sizeClassName="h-[38px] px-4 text-[14px]"
                  gapClassName="gap-1"
                />
              </section>

              {/* --- Step 2: where the money comes from -------------------- */}
              {showFromStep && (
                <ChoiceGrid
                  label="From"
                  options={wallets}
                  selected={sourceWalletId}
                  onSelect={chooseFrom}
                  emptyMessage="No wallets yet. Add one under More → Wallets."
                />
              )}
              {showBucketStep && (
                <ChoiceGrid
                  label="Take from"
                  options={buckets}
                  selected={categoryId}
                  onSelect={setCategoryId}
                  emptyMessage="No saving or investment buckets yet. Add one under More → Categories."
                />
              )}

              {/* --- Step 3: the wallet the money lands in ----------------- */}
              {showToStep && (
                <ChoiceGrid
                  label={isTransfer ? "To" : walletLabel("withdrawal")}
                  options={
                    isTransfer
                      ? wallets.filter((w) => w.id !== sourceWalletId)
                      : wallets
                  }
                  selected={destWalletId}
                  onSelect={setDestWalletId}
                  emptyMessage={
                    isTransfer
                      ? "No other wallet to move to. Add one under More → Wallets."
                      : "No wallets yet. Add one under More → Wallets."
                  }
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
                      <label htmlFor="move-admin-fee" className="label mb-2 block">
                        Admin fee
                      </label>
                      <MoneyInput
                        id="move-admin-fee"
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
                    <label htmlFor="move-description" className="label mb-2 block">
                      Note
                    </label>
                    <input
                      id="move-description"
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

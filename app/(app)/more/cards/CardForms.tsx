"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import FormSheet from "@/components/FormSheet";
import MoneyInput from "@/components/MoneyInput";
import PillSwitcher from "@/components/PillSwitcher";
import SubmitButton from "@/components/SubmitButton";
import { formatRupiah, todayISO } from "@/lib/format";
import {
  CARD_DEFAULTS,
  CARD_PRESETS,
  type CardPreset,
  type CreditCard,
} from "@/lib/types";
import {
  addCreditCard,
  chargeCreditCard,
  payCreditCard,
  updateCreditCard,
  type CardState,
} from "./actions";

const INITIAL: CardState = {};

interface Option {
  id: number;
  name: string;
}

/** Calls `onSaved` once per successful save — the nonce tells a repeat success from a re-render. */
function useOnSaved(state: CardState, onSaved?: () => void) {
  const lastNonce = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    onSaved?.();
  }, [state, onSaved]);
}

function Feedback({ state, done }: { state: CardState; done?: string }) {
  return (
    <>
      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-negative-100 px-4 py-3 text-[14px] font-medium text-negative-600"
        >
          {state.error}
        </p>
      )}
      {done && state.ok && (
        <p
          role="status"
          className="rounded-[var(--radius-input)] bg-positive-100 px-4 py-3 text-[14px] font-medium text-positive-600"
        >
          {done}
        </p>
      )}
    </>
  );
}

// =============================================================================
// Terms — shared by add and edit
// =============================================================================

type TermValues = Pick<
  CreditCard,
  "interest_rate" | "min_pct" | "min_floor" | "admin_fee_pct" | "min_covers_charges" | "late_fee"
>;

function TermsFields({
  card,
  providers,
}: {
  card?: CreditCard;
  providers: Option[];
}) {
  const [values, setValues] = useState<TermValues>(() => ({
    ...CARD_DEFAULTS,
    admin_fee_pct: 0,
    ...(card ?? {}),
  }));
  // Filling from a preset remounts the fields below with its values as their defaults.
  const [version, setVersion] = useState(0);
  const [preset, setPreset] = useState<string | null>(null);

  const apply = (p: CardPreset) => {
    setValues((prev) => ({
      ...p.terms,
      // A personalised rate (Honest's admin fee) keeps whatever is already typed.
      admin_fee_pct: p.terms.admin_fee_pct ?? prev.admin_fee_pct,
    }));
    setPreset(p.key);
    setVersion((v) => v + 1);
  };

  return (
    <>
      <div>
        <span className="label mb-1 block">Fill terms from</span>
        <div className="flex flex-wrap gap-2">
          {CARD_PRESETS.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => apply(p)}
              aria-pressed={preset === p.key}
              className={`chip ${preset === p.key ? "chip-on" : ""}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="label mb-1 block">Credit limit</span>
        <MoneyInput
          name="credit_limit"
          defaultValue={card?.credit_limit}
          placeholder="Optional"
          ariaLabel="Credit limit"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label mb-1 block">Statement day</span>
          <input
            type="number"
            name="statement_day"
            min={1}
            max={31}
            defaultValue={card?.statement_day}
            placeholder="e.g. 17"
            required
            className="field"
          />
        </label>
        <label className="block">
          <span className="label mb-1 block">Due day</span>
          <input
            type="number"
            name="due_day"
            min={1}
            max={31}
            defaultValue={card?.due_day}
            placeholder="e.g. 5"
            required
            className="field"
          />
        </label>
      </div>
      <p className="text-[13px] text-ink-500">
        Both are printed on your bill. The due date is the first due day after the statement.
      </p>

      <div key={version} className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <label className="block">
            <span className="label mb-1 block">Interest %/mo</span>
            <input
              name="interest_rate"
              inputMode="decimal"
              defaultValue={values.interest_rate}
              required
              className="field text-right tabular-nums"
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Minimum %</span>
            <input
              name="min_pct"
              inputMode="decimal"
              defaultValue={values.min_pct}
              required
              className="field text-right tabular-nums"
            />
          </label>
          <label className="block">
            <span className="label mb-1 block">Min. at least</span>
            <MoneyInput
              name="min_floor"
              defaultValue={values.min_floor}
              ariaLabel="Smallest minimum payment"
            />
          </label>
        </div>

        <label className="block">
          <span className="label mb-1 block">Admin fee %/mo</span>
          <input
            name="admin_fee_pct"
            inputMode="decimal"
            defaultValue={values.admin_fee_pct}
            className="field text-right tabular-nums"
          />
          <span className="mt-1 block text-[13px] text-ink-500">
            Charged on each statement&apos;s spending and refunded when you pay that bill in full
            on time. Honest sets it per customer (0–6.49%) — copy yours from a statement. 0 for
            most banks.
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="min_covers_charges"
            defaultChecked={values.min_covers_charges}
            className="mt-1 h-4 w-4"
          />
          <span className="text-[14px] text-ink-700">
            The minimum is at least the bill&apos;s interest and fees
            <span className="block text-[13px] text-ink-500">
              Honest works this way: the minimum is whichever is highest of the percent above,
              the interest plus admin fee, or the floor.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="late_fee"
            defaultChecked={values.late_fee}
            className="mt-1 h-4 w-4"
          />
          <span className="text-[14px] text-ink-700">
            Missing the minimum costs a late fee
            <span className="block text-[13px] text-ink-500">
              1% of the bill, at most Rp 100,000. Honest charges none.
            </span>
          </span>
        </label>
      </div>

      {providers.length > 0 && (
        <label className="block">
          <span className="label mb-1 block">Installments on this card</span>
          <select
            name="provider_id"
            defaultValue={card?.provider_id ?? ""}
            className="field"
          >
            <option value="">None</option>
            {providers.map((p) => (
              <option key={p.id} value={String(p.id)}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[13px] text-ink-500">
            Shown on the bill so you see the full amount the bank asks for. You still pay them
            on My Installment.
          </span>
        </label>
      )}
    </>
  );
}

// =============================================================================
// Add
// =============================================================================

export function AddCardSheet({
  wallets,
  providers,
}: {
  /** Wallets that are not already cards — candidates to turn into one. */
  wallets: Option[];
  providers: Option[];
}) {
  return (
    <FormSheet triggerLabel="Add a card" title="Add a credit card">
      {(close) => <AddCardForm wallets={wallets} providers={providers} onSaved={close} />}
    </FormSheet>
  );
}

function AddCardForm({
  wallets,
  providers,
  onSaved,
}: {
  wallets: Option[];
  providers: Option[];
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(addCreditCard, INITIAL);
  const [existing, setExisting] = useState("");
  useOnSaved(state, onSaved);

  return (
    <form action={formAction} className="space-y-3">
      {!existing && (
        <label className="block">
          <span className="label mb-1 block">Card name</span>
          <input
            name="name"
            placeholder="e.g. BCA Visa"
            autoComplete="off"
            className="field"
          />
        </label>
      )}

      {wallets.length > 0 && (
        <label className="block">
          <span className="label mb-1 block">Existing wallet</span>
          <select
            name="wallet_id"
            value={existing}
            onChange={(e) => setExisting(e.target.value)}
            className="field"
          >
            <option value="">No — create a new wallet for it</option>
            {wallets.map((w) => (
              <option key={w.id} value={String(w.id)}>
                {w.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[13px] text-ink-500">
            Only if you already log this card&apos;s purchases against a wallet.
          </span>
        </label>
      )}

      <TermsFields providers={providers} />

      <Feedback state={state} />
      <SubmitButton pendingChildren="Adding…">Add card</SubmitButton>
    </form>
  );
}

// =============================================================================
// Edit
// =============================================================================

export function EditCardForm({
  card,
  providers,
}: {
  card: CreditCard;
  providers: Option[];
}) {
  const [state, formAction] = useActionState(
    updateCreditCard.bind(null, card.id),
    INITIAL
  );

  return (
    <form action={formAction} className="space-y-3">
      <TermsFields card={card} providers={providers} />
      <Feedback state={state} done="Saved." />
      <SubmitButton pendingChildren="Saving…">Save terms</SubmitButton>
    </form>
  );
}

// =============================================================================
// Pay
// =============================================================================

export interface PayPreset {
  label: string;
  amount: number;
}

export function PayCardSheet({
  cardId,
  wallets,
  presets,
}: {
  cardId: number;
  /** Cash wallets only — a card is not paid from another card. */
  wallets: Option[];
  presets: PayPreset[];
}) {
  return (
    <FormSheet triggerLabel="Pay the card" title="Pay the card">
      {(close) => (
        <PayCardForm cardId={cardId} wallets={wallets} presets={presets} onSaved={close} />
      )}
    </FormSheet>
  );
}

function PayCardForm({
  cardId,
  wallets,
  presets,
  onSaved,
}: {
  cardId: number;
  wallets: Option[];
  presets: PayPreset[];
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(payCreditCard, INITIAL);
  // MoneyInput keeps its own text, so a preset remounts it with the new default.
  const [preset, setPreset] = useState<PayPreset | null>(null);
  useOnSaved(state, onSaved);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="card_id" value={cardId} />

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => setPreset(p)}
              aria-pressed={preset?.label === p.label}
              className={`chip ${preset?.label === p.label ? "chip-on" : ""}`}
            >
              {p.label} · {formatRupiah(p.amount)}
            </button>
          ))}
        </div>
      )}

      <label className="block">
        <span className="label mb-1 block">Amount paid</span>
        <MoneyInput
          key={preset?.label ?? "custom"}
          name="amount"
          defaultValue={preset?.amount}
          ariaLabel="Amount paid"
        />
      </label>

      <label className="block">
        <span className="label mb-1 block">Paid from</span>
        <select name="wallet_id" defaultValue="" className="field">
          <option value="">Which wallet?</option>
          {wallets.map((w) => (
            <option key={w.id} value={String(w.id)}>
              {w.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="label mb-1 block">Date</span>
        <input type="date" name="occurred_on" defaultValue={todayISO()} className="field" />
      </label>

      <p className="text-[13px] text-ink-500">
        Recorded as a transfer into the card, not an expense — the purchases were already
        counted as spending when you made them.
      </p>

      <Feedback state={state} />
      <SubmitButton pendingChildren="Saving…">Record payment</SubmitButton>
    </form>
  );
}

// =============================================================================
// Interest and fees
// =============================================================================

export function ChargeCardSheet({
  cardId,
  defaultDate,
  suggestedInterest,
  suggestedFee,
}: {
  cardId: number;
  /** The latest statement date — where the bank posts both. */
  defaultDate: string;
  /** The app's own estimates, offered as a starting point; 0 when there is nothing to add. */
  suggestedInterest: number;
  suggestedFee: number;
}) {
  return (
    <FormSheet triggerLabel="Interest or fee" title="Record interest or a fee">
      {(close) => (
        <ChargeCardForm
          cardId={cardId}
          defaultDate={defaultDate}
          suggestedInterest={suggestedInterest}
          suggestedFee={suggestedFee}
          onSaved={close}
        />
      )}
    </FormSheet>
  );
}

function ChargeCardForm({
  cardId,
  defaultDate,
  suggestedInterest,
  suggestedFee,
  onSaved,
}: {
  cardId: number;
  defaultDate: string;
  suggestedInterest: number;
  suggestedFee: number;
  onSaved: () => void;
}) {
  const [state, formAction] = useActionState(chargeCreditCard, INITIAL);
  const [kind, setKind] = useState<"interest" | "fee">(
    suggestedInterest === 0 && suggestedFee > 0 ? "fee" : "interest"
  );
  const suggested = kind === "interest" ? suggestedInterest : suggestedFee;
  useOnSaved(state, onSaved);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="card_id" value={cardId} />
      <input type="hidden" name="kind" value={kind} />

      <PillSwitcher<"interest" | "fee">
        options={[
          { key: "interest", label: "Interest" },
          { key: "fee", label: "Fee" },
        ]}
        value={kind}
        onChange={setKind}
        ariaLabel="Charge type"
        grow
      />

      <label className="block">
        <span className="label mb-1 block">
          {kind === "interest" ? "Interest on the bill" : "Fee on the bill"}
        </span>
        <MoneyInput key={kind} name="amount" ariaLabel="Amount" />
      </label>

      <label className="block">
        <span className="label mb-1 block">Date</span>
        <input type="date" name="occurred_on" defaultValue={defaultDate} className="field" />
      </label>

      <p className="text-[13px] text-ink-500">
        Copy the figure from your bill
        {suggested > 0 &&
          ` — this app estimated about ${formatRupiah(suggested)}, but the bank's number is the one that counts`}
        .{" "}
        {kind === "fee" &&
          "An admin fee that gets refunded because you paid in full isn't a cost — leave it out. "}
        It&apos;s charged to the card as an expense, so it adds to what you owe.
      </p>

      <Feedback state={state} />
      <SubmitButton pendingChildren="Saving…">
        {kind === "interest" ? "Record interest" : "Record fee"}
      </SubmitButton>
    </form>
  );
}

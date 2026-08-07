"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Plus, X } from "@/components/icons";
import { addCategory, addGroup, type ManageState } from "../actions";

/**
 * The add-a-thing forms on the Categories page.
 *
 * atlas-ux-review.md #5 put these inline, inside the section that already knows its kind, and
 * that reasoning still holds — but five permanently-open white boxes cost roughly 400px of form
 * chrome before the page reaches a single category. So they collapse to a one-line ghost row and
 * expand in place (atlas-ux-plan-manage-pages.md C2): same zero-scroll benefit, a fifth of the
 * resting weight. A `useState` toggle over a real `<button>` rather than `<details>`, matching
 * how `BudgetRow` already opens.
 *
 * On success the form closes and the URL jumps to the row that was just created, which lands at
 * the BOTTOM of its section in sort order — frequently off-screen. `.target-flash` rings it on
 * arrival (C3 part 3 / atlas-ux-review.md #5's missing half).
 */

const EMPTY: ManageState = {};

function AddForm({
  label,
  title,
  fieldLabel,
  placeholder,
  submitLabel,
  anchorPrefix,
  action,
  hidden,
}: {
  /** Ghost-row copy, e.g. "New expense category". */
  label: string;
  /** Accessible name for the expanded field. */
  title: string;
  fieldLabel: string;
  placeholder: string;
  submitLabel: string;
  /** DOM id prefix of the row this creates — `category` or `group`. */
  anchorPrefix: string;
  action: (prev: ManageState, formData: FormData) => Promise<ManageState>;
  hidden?: Record<string, string>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, EMPTY);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastNonce = useRef<number | undefined>(undefined);
  const fieldId = `${anchorPrefix}-new-${hidden?.kind ?? "name"}`;

  useEffect(() => {
    if (!state.ok || !state.nonce || state.nonce === lastNonce.current) return;
    lastNonce.current = state.nonce;
    setOpen(false);
    if (state.id != null) {
      // A real hash change, not history.replaceState — `:target` is what draws the ring, and
      // only a genuine navigation reliably re-evaluates it.
      window.location.hash = `${anchorPrefix}-${state.id}`;
    }
  }, [state, anchorPrefix]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          // Focus after the field exists; the state flush and the paint share a frame.
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className="mb-2 flex h-11 w-full items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border-default)] px-3 text-left text-[14px] font-semibold text-forest-800"
      >
        <Plus size={16} />
        {label}
      </button>
    );
  }

  return (
    <form
      action={formAction}
      className="mb-2 space-y-2 rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)]"
      style={{ animation: "pop 0.22s var(--ease-standard) both" }}
    >
      {Object.entries(hidden ?? {}).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <div className="flex items-center justify-between">
        <label htmlFor={fieldId} className="label">
          {fieldLabel}
        </label>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label={`Cancel — ${title}`}
          className="-m-2 p-2 text-ink-500"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          id={fieldId}
          ref={inputRef}
          name="name"
          placeholder={placeholder}
          required
          autoComplete="off"
          className="field flex-1"
        />
        <SubmitButton className="btn btn-primary shrink-0" pendingChildren="Adding…">
          {submitLabel}
        </SubmitButton>
      </div>

      {state.error && (
        <p
          role="alert"
          className="rounded-[var(--radius-input)] bg-negative-100 px-3 py-2 text-[13px] font-medium text-negative-600"
        >
          {state.error}
        </p>
      )}
    </form>
  );
}

export function AddGroupForm() {
  return (
    <AddForm
      label="New group"
      title="new group"
      fieldLabel="Group name"
      placeholder="Daily life"
      submitLabel="Add group"
      anchorPrefix="group"
      action={addGroup}
    />
  );
}

/** A placeholder is an example, not a label — so it has to be an example of the right kind. */
const KIND_EXAMPLE: Record<string, string> = {
  expense: "Groceries",
  income: "Salary",
  saving: "Emergency fund",
  investment: "Stocks",
};

export function AddCategoryForm({
  kind,
  kindLabel,
}: {
  kind: string;
  /** Lower-case kind noun, e.g. "expense" — the ghost row reads "New expense category". */
  kindLabel: string;
}) {
  return (
    <AddForm
      label={`New ${kindLabel} category`}
      title={`new ${kindLabel} category`}
      fieldLabel={`${kindLabel[0].toUpperCase()}${kindLabel.slice(1)} category name`}
      placeholder={KIND_EXAMPLE[kind] ?? "Groceries"}
      submitLabel="Add category"
      anchorPrefix="category"
      action={addCategory}
      hidden={{ kind }}
    />
  );
}

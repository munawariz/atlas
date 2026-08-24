"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Check, Pencil, X } from "@/components/icons";
import { setLoanDeadline } from "./actions";

/**
 * The deadline line on a one-payment loan card — display and edit in one control.
 *
 * A loan has no edit flow otherwise, so a deadline that could only be set at creation meant
 * a slipped date cost you the loan and its history. Only one-payment loans get this: a
 * monthly loan is paced by its schedule, which is why the add form does not offer it one.
 *
 * `label` arrives pre-formatted from the page so the year rule lives in exactly one place.
 */
export default function DeadlineEditor({
  loanId,
  deadline,
  label,
  overdue,
}: {
  loanId: number;
  deadline: string | null;
  /** Already formatted for display; null when no deadline is set. */
  label: string | null;
  overdue: boolean;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={label ? `Change deadline (${label})` : "Set a deadline"}
        className={`-ml-1 inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-[13px] tabular-nums transition-colors hover:bg-cream-100 ${
          overdue
            ? "font-semibold text-negative-600"
            : label
              ? "text-ink-500"
              : "text-ink-300"
        }`}
      >
        {label ? `${overdue ? "Overdue since" : "Due"} ${label}` : "Set a deadline"}
        <Pencil size={13} />
      </button>
    );
  }

  return (
    <div className="mt-1 space-y-1">
      {/* Mirrors ManageRow's rename row: the field, then commit and cancel as icon buttons. */}
      <form
        action={async (formData: FormData) => {
          await setLoanDeadline(loanId, formData);
          setEditing(false);
        }}
        className="flex items-center gap-2"
      >
        <input
          type="date"
          name="deadline"
          defaultValue={deadline ?? ""}
          autoFocus
          aria-label="Deadline"
          className="field h-11 flex-1"
        />
        <SubmitButton
          label="Save deadline"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] bg-forest-800 text-white"
        >
          <Check size={18} />
        </SubmitButton>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-button)] text-ink-500"
        >
          <X size={18} />
        </button>
      </form>

      {/* Clearing is the same write with an empty field — a separate form so it is one tap. */}
      {deadline && (
        <form
          action={async (formData: FormData) => {
            await setLoanDeadline(loanId, formData);
            setEditing(false);
          }}
        >
          <SubmitButton className="btn btn-sm btn-ghost text-ink-500">
            Clear deadline
          </SubmitButton>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Trash } from "@/components/icons";

/**
 * A delete action gated behind an inline "are you sure" confirmation panel — the same shape
 * ManageRow and PaylaterItemCard already use for categories/wallets/groups/paylater items,
 * shared here so every transaction-level delete (history rows, stock trades/dividends, bond
 * trades, forex conversions/accounts) gets the same safety net instead of wiring straight to a
 * bare submit button (atlas-ux-review.md #1).
 */
export default function ConfirmDeleteButton({
  action,
  message,
  variant = "row",
  triggerLabel,
  className,
  pendingLabel = "Deleting…",
}: {
  /** Bound server action (or useActionState dispatch) taking the confirm form's FormData. */
  action: (formData: FormData) => void | Promise<void>;
  /** Copy shown in the confirm panel — say what else the delete takes with it. */
  message: React.ReactNode;
  /**
   * "row" — a small icon-only trigger for a dense list row (stock/bond/forex rows).
   * "block" — a full-width labelled trigger for a standalone delete section (Edit sheets).
   */
  variant?: "row" | "block";
  /** Row-icon trigger's accessible label, e.g. "Delete BBCA trade". Required for variant="row". */
  triggerLabel?: string;
  className?: string;
  pendingLabel?: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="rounded-[var(--radius-input)] bg-negative-100 p-3">
        <p className="text-[13px] text-negative-600">{message}</p>
        <div className="mt-2 flex gap-2">
          <form action={action}>
            <SubmitButton
              className="btn btn-sm bg-negative-500 text-white"
              pendingChildren={pendingLabel}
            >
              Delete
            </SubmitButton>
          </form>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="btn btn-sm btn-ghost"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  if (variant === "block") {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={className ?? "btn btn-ghost w-full text-negative-600"}
      >
        <Trash size={18} />
        {triggerLabel ?? "Delete"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={triggerLabel}
      title={triggerLabel}
      className={
        className ??
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-negative-600"
      }
    >
      <Trash size={16} />
    </button>
  );
}

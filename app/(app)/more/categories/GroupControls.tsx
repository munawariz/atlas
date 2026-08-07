"use client";

import { useState } from "react";
import { X } from "@/components/icons";
import type { Category, CategoryKind } from "@/lib/types";

/**
 * The "Add a category…" dropdown on a group row. A select keeps the row compact however
 * many categories exist — only the group's MEMBERS render as chips; everything else waits
 * in here, grouped by kind. Submits on change (a picker with a separate commit step reads
 * as broken on a phone), then snaps back to the placeholder.
 */

const KIND_LABEL: Record<CategoryKind, string> = {
  expense: "Expense",
  income: "Income",
  saving: "Saving",
  investment: "Investment",
};

const KIND_ORDER: CategoryKind[] = ["expense", "income", "saving", "investment"];

/**
 * One member chip on a group row. Its whole function is *remove*, but it looks exactly like a
 * passive tag — a first-time user taps it expecting to open the category, and the removal is not
 * undoable in one action. So the first tap only arms it, and the armed state says what the
 * second tap will do (atlas-ux-plan-manage-pages.md, Categories UX #6).
 */
export function GroupMemberChip({
  name,
  groupName,
  dotClassName,
  onRemove,
}: {
  name: string;
  groupName: string;
  dotClassName: string;
  onRemove: () => void | Promise<void>;
}) {
  const [armed, setArmed] = useState(false);

  if (armed) {
    return (
      <span className="inline-flex items-center gap-1">
        <form action={onRemove}>
          <button
            type="submit"
            aria-label={`Confirm removing ${name} from ${groupName}`}
            className="inline-flex h-11 items-center gap-1.5 rounded-full bg-negative-100 px-3 text-[12px] font-semibold text-negative-600"
          >
            <X size={14} />
            Remove {name}?
          </button>
        </form>
        <button
          type="button"
          onClick={() => setArmed(false)}
          aria-label="Keep it"
          className="inline-flex h-11 items-center rounded-full px-2 text-[12px] font-semibold text-ink-500"
        >
          Keep
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setArmed(true)}
      aria-label={`Remove ${name} from ${groupName}`}
      className="inline-flex h-11 items-center gap-1.5 rounded-full bg-lime-200 px-3 text-[12px] font-semibold text-forest-800 transition-colors hover:bg-lime-300"
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName}`} />
      {name}
      <X size={14} />
    </button>
  );
}

export function GroupAddSelect({
  options,
  onAdd,
}: {
  options: Category[];
  onAdd: (formData: FormData) => void | Promise<void>;
}) {
  if (options.length === 0) return null;

  return (
    <form action={onAdd}>
      <select
        name="category_id"
        defaultValue=""
        aria-label="Add a category to this group"
        onChange={(e) => {
          if (!e.currentTarget.value) return;
          e.currentTarget.form?.requestSubmit();
          // Snap back so the control always reads as an action, not a value.
          e.currentTarget.value = "";
        }}
        className="field h-11 w-auto max-w-full py-0 text-[13px]"
      >
        <option value="" disabled>
          Add a category…
        </option>
        {KIND_ORDER.map((kind) => {
          const list = options.filter((c) => c.kind === kind);
          if (list.length === 0) return null;
          return (
            <optgroup key={kind} label={KIND_LABEL[kind]}>
              {list.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </optgroup>
          );
        })}
      </select>
    </form>
  );
}

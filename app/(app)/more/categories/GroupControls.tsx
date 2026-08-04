"use client";

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
        className="field h-9 w-auto max-w-full py-0 text-[13px]"
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

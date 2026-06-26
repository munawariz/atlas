"use client";

import type { Category } from "@/lib/types";
import SortableList from "@/components/SortableList";
import ManageRow from "../ManageRow";
import CategoryPeriodSelect from "./CategoryPeriodSelect";
import CategoryInstallmentToggle from "./CategoryInstallmentToggle";
import { GripIcon } from "@/components/icons";
import { deleteCategory, renameCategory, reorderCategories, toggleCategoryArchived } from "../actions";

// One kind's categories as a drag-to-reorder list. Drag the handle to reorder; every other
// control (rename, archive, delete, budget period, installment marker) still works per row.
export default function CategoryList({ kind, categories }: { kind: string; categories: Category[] }) {
  const byId = new Map(categories.map((c) => [c.id, c]));
  return (
    <SortableList
      className="card overflow-hidden"
      ids={categories.map((c) => c.id)}
      onReorder={reorderCategories}
      renderItem={(id, { handleProps, dragging, index }) => {
        const c = byId.get(id);
        if (!c) return null;
        return (
          <div className={`${index > 0 ? "hr-dash border-t" : ""} ${dragging ? "bg-ink-2" : ""}`}>
            <ManageRow
              id={c.id}
              name={c.name}
              archived={c.archived}
              isFirst={index === 0}
              isLast={index === categories.length - 1}
              rename={renameCategory}
              toggleArchive={toggleCategoryArchived}
              remove={c.archived ? deleteCategory : undefined}
              removeConfirm={`Delete "${c.name}" permanently? Past transactions in it become uncategorized and its budgets are removed.`}
              dragHandle={
                <span
                  {...handleProps}
                  aria-label="Drag to reorder"
                  className="grid h-8 w-6 shrink-0 place-items-center text-paper-faint active:text-paper-dim"
                >
                  <GripIcon className="h-[18px] w-[18px]" />
                </span>
              }
            />
            <div className="flex items-center justify-between gap-2 px-4 pb-2.5">
              {kind === "expense" ? (
                <CategoryInstallmentToggle id={c.id} installment={c.is_installment} />
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-paper-faint">Budget period</span>
                <CategoryPeriodSelect id={c.id} period={c.period} />
              </div>
            </div>
          </div>
        );
      }}
    />
  );
}

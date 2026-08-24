"use client";

import type { Category, CategoryKind } from "@/lib/types";
import SortableList, { DragHandle } from "@/components/SortableList";
import ManageRow from "../ManageRow";
import {
  deleteCategory,
  moveCategory,
  renameCategory,
  reorderCategories,
  setCategoryFavorite,
  setCategoryInstallment,
  setCategoryPeriod,
  toggleCategoryArchived,
} from "../actions";
import {
  CategoryFavoriteToggle,
  CategoryInstallmentToggle,
  CategoryPeriodSelect,
} from "./CategoryControls";

/**
 * One kind's categories, drag-to-reorder.
 *
 * A client component only because the drag is: the rows are the same ManageRows the page
 * rendered before, and the server actions are imported here and bound per row exactly as
 * they were on the server. Move up / Move down stay in each row's overflow menu — dragging
 * is not operable by keyboard or screen reader, so it is the faster path, never the only one.
 */
export default function CategoryList({
  categories,
  kind,
}: {
  categories: Category[];
  kind: CategoryKind;
}) {
  const byId = new Map(categories.map((c) => [c.id, c]));

  return (
    <SortableList
      className="space-y-2"
      ids={categories.map((c) => c.id)}
      onReorder={reorderCategories}
      renderItem={(id, { handleProps, index }) => {
        const category = byId.get(id);
        if (!category) return null;

        return (
          <ManageRow
            anchorId={`category-${category.id}`}
            name={category.name}
            archived={category.archived}
            dragHandle={
              categories.length > 1 ? <DragHandle {...handleProps} /> : undefined
            }
            onRename={renameCategory.bind(null, category.id)}
            onToggleArchive={toggleCategoryArchived.bind(
              null,
              category.id,
              !category.archived
            )}
            onDelete={deleteCategory.bind(null, category.id)}
            deleteMessage={
              <>
                Delete <strong>{category.name}</strong> permanently? Past
                transactions keep their history but lose this label.
              </>
            }
            onMoveUp={
              index > 0 ? moveCategory.bind(null, category.id, -1) : undefined
            }
            onMoveDown={
              index < categories.length - 1
                ? moveCategory.bind(null, category.id, 1)
                : undefined
            }
          >
            <div className="flex flex-wrap items-center gap-2">
              <CategoryPeriodSelect
                period={category.period}
                onChange={setCategoryPeriod.bind(null, category.id)}
              />
              <CategoryFavoriteToggle
                isFavorite={category.is_favorite}
                onToggle={setCategoryFavorite.bind(
                  null,
                  category.id,
                  !category.is_favorite
                )}
              />
              {kind === "expense" && (
                <CategoryInstallmentToggle
                  isInstallment={category.is_installment}
                  onToggle={setCategoryInstallment.bind(
                    null,
                    category.id,
                    !category.is_installment
                  )}
                />
              )}
            </div>
          </ManageRow>
        );
      }}
    />
  );
}

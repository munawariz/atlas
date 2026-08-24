"use client";

import type { Category, CategoryGroup, CategoryGroupMember, CategoryKind } from "@/lib/types";
import SortableList, { DragHandle } from "@/components/SortableList";
import ManageRow from "../ManageRow";
import {
  addGroupMember,
  deleteGroup,
  moveGroup,
  renameGroup,
  reorderGroups,
  toggleGroupArchived,
  toggleGroupMember,
} from "../actions";
import { GroupAddSelect, GroupMemberChip } from "./GroupControls";

/** Kind accent for the little dot on member chips — mirrors TYPE_ACCENT's palette. */
const KIND_DOT: Record<CategoryKind, string> = {
  expense: "bg-negative-500",
  income: "bg-positive-500",
  saving: "bg-info-500",
  investment: "bg-forest-800",
};

/**
 * The groups list, drag-to-reorder — group order is what the Add sheet leads with, so it is
 * worth arranging by hand. Same deal as CategoryList: client-side for the drag alone, with
 * Move up / Move down kept in the overflow menu as the accessible path.
 */
export default function GroupList({
  groups,
  categories,
  members,
}: {
  groups: CategoryGroup[];
  /** Active categories only — an archived one should not be joinable, it is on its way out. */
  categories: Category[];
  members: CategoryGroupMember[];
}) {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const memberSet = new Set(members.map((m) => `${m.group_id}:${m.category_id}`));

  return (
    <SortableList
      className="space-y-2"
      ids={groups.map((g) => g.id)}
      onReorder={reorderGroups}
      renderItem={(id, { handleProps, index }) => {
        const group = byId.get(id);
        if (!group) return null;

        const groupMembers = categories.filter((c) =>
          memberSet.has(`${group.id}:${c.id}`)
        );

        return (
          <ManageRow
            anchorId={`group-${group.id}`}
            name={group.name}
            archived={group.archived}
            dragHandle={groups.length > 1 ? <DragHandle {...handleProps} /> : undefined}
            onRename={renameGroup.bind(null, group.id)}
            onToggleArchive={toggleGroupArchived.bind(null, group.id, !group.archived)}
            onDelete={deleteGroup.bind(null, group.id)}
            deleteMessage={
              <>
                Delete <strong>{group.name}</strong>? The group goes; the{" "}
                {groupMembers.length}{" "}
                {groupMembers.length === 1 ? "category" : "categories"} in it{" "}
                {groupMembers.length === 1 ? "is" : "are"} untouched.
              </>
            }
            onMoveUp={index > 0 ? moveGroup.bind(null, group.id, -1) : undefined}
            onMoveDown={
              index < groups.length - 1 ? moveGroup.bind(null, group.id, 1) : undefined
            }
          >
            {/* Only the group's MEMBERS render as chips (tap × to remove); everything else
                stays tucked inside the add-select so long category lists don't swamp the
                row. */}
            <div className="flex flex-wrap items-center gap-1.5">
              {groupMembers.map((category) => (
                <GroupMemberChip
                  key={category.id}
                  name={category.name}
                  groupName={group.name}
                  dotClassName={KIND_DOT[category.kind]}
                  onRemove={toggleGroupMember.bind(null, group.id, category.id, false)}
                />
              ))}

              <GroupAddSelect
                options={categories.filter((c) => !memberSet.has(`${group.id}:${c.id}`))}
                onAdd={addGroupMember.bind(null, group.id)}
              />

              {categories.length === 0 && (
                <p className="text-[13px] text-ink-500">
                  No categories yet. Add some below, then add them to this group.
                </p>
              )}
            </div>
          </ManageRow>
        );
      }}
    />
  );
}

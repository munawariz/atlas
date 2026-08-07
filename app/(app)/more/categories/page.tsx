import Link from "next/link";
import { getCategories, getCategoryGroups, getGroupMembers } from "@/lib/data";
import { ChevronLeft, X } from "@/components/icons";
import type { Category, CategoryKind } from "@/lib/types";
import ManageRow from "../ManageRow";
import {
  addCategory,
  addGroup,
  addGroupMember,
  deleteCategory,
  deleteGroup,
  moveGroup,
  renameCategory,
  renameGroup,
  setCategoryFavorite,
  setCategoryInstallment,
  setCategoryPeriod,
  toggleCategoryArchived,
  toggleGroupArchived,
  toggleGroupMember,
} from "../actions";
import { GroupAddSelect } from "./GroupControls";
import {
  CategoryFavoriteToggle,
  CategoryInstallmentToggle,
  CategoryPeriodSelect,
} from "./CategoryControls";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories · Atlas" };

const KIND_SECTIONS: { kind: CategoryKind; label: string; hint: string }[] = [
  { kind: "expense", label: "Expense", hint: "Money spent." },
  { kind: "income", label: "Income", hint: "Money received." },
  {
    kind: "saving",
    label: "Saving",
    hint: "Buckets you set money aside into. Held outside net worth.",
  },
  {
    kind: "investment",
    label: "Investment",
    hint: "Buckets your stocks, bonds and forex hold value in.",
  },
];

/** Kind accent for the little dot on member chips — mirrors TYPE_ACCENT's palette. */
const KIND_DOT: Record<CategoryKind, string> = {
  expense: "bg-negative-500",
  income: "bg-positive-500",
  saving: "bg-info-500",
  investment: "bg-forest-800",
};

export default async function CategoriesPage({
  searchParams,
}: {
  // `?archived=1` shows archived categories inline instead of hiding them by default — the
  // same treatment History already gives filters (atlas-ux-review.md #5).
  searchParams: Promise<{ archived?: string }>;
}) {
  const { archived } = await searchParams;
  const showArchived = archived === "1";

  const [categories, groups, members] = await Promise.all([
    getCategories(true),
    getCategoryGroups(true),
    getGroupMembers(),
  ]);

  const byKind = new Map<CategoryKind, Category[]>();
  for (const section of KIND_SECTIONS) byKind.set(section.kind, []);
  for (const category of categories) byKind.get(category.kind)?.push(category);

  // Membership per group, for the chips. Active categories only — an archived category
  // should not be joinable, it is on its way out.
  const activeCategories = categories.filter((c) => !c.archived);
  const memberSet = new Set(members.map((m) => `${m.group_id}:${m.category_id}`));

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Link
            href="/more"
            aria-label="Back to more"
            className="-ml-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-forest-800 no-underline"
          >
            <ChevronLeft size={20} />
          </Link>
          <h1 className="font-display text-[24px] font-extrabold tracking-[-0.03em] text-ink-900">
            Categories
          </h1>
        </div>
        <Link
          href={showArchived ? "/more/categories" : "/more/categories?archived=1"}
          aria-pressed={showArchived}
          className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold no-underline transition-colors ${
            showArchived
              ? "bg-forest-800 text-white"
              : "bg-cream-200 text-ink-500"
          }`}
        >
          Archived
        </Link>
      </header>

      {/* --- Groups: what the Add sheet leads with ------------------------- */}
      <section>
        <h2 className="label">Groups</h2>
        <p className="mt-0.5 mb-2 text-[13px] text-ink-500">
          The Add sheet lists these first. A group can mix kinds — expense,
          income, saving and investment categories side by side.
        </p>

        <form
          action={addGroup}
          className="mb-2 flex gap-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
        >
          <input
            name="name"
            placeholder="New group name"
            aria-label="Group name"
            required
            className="field flex-1"
          />
          <button type="submit" className="btn btn-primary shrink-0">
            Add group
          </button>
        </form>

        <div className="space-y-2">
          {groups.map((group, index) => (
            <ManageRow
              key={group.id}
              name={group.name}
              archived={group.archived}
              onRename={renameGroup.bind(null, group.id)}
              onToggleArchive={toggleGroupArchived.bind(
                null,
                group.id,
                !group.archived
              )}
              onDelete={deleteGroup.bind(null, group.id)}
              onMoveUp={index > 0 ? moveGroup.bind(null, group.id, -1) : undefined}
              onMoveDown={
                index < groups.length - 1
                  ? moveGroup.bind(null, group.id, 1)
                  : undefined
              }
            >
              {/* Only the group's MEMBERS render as chips (tap × to remove); everything
                  else stays tucked inside the add-select so long category lists don't
                  swamp the row. */}
              <div className="flex flex-wrap items-center gap-1.5">
                {activeCategories
                  .filter((c) => memberSet.has(`${group.id}:${c.id}`))
                  .map((category) => (
                    <form
                      key={category.id}
                      action={toggleGroupMember.bind(
                        null,
                        group.id,
                        category.id,
                        false
                      )}
                    >
                      <button
                        type="submit"
                        aria-label={`Remove ${category.name} from ${group.name}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full bg-lime-200 px-2.5 text-[12px] font-semibold text-forest-800 transition-colors hover:bg-lime-300"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${KIND_DOT[category.kind]}`}
                        />
                        {category.name}
                        <X size={12} />
                      </button>
                    </form>
                  ))}

                <GroupAddSelect
                  options={activeCategories.filter(
                    (c) => !memberSet.has(`${group.id}:${c.id}`)
                  )}
                  onAdd={addGroupMember.bind(null, group.id)}
                />

                {activeCategories.length === 0 && (
                  <p className="text-[13px] text-ink-500">
                    No categories yet — add some below, then pick them into this
                    group.
                  </p>
                )}
              </div>
            </ManageRow>
          ))}

          {groups.length === 0 && (
            <p className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center text-[13px] text-ink-500 shadow-[var(--shadow-xs)]">
              No groups yet. Without groups, the Add sheet lists categories by
              kind instead.
            </p>
          )}
        </div>
      </section>

      {KIND_SECTIONS.map((section) => {
        const all = byKind.get(section.kind) ?? [];
        const list = all.filter((c) => showArchived || !c.archived);
        const archivedCount = all.length - list.length;
        return (
          <section key={section.kind}>
            <h2 className="label">{section.label}</h2>
            <p className="mt-0.5 mb-2 text-[13px] text-ink-500">{section.hint}</p>

            {/*
              Inline at the top of the section that already knows its kind, instead of one
              global form with a kind picker a scroll away from where the new row lands
              (atlas-ux-review.md #5).
            */}
            <form
              action={addCategory}
              className="mb-2 flex gap-2 rounded-[var(--radius-card)] bg-white p-3 shadow-[var(--shadow-xs)]"
            >
              <input type="hidden" name="kind" value={section.kind} />
              <input
                name="name"
                placeholder={`New ${section.label.toLowerCase()} category`}
                aria-label={`New ${section.label.toLowerCase()} category name`}
                required
                className="field flex-1"
              />
              <button type="submit" className="btn btn-primary shrink-0">
                Add
              </button>
            </form>

            <div className="space-y-2">
              {archivedCount > 0 && !showArchived && (
                <Link
                  href="/more/categories?archived=1"
                  className="block text-[13px] font-semibold text-forest-800 no-underline"
                >
                  {archivedCount} archived — show
                </Link>
              )}
              {list.map((category) => (
                <ManageRow
                  key={category.id}
                  name={category.name}
                  archived={category.archived}
                  onRename={renameCategory.bind(null, category.id)}
                  onToggleArchive={toggleCategoryArchived.bind(
                    null,
                    category.id,
                    !category.archived
                  )}
                  onDelete={deleteCategory.bind(null, category.id)}
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
                    {section.kind === "expense" && (
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
              ))}

              {list.length === 0 && (
                <p className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center text-[13px] text-ink-500 shadow-[var(--shadow-xs)]">
                  {archivedCount > 0
                    ? `All ${section.label.toLowerCase()} categories are archived.`
                    : `No ${section.label.toLowerCase()} categories yet.`}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { getCategories, getCategoryGroups, getGroupMembers } from "@/lib/data";
import { ChevronLeft } from "@/components/icons";
import type { Category, CategoryKind } from "@/lib/types";
import ManageRow from "../ManageRow";
import {
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
import { AddCategoryForm, AddGroupForm } from "./AddForms";
import { GroupAddSelect, GroupMemberChip } from "./GroupControls";
import {
  CategoryFavoriteToggle,
  CategoryInstallmentToggle,
  CategoryPeriodSelect,
} from "./CategoryControls";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories · Atlas" };

const KIND_SECTIONS: { kind: CategoryKind; label: string; hint: string }[] = [
  { kind: "expense", label: "Expense", hint: "Money going out." },
  { kind: "income", label: "Income", hint: "Money received." },
  {
    kind: "saving",
    label: "Saving",
    hint: "Money you set aside. Moving it into a bucket takes it out of your net worth.",
  },
  {
    kind: "investment",
    label: "Investment",
    hint: "Where your stocks, bonds and forex hold value. Also outside net worth.",
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
        {/*
          `aria-pressed` is only defined for role="button" and this is an <a> that navigates —
          `aria-current` is the correct state carrier for a link that is already the view you
          are on (atlas-ux-plan-manage-pages.md, Categories UX #4).
        */}
        <Link
          href={showArchived ? "/more/categories" : "/more/categories?archived=1"}
          aria-current={showArchived ? "page" : undefined}
          className={`inline-flex h-11 shrink-0 items-center rounded-full px-3 text-[12px] font-semibold no-underline transition-colors ${
            showArchived
              ? "bg-forest-800 text-white"
              : "bg-cream-200 text-ink-500"
          }`}
        >
          {showArchived ? "Hide archived" : "Show archived"}
        </Link>
      </header>

      <p className="-mt-3 text-[13px] text-ink-500">
        The labels every transaction gets — and the groups shown first when you
        add one.
      </p>

      {/* --- Groups: what adding a transaction leads with ------------------ */}
      <section>
        <h2 className="label">Groups</h2>
        <p className="mt-0.5 mb-2 text-[13px] text-ink-500">
          Shown first when you add a transaction. A group can mix kinds: expense,
          income, saving and investment side by side.
        </p>

        <AddGroupForm />

        <div className="space-y-2">
          {groups.map((group, index) => {
            const memberCount = activeCategories.filter((c) =>
              memberSet.has(`${group.id}:${c.id}`)
            ).length;
            return (
            <ManageRow
              key={group.id}
              anchorId={`group-${group.id}`}
              name={group.name}
              archived={group.archived}
              onRename={renameGroup.bind(null, group.id)}
              onToggleArchive={toggleGroupArchived.bind(
                null,
                group.id,
                !group.archived
              )}
              onDelete={deleteGroup.bind(null, group.id)}
              deleteMessage={
                <>
                  Delete <strong>{group.name}</strong>? The group goes; the{" "}
                  {memberCount} {memberCount === 1 ? "category" : "categories"} in
                  it {memberCount === 1 ? "is" : "are"} untouched.
                </>
              }
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
                    <GroupMemberChip
                      key={category.id}
                      name={category.name}
                      groupName={group.name}
                      dotClassName={KIND_DOT[category.kind]}
                      onRemove={toggleGroupMember.bind(
                        null,
                        group.id,
                        category.id,
                        false
                      )}
                    />
                  ))}

                <GroupAddSelect
                  options={activeCategories.filter(
                    (c) => !memberSet.has(`${group.id}:${c.id}`)
                  )}
                  onAdd={addGroupMember.bind(null, group.id)}
                />

                {activeCategories.length === 0 && (
                  <p className="text-[13px] text-ink-500">
                    No categories yet. Add some below, then add them to this
                    group.
                  </p>
                )}
              </div>
            </ManageRow>
            );
          })}

          {groups.length === 0 && (
            <p className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center text-[13px] text-ink-500 shadow-[var(--shadow-xs)]">
              No groups yet. Adding a transaction will list categories by kind
              instead.
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
              The per-category toggles used to carry their only explanation in a `title`, which
              does not render on touch — this app's primary target. Section-level helper text is
              where those two sentences belong (atlas-ux-plan-manage-pages.md, Categories UX #7).
            */}
            <p className="mb-2 text-[13px] text-ink-300">
              Favorites get their own tab when you add a transaction.
              {section.kind === "expense" && (
                <>
                  {" "}
                  Installment categories are excluded from Budget vs actual —
                  they&rsquo;re fixed, and tracked on the Installments page.
                </>
              )}
            </p>

            {/*
              Inline at the top of the section that already knows its kind, instead of one
              global form with a kind picker a scroll away from where the new row lands
              (atlas-ux-review.md #5) — collapsed to a ghost row so four of these cost one
              line each at rest (atlas-ux-plan-manage-pages.md C2).
            */}
            <AddCategoryForm
              kind={section.kind}
              kindLabel={section.label.toLowerCase()}
            />

            <div className="space-y-2">
              {archivedCount > 0 && !showArchived && (
                <Link
                  href="/more/categories?archived=1"
                  className="block text-[13px] font-semibold text-forest-800 no-underline"
                >
                  Show {archivedCount} archived
                </Link>
              )}
              {list.map((category) => (
                <ManageRow
                  key={category.id}
                  anchorId={`category-${category.id}`}
                  name={category.name}
                  archived={category.archived}
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
                <div className="rounded-[var(--radius-card)] bg-white px-5 py-6 text-center text-[13px] text-ink-500 shadow-[var(--shadow-xs)]">
                  {archivedCount > 0 ? (
                    <>
                      <p>
                        Every {section.label.toLowerCase()} category is archived.
                      </p>
                      <Link
                        href="/more/categories?archived=1"
                        className="mt-1 inline-block font-semibold text-forest-800 no-underline"
                      >
                        Show archived
                      </Link>
                    </>
                  ) : (
                    <p>
                      No {section.label.toLowerCase()} categories yet. Add one
                      above.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

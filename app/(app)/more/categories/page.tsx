import Link from "next/link";
import { getCategories } from "@/lib/data";
import { ChevronLeft } from "@/components/icons";
import type { Category, CategoryKind } from "@/lib/types";
import ManageRow from "../ManageRow";
import {
  addCategory,
  deleteCategory,
  renameCategory,
  setCategoryInstallment,
  setCategoryPeriod,
  toggleCategoryArchived,
} from "../actions";
import {
  CategoryInstallmentToggle,
  CategoryPeriodSelect,
} from "./CategoryControls";

export const dynamic = "force-dynamic";

export const metadata = { title: "Categories · Atlas" };

const GROUPS: { kind: CategoryKind; label: string; hint: string }[] = [
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

export default async function CategoriesPage() {
  const categories = await getCategories(true);

  const byKind = new Map<CategoryKind, Category[]>();
  for (const group of GROUPS) byKind.set(group.kind, []);
  for (const category of categories) byKind.get(category.kind)?.push(category);

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-1">
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
      </header>

      <form
        action={addCategory}
        className="space-y-2 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-xs)]"
      >
        <div className="label">Add a category</div>
        <input
          name="name"
          placeholder="Name"
          aria-label="Category name"
          required
          className="field"
        />
        <select name="kind" aria-label="Category kind" className="field" defaultValue="expense">
          {GROUPS.map((group) => (
            <option key={group.kind} value={group.kind}>
              {group.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary w-full">
          Add category
        </button>
      </form>

      {GROUPS.map((group) => {
        const list = byKind.get(group.kind) ?? [];
        return (
          <section key={group.kind}>
            <h2 className="label">{group.label}</h2>
            <p className="mt-0.5 mb-2 text-[13px] text-ink-500">{group.hint}</p>

            <div className="space-y-2">
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
                    {group.kind === "expense" && (
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
                  No {group.label.toLowerCase()} categories yet.
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

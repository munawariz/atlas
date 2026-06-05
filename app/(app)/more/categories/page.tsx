import Link from "next/link";
import { getCategories } from "@/lib/data";
import type { CategoryKind } from "@/lib/types";
import { addCategory, toggleCategoryArchived } from "../actions";

export const dynamic = "force-dynamic";

const KINDS: { kind: CategoryKind; label: string }[] = [
  { kind: "income", label: "Income" },
  { kind: "expense", label: "Expense" },
  { kind: "saving", label: "Saving" },
  { kind: "investment", label: "Investment" },
];

export default async function CategoriesPage() {
  const cats = await getCategories(true);
  return (
    <div className="space-y-5 pt-4">
      <div className="flex items-center justify-between">
        <Link href="/more" className="text-sm text-paper-dim active:text-paper">‹ More</Link>
        <h1 className="font-display text-xl font-medium tracking-tight text-paper">Categories</h1>
        <span className="w-12" />
      </div>

      <form action={addCategory} className="flex gap-2">
        <select name="kind" className="field w-auto px-3">
          {KINDS.map((k) => (
            <option key={k.kind} value={k.kind} className="bg-ink-2">{k.label}</option>
          ))}
        </select>
        <input name="name" placeholder="New category" className="field flex-1" />
        <button className="rounded-2xl bg-gold px-4 font-semibold text-ink">Add</button>
      </form>

      {KINDS.map((k) => {
        const rows = cats.filter((c) => c.kind === k.kind);
        if (rows.length === 0) return null;
        return (
          <section key={k.kind}>
            <h2 className="label mb-2">{k.label}</h2>
            <div className="card overflow-hidden">
              {rows.map((c, i) => (
                <div key={c.id} className={`flex items-center justify-between px-4 py-2.5 ${i > 0 ? "hr-dash border-t" : ""}`}>
                  <span className={`text-sm ${c.archived ? "text-paper-faint line-through" : "text-paper"}`}>{c.name}</span>
                  <form action={toggleCategoryArchived.bind(null, c.id)}>
                    <button className="text-xs text-paper-dim active:text-paper">{c.archived ? "Restore" : "Archive"}</button>
                  </form>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

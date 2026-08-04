"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import type { SaveScope } from "@/lib/types";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const monthDate = (v: FormDataEntryValue | null) => {
  const m = /^(\d{4}-\d{2})(?:-\d{2})?$/.exec(String(v ?? "").trim());
  return m ? `${m[1]}-01` : null;
};

/** The floor `effective_from` used by the `all` scope — earlier than any real ledger month. */
const FOREVER = "1900-01-01";

/**
 * Save a category budget under one of three scopes (ATLAS.md §3.4).
 *
 * - `month`    — write only the per-month override row.
 * - `forward`  — delete later rules and every override >= month, then upsert a rule at month.
 * - `all`      — delete every rule and override for the category, then insert one rule at 1900.
 *
 * The deletes in `forward` and `all` are what make the scopes mean what they say: leaving a
 * later rule or a stray override behind would silently win over the value just saved.
 */
export async function saveBudget(formData: FormData): Promise<void> {
  const categoryId = parseInt(String(formData.get("category_id") ?? ""), 10);
  const month = monthDate(formData.get("month"));
  const amount = digits(formData.get("amount"));
  const scope = String(formData.get("scope") ?? "month") as SaveScope;

  if (!Number.isFinite(categoryId) || categoryId <= 0 || !month) return;

  const sb = supabaseServer();

  if (scope === "all") {
    await sb.from("recurring_budgets").delete().eq("category_id", categoryId);
    await sb.from("budgets").delete().eq("category_id", categoryId);
    await sb.from("recurring_budgets").insert({
      category_id: categoryId,
      amount,
      effective_from: FOREVER,
    });
  } else if (scope === "forward") {
    await sb
      .from("recurring_budgets")
      .delete()
      .eq("category_id", categoryId)
      .gt("effective_from", month);
    await sb
      .from("budgets")
      .delete()
      .eq("category_id", categoryId)
      .gte("month", month);
    await sb
      .from("recurring_budgets")
      .upsert(
        { category_id: categoryId, amount, effective_from: month },
        { onConflict: "category_id,effective_from" }
      );
  } else {
    await sb
      .from("budgets")
      .upsert(
        { category_id: categoryId, month, amount },
        { onConflict: "category_id,month" }
      );
  }

  revalidatePath("/more/budgets");
  revalidatePath("/more/cashflow");
  revalidatePath("/dashboard");
}

/** Drop this month's override so the recurring rule takes over again. */
export async function clearBudgetOverride(formData: FormData): Promise<void> {
  const categoryId = parseInt(String(formData.get("category_id") ?? ""), 10);
  const month = monthDate(formData.get("month"));
  if (!Number.isFinite(categoryId) || categoryId <= 0 || !month) return;

  await supabaseServer()
    .from("budgets")
    .delete()
    .eq("category_id", categoryId)
    .eq("month", month);

  revalidatePath("/more/budgets");
  revalidatePath("/more/cashflow");
  revalidatePath("/dashboard");
}

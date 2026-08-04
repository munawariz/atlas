"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { SESSION_COOKIE } from "@/lib/auth";
import { saveSettings } from "@/lib/settings";
import type { BudgetPeriod, CategoryKind } from "@/lib/types";

// Local helpers — three lines each, kept per action file by design (ATLAS.md §11).
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const KINDS: CategoryKind[] = ["income", "expense", "saving", "investment"];
const PERIODS: BudgetPeriod[] = ["daily", "weekly", "monthly", "yearly"];

function revalidateManage() {
  revalidatePath("/more/wallets");
  revalidatePath("/more/categories");
  revalidatePath("/more/providers");
  revalidatePath("/more/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  // The app layout feeds the Add sheet its wallets and categories — refresh it too.
  revalidatePath("/", "layout");
}

// =============================================================================
// Wallets
// =============================================================================

export async function addWallet(formData: FormData): Promise<void> {
  const name = text(formData.get("name"));
  if (!name) return;

  const sb = supabaseServer();
  const { data: last } = await sb
    .from("wallets")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await sb.from("wallets").insert({
    name,
    sort_order: Number(last?.sort_order ?? -1) + 1,
  });
  revalidateManage();
}

export async function renameWallet(id: number, formData: FormData): Promise<void> {
  const name = text(formData.get("name"));
  if (!name) return;
  await supabaseServer().from("wallets").update({ name }).eq("id", id);
  revalidateManage();
}

export async function toggleWalletArchived(
  id: number,
  archived: boolean
): Promise<void> {
  await supabaseServer().from("wallets").update({ archived }).eq("id", id);
  revalidateManage();
}

/**
 * Move a wallet up or down.
 *
 * Renumbers the whole list 0..n rather than swapping two values, so `sort_order` stays
 * gap-free however many times it is reordered.
 */
export async function moveWallet(id: number, delta: number): Promise<void> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("wallets")
    .select("id, sort_order")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const list = (data ?? []) as { id: number }[];
  const from = list.findIndex((w) => w.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return;

  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);

  await Promise.all(
    list.map((w, index) =>
      sb.from("wallets").update({ sort_order: index }).eq("id", w.id)
    )
  );
  revalidateManage();
}

/** Hard delete, permitted only once the wallet is already archived. */
export async function deleteWallet(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: wallet } = await sb
    .from("wallets")
    .select("archived")
    .eq("id", id)
    .maybeSingle();
  if (!wallet?.archived) return;

  await sb.from("wallets").delete().eq("id", id);
  revalidateManage();
}

// =============================================================================
// Categories
// =============================================================================

export async function addCategory(formData: FormData): Promise<void> {
  const name = text(formData.get("name"));
  const rawKind = text(formData.get("kind")) as CategoryKind;
  if (!name || !KINDS.includes(rawKind)) return;

  const sb = supabaseServer();
  const { data: last } = await sb
    .from("categories")
    .select("sort_order")
    .eq("kind", rawKind)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  await sb.from("categories").insert({
    name,
    kind: rawKind,
    sort_order: Number(last?.sort_order ?? -1) + 1,
  });
  revalidateManage();
}

export async function renameCategory(
  id: number,
  formData: FormData
): Promise<void> {
  const name = text(formData.get("name"));
  if (!name) return;
  await supabaseServer().from("categories").update({ name }).eq("id", id);
  revalidateManage();
}

export async function toggleCategoryArchived(
  id: number,
  archived: boolean
): Promise<void> {
  await supabaseServer().from("categories").update({ archived }).eq("id", id);
  revalidateManage();
}

export async function setCategoryPeriod(
  id: number,
  formData: FormData
): Promise<void> {
  const period = text(formData.get("period")) as BudgetPeriod;
  if (!PERIODS.includes(period)) return;
  await supabaseServer().from("categories").update({ period }).eq("id", id);
  revalidateManage();
  revalidatePath("/more/cashflow");
}

export async function setCategoryInstallment(
  id: number,
  isInstallment: boolean
): Promise<void> {
  await supabaseServer()
    .from("categories")
    .update({ is_installment: isInstallment })
    .eq("id", id);
  revalidateManage();
}

/**
 * Hard delete, permitted only once the category is already archived.
 *
 * Safe by FK design (ATLAS.md §14.13): transactions go uncategorized via
 * `on delete set null`, budgets cascade, and paylater items unlink. Verifying `archived`
 * first is what makes it a deliberate act rather than an accident.
 */
export async function deleteCategory(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: category } = await sb
    .from("categories")
    .select("archived")
    .eq("id", id)
    .maybeSingle();
  if (!category?.archived) return;

  await sb.from("categories").delete().eq("id", id);
  revalidateManage();
}

/** Persist a drag-reorder: the client sends the full id order for one kind. */
export async function reorderCategories(ids: number[]): Promise<void> {
  const sb = supabaseServer();
  await Promise.all(
    ids.map((id, index) =>
      sb.from("categories").update({ sort_order: index }).eq("id", id)
    )
  );
  revalidateManage();
}

// =============================================================================
// Installment providers
//
// Provider <-> category stay 1:1. This is the ONE place a category is created from a name,
// and the name is the user's own provider name — never a hardcoded literal (ATLAS.md §11).
// =============================================================================

export async function resolveProviderCategory(
  providerId: number
): Promise<number | null> {
  const sb = supabaseServer();
  const { data: provider } = await sb
    .from("paylater_providers")
    .select("id, name, category_id")
    .eq("id", providerId)
    .maybeSingle();
  if (!provider) return null;

  // Reuse the linked category if it still exists.
  if (provider.category_id) {
    const { data: existing } = await sb
      .from("categories")
      .select("id")
      .eq("id", provider.category_id)
      .maybeSingle();
    if (existing) return Number(existing.id);
  }

  // Otherwise find or create an expense category named after the provider.
  const { data: byName } = await sb
    .from("categories")
    .select("id")
    .eq("kind", "expense")
    .eq("name", provider.name)
    .maybeSingle();

  let categoryId = byName ? Number(byName.id) : null;

  if (!categoryId) {
    const { data: created } = await sb
      .from("categories")
      .insert({ kind: "expense", name: provider.name, is_installment: true })
      .select("id")
      .maybeSingle();
    categoryId = created ? Number(created.id) : null;
  } else {
    await sb.from("categories").update({ is_installment: true }).eq("id", categoryId);
  }

  if (categoryId) {
    await sb
      .from("paylater_providers")
      .update({ category_id: categoryId })
      .eq("id", providerId);
  }

  return categoryId;
}

export async function addProvider(formData: FormData): Promise<void> {
  const name = text(formData.get("name"));
  if (!name) return;

  const sb = supabaseServer();
  const { data: last } = await sb
    .from("paylater_providers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: created } = await sb
    .from("paylater_providers")
    .insert({ name, sort_order: Number(last?.sort_order ?? -1) + 1 })
    .select("id")
    .maybeSingle();

  if (created) await resolveProviderCategory(Number(created.id));
  revalidateManage();
  revalidatePath("/more/paylater");
}

/** Renaming a provider renames its category too — best effort, so a clash cannot block it. */
export async function renameProvider(
  id: number,
  formData: FormData
): Promise<void> {
  const name = text(formData.get("name"));
  if (!name) return;

  const sb = supabaseServer();
  const { data: provider } = await sb
    .from("paylater_providers")
    .select("category_id")
    .eq("id", id)
    .maybeSingle();

  await sb.from("paylater_providers").update({ name }).eq("id", id);
  if (provider?.category_id) {
    await sb.from("categories").update({ name }).eq("id", provider.category_id);
  }

  revalidateManage();
  revalidatePath("/more/paylater");
}

export async function toggleProviderArchived(
  id: number,
  archived: boolean
): Promise<void> {
  await supabaseServer()
    .from("paylater_providers")
    .update({ archived })
    .eq("id", id);
  revalidateManage();
  revalidatePath("/more/paylater");
}

export async function moveProvider(id: number, delta: number): Promise<void> {
  const sb = supabaseServer();
  const { data } = await sb
    .from("paylater_providers")
    .select("id")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });

  const list = (data ?? []) as { id: number }[];
  const from = list.findIndex((p) => p.id === id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= list.length) return;

  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);

  await Promise.all(
    list.map((p, index) =>
      sb.from("paylater_providers").update({ sort_order: index }).eq("id", p.id)
    )
  );
  revalidateManage();
  revalidatePath("/more/paylater");
}

// =============================================================================
// Settings
// =============================================================================

export interface SettingsState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

export async function saveAppSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const entries: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // Only the mapping keys — never `opening_month`, which the app owns.
    if (key.startsWith("cat_") || key.startsWith("wallet_")) {
      entries[key] = String(value ?? "");
    }
  }

  try {
    await saveSettings(entries);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save." };
  }

  revalidatePath("/more/settings");
  revalidatePath("/dashboard");
  revalidatePath("/stocks");
  revalidatePath("/bonds");
  revalidatePath("/more/forex");
  revalidatePath("/more/loans");
  revalidatePath("/more/cashflow");

  return { ok: true, nonce: Date.now() };
}

// =============================================================================
// Session
// =============================================================================

export async function logout(): Promise<void> {
  // Next 16: cookies() is async.
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}

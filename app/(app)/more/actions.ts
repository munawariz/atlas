"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";
import { SESSION_COOKIE } from "@/lib/auth";
import { SETTING_KEYS, resolveCategoryId } from "@/lib/settings";
import { forexAvgCost } from "@/lib/forex";
import type { CategoryKind } from "@/lib/types";

// A forex move as needed to derive average cost (a subset of forex_transactions columns).
type ForexCostRow = { direction: "buy" | "sell"; idr: number; units: number; occurred_on: string };

function digits(v: FormDataEntryValue | null): number {
  return parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
}

// Accepts "YYYY-MM" (month input) or "YYYY-MM-DD" (date input) and snaps to a first-of-month
// date — installments are month-scoped, so the day is ignored.
function monthDate(v: FormDataEntryValue | null): string | null {
  const m = /^(\d{4}-\d{2})(?:-\d{2})?$/.exec(String(v ?? "").trim());
  return m ? `${m[1]}-01` : null;
}

function addMonthsISO(iso: string, n: number): string {
  const [y, m] = iso.slice(0, 7).split("-").map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((((idx % 12) + 12) % 12) + 1).padStart(2, "0")}-01`;
}

function units(v: FormDataEntryValue | null): number {
  return parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
}

// Optional positive integer (e.g. a selected category id); "" / invalid -> null.
function optInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}


export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}

// ---- Wallets ----
export async function addWallet(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = supabaseServer();
  const { data } = await sb.from("wallets").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const next = (data?.[0]?.sort_order ?? 0) + 1;
  await sb.from("wallets").insert({ name, sort_order: next });
  revalidatePath("/more/wallets");
}

export async function toggleWalletArchived(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("wallets").select("archived").eq("id", id).maybeSingle();
  await sb.from("wallets").update({ archived: !data?.archived }).eq("id", id);
  revalidatePath("/more/wallets");
}

export async function renameWallet(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabaseServer().from("wallets").update({ name }).eq("id", id);
  revalidatePath("/more/wallets");
}

// Reorder by swapping with the neighbour, then re-numbering sort_order 0..n so the order
// is always gap-free and tie-free regardless of the seed data.
export async function moveWallet(id: number, dir: "up" | "down") {
  const sb = supabaseServer();
  const { data } = await sb.from("wallets").select("id").order("sort_order").order("id");
  const list = (data ?? []) as { id: number }[];
  const i = list.findIndex((w) => w.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((w, k) => sb.from("wallets").update({ sort_order: k }).eq("id", w.id)));
  revalidatePath("/more/wallets");
}

// ---- Categories ----
export async function addCategory(formData: FormData) {
  const kind = String(formData.get("kind") ?? "") as CategoryKind;
  const name = String(formData.get("name") ?? "").trim();
  if (!name || !["income", "expense", "saving", "investment"].includes(kind)) return;
  const sb = supabaseServer();
  const { data } = await sb
    .from("categories")
    .select("sort_order")
    .eq("kind", kind)
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = (data?.[0]?.sort_order ?? 0) + 1;
  await sb.from("categories").insert({ kind, name, sort_order: next });
  revalidatePath("/more/categories");
}

export async function toggleCategoryArchived(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("categories").select("archived").eq("id", id).maybeSingle();
  await sb.from("categories").update({ archived: !data?.archived }).eq("id", id);
  revalidatePath("/more/categories");
}

export async function renameCategory(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await supabaseServer().from("categories").update({ name }).eq("id", id);
  revalidatePath("/more/categories");
}

// Permanently delete an ARCHIVED category. Safe by FK design: past transactions become
// uncategorized (category_id → null), budgets/recurring budgets cascade away, and paylater
// items/providers unlink. Only archived categories qualify (mirrors the UI gate).
export async function deleteCategory(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("categories").select("archived").eq("id", id).maybeSingle();
  if (!data?.archived) return; // must archive first
  await sb.from("categories").delete().eq("id", id);
  revalidatePath("/more/categories");
  revalidatePath("/dashboard");
  revalidatePath("/charts");
}

// Mark/unmark an expense category as an installment category — keeps its spend separate from
// normal expenses on the stats page (provider categories are marked automatically).
export async function toggleCategoryInstallment(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("categories").select("is_installment").eq("id", id).maybeSingle();
  await sb
    .from("categories")
    .update({ is_installment: !(data as { is_installment?: boolean } | null)?.is_installment })
    .eq("id", id);
  revalidatePath("/more/categories");
  revalidatePath("/dashboard");
}

// Bind a budgeting cadence to a category. Daily/weekly/monthly all share the month-scoped
// storage, so switching among them just reinterprets the amount. Switching to YEARLY
// collapses the budget to a single whole-year rule (latest amount) and drops per-month
// overrides/versioning, since yearly has no month scope.
export async function setCategoryPeriod(id: number, periodRaw: string) {
  const period = ["daily", "weekly", "monthly", "yearly"].includes(periodRaw) ? periodRaw : "monthly";
  const sb = supabaseServer();
  await sb.from("categories").update({ period }).eq("id", id);

  if (period === "yearly") {
    // Carry over the latest budget amount (recurring rule, else most recent override).
    let amount = 0;
    const { data: rules } = await sb
      .from("recurring_budgets")
      .select("amount")
      .eq("category_id", id)
      .order("effective_from", { ascending: false })
      .limit(1);
    if (rules && rules.length) {
      amount = rules[0].amount as number;
    } else {
      const { data: ov } = await sb
        .from("budgets")
        .select("amount")
        .eq("category_id", id)
        .order("month", { ascending: false })
        .limit(1);
      if (ov && ov.length) amount = ov[0].amount as number;
    }
    await sb.from("recurring_budgets").delete().eq("category_id", id);
    await sb.from("budgets").delete().eq("category_id", id);
    if (amount > 0) await sb.from("recurring_budgets").insert({ category_id: id, amount, effective_from: "1900-01-01" });
  }

  revalidatePath("/more/categories");
  revalidatePath("/more/budgets");
  revalidatePath("/dashboard");
}

// Persist a drag-and-drop reorder: `orderedIds` is one kind's categories in their new order;
// re-number that kind's sort_order 0..n to match.
export async function reorderCategories(orderedIds: number[]) {
  if (!orderedIds.length) return;
  const sb = supabaseServer();
  await Promise.all(orderedIds.map((id, i) => sb.from("categories").update({ sort_order: i }).eq("id", id)));
  revalidatePath("/more/categories");
}

// Reorder within the category's own kind (re-numbering that kind's sort_order 0..n).
export async function moveCategory(id: number, dir: "up" | "down") {
  const sb = supabaseServer();
  const { data: cat } = await sb.from("categories").select("kind").eq("id", id).maybeSingle();
  if (!cat) return;
  const { data } = await sb
    .from("categories")
    .select("id")
    .eq("kind", cat.kind)
    .order("sort_order")
    .order("id");
  const list = (data ?? []) as { id: number }[];
  const i = list.findIndex((c) => c.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((c, k) => sb.from("categories").update({ sort_order: k }).eq("id", c.id)));
  revalidatePath("/more/categories");
}

// ---- Budgets ----
// scope: "month" = this month only (a per-month override); "forward" = this month and
// every month after (a recurring rule, clearing later rules/overrides); "all" = every
// month (a single recurring rule from the beginning, clearing all rules/overrides).
export async function setBudget(formData: FormData) {
  const category_id = parseInt(String(formData.get("category_id") ?? ""), 10);
  const month = String(formData.get("month") ?? "");
  const scope = String(formData.get("scope") ?? "month");
  const amount = digits(formData.get("amount"));
  if (!category_id || !/^\d{4}-\d{2}-01$/.test(month)) return;
  const sb = supabaseServer();

  // The cadence is bound to the category (set on the Categories page). Daily/weekly/monthly
  // budgets use the month scope (this month only / forward / all); yearly is a single
  // whole-year limit. (select("*") tolerates the period column not being migrated yet.)
  const { data: cat } = await sb.from("categories").select("*").eq("id", category_id).maybeSingle();
  const period = ((cat as { period?: string } | null)?.period) ?? "monthly";

  if (period === "yearly" || scope === "all") {
    // One recurring rule from the dawn of time; wipe every override and other rule.
    await sb.from("recurring_budgets").delete().eq("category_id", category_id);
    await sb.from("budgets").delete().eq("category_id", category_id);
    await sb.from("recurring_budgets").insert({ category_id, amount, effective_from: "1900-01-01" });
  } else if (scope === "forward") {
    // Authoritative from this month on: drop later rules + overrides, set the rule here.
    await sb.from("recurring_budgets").delete().eq("category_id", category_id).gt("effective_from", month);
    await sb.from("budgets").delete().eq("category_id", category_id).gte("month", month);
    await sb
      .from("recurring_budgets")
      .upsert({ category_id, amount, effective_from: month }, { onConflict: "category_id,effective_from" });
  } else {
    // This month only — a per-month override on top of any recurring rule.
    await sb.from("budgets").upsert({ category_id, month, amount }, { onConflict: "category_id,month" });
  }

  revalidatePath("/more/budgets");
  revalidatePath("/dashboard");
}

// The provider's installment expense category: its linked category if set & still present,
// otherwise an expense category named after the provider (created + marked installment),
// linked back onto the provider so the two stay 1:1.
async function resolveProviderCategory(
  sb: ReturnType<typeof supabaseServer>,
  prov: { id: number; name: string; category_id: number | null }
): Promise<number | null> {
  if (prov.category_id) {
    const { data: exists } = await sb.from("categories").select("id").eq("id", prov.category_id).maybeSingle();
    if (exists) return prov.category_id;
  }
  let { data: cat } = await sb
    .from("categories")
    .select("id")
    .eq("kind", "expense")
    .eq("name", prov.name)
    .maybeSingle();
  if (cat) {
    await sb.from("categories").update({ is_installment: true }).eq("id", cat.id);
  } else {
    const ins = await sb
      .from("categories")
      .insert({ kind: "expense", name: prov.name, is_installment: true })
      .select("id")
      .single();
    cat = ins.data;
  }
  if (cat?.id) await sb.from("paylater_providers").update({ category_id: cat.id }).eq("id", prov.id);
  return cat?.id ?? null;
}

// The expense category an installment payment books under: the provider's installment
// category when the item has a provider; otherwise null (uncategorized — shown as "Other"
// on the Home installments tab and not auto-budgeted).
async function resolvePaylaterExpenseCategory(
  sb: ReturnType<typeof supabaseServer>,
  item: { provider_id: number | null }
): Promise<number | null> {
  if (item.provider_id) {
    const { data: prov } = await sb
      .from("paylater_providers")
      .select("id, name, category_id")
      .eq("id", item.provider_id)
      .maybeSingle();
    if (prov) return resolveProviderCategory(sb, prov as { id: number; name: string; category_id: number | null });
  }
  return null;
}

// ---- Paylater providers ----
// A grouping label for installments (ShopeePaylater, GoPayLater, Credit Card, …) that also
// owns a 1:1 installment expense category, so each provider's payments are tracked separately.
// Same manage pattern as wallets/categories, plus a true delete (items fall back to "no
// provider"; the category is kept for its history).
export async function addPaylaterProvider(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = supabaseServer();
  const { data } = await sb
    .from("paylater_providers")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const next = (data?.[0]?.sort_order ?? 0) + 1;
  const { data: prov } = await sb
    .from("paylater_providers")
    .insert({ name, sort_order: next })
    .select("id, name, category_id")
    .single();
  if (prov) await resolveProviderCategory(sb, prov as { id: number; name: string; category_id: number | null });
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
  revalidatePath("/more/categories");
}

export async function renamePaylaterProvider(id: number, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sb = supabaseServer();
  const { data: prov } = await sb.from("paylater_providers").select("category_id").eq("id", id).maybeSingle();
  await sb.from("paylater_providers").update({ name }).eq("id", id);
  // Keep the linked installment category's name in sync (best-effort; a name clash is ignored).
  if (prov?.category_id) await sb.from("categories").update({ name }).eq("id", prov.category_id);
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
  revalidatePath("/more/categories");
}

export async function togglePaylaterProviderArchived(id: number) {
  const sb = supabaseServer();
  const { data } = await sb.from("paylater_providers").select("archived").eq("id", id).maybeSingle();
  await sb.from("paylater_providers").update({ archived: !data?.archived }).eq("id", id);
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
}

export async function movePaylaterProvider(id: number, dir: "up" | "down") {
  const sb = supabaseServer();
  const { data } = await sb.from("paylater_providers").select("id").order("sort_order").order("id");
  const list = (data ?? []) as { id: number }[];
  const i = list.findIndex((p) => p.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await Promise.all(list.map((p, k) => sb.from("paylater_providers").update({ sort_order: k }).eq("id", p.id)));
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
}

export async function deletePaylaterProvider(id: number) {
  await supabaseServer().from("paylater_providers").delete().eq("id", id);
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
}

// Persist a drag-and-drop reorder of installment providers (re-number sort_order 0..n).
// Their order drives the provider groups on My Paylater and the Home installments tab.
export async function reorderPaylaterProviders(orderedIds: number[]) {
  if (!orderedIds.length) return;
  const sb = supabaseServer();
  await Promise.all(orderedIds.map((id, i) => sb.from("paylater_providers").update({ sort_order: i }).eq("id", id)));
  revalidatePath("/more/providers");
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

// ---- Paylater ----
export async function addPaylater(formData: FormData) {
  const item = String(formData.get("item") ?? "").trim();
  const first = monthDate(formData.get("first_month"));
  const last = monthDate(formData.get("last_month"));
  if (!item || !first || !last) return;
  await supabaseServer().from("paylater_items").insert({
    item,
    monthly_amount: digits(formData.get("monthly_amount")),
    first_month_date: first,
    last_month_date: last < first ? first : last,
    provider_id: optInt(formData.get("provider_id")),
    note: String(formData.get("note") ?? "").trim() || null,
  });
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

export async function editPaylater(formData: FormData) {
  const id = parseInt(String(formData.get("id") ?? ""), 10);
  const item = String(formData.get("item") ?? "").trim();
  const first = monthDate(formData.get("first_month"));
  const last = monthDate(formData.get("last_month"));
  if (!id || !item || !first || !last) return;
  await supabaseServer()
    .from("paylater_items")
    .update({
      item,
      monthly_amount: digits(formData.get("monthly_amount")),
      first_month_date: first,
      last_month_date: last < first ? first : last,
      provider_id: optInt(formData.get("provider_id")),
      note: String(formData.get("note") ?? "").trim() || null,
    })
    .eq("id", id);
  // Note: already-booked paid months keep their original expense (historical record);
  // editing only changes the item's details going forward.
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

export async function deletePaylater(id: number) {
  await supabaseServer().from("paylater_items").delete().eq("id", id);
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
}

// Pay an installment month: mark it paid and, unless skipTxn is set, book an expense
// withdrawn from the chosen wallet (skipTxn = "I already paid this manually elsewhere").
export async function payPaylaterMonth(
  itemId: number,
  month: string,
  walletId: number,
  dateISO: string,
  skipTxn = false
) {
  const sb = supabaseServer();
  const { data: item } = await sb
    .from("paylater_items")
    .select("item, monthly_amount, provider_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return;

  let expenseTxnId: number | null = null;
  if (!skipTxn) {
    if (!walletId) return;
    const occurred_on = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : new Date().toISOString().slice(0, 10);
    // Book the expense under the provider's installment category (or the default one).
    const categoryId = await resolvePaylaterExpenseCategory(sb, item as { provider_id: number | null });
    const txn = await sb
      .from("transactions")
      .insert({
        occurred_on,
        type: "expense",
        amount: item.monthly_amount,
        description: item.item,
        category_id: categoryId,
        source_wallet_id: walletId,
      })
      .select("id")
      .single();
    expenseTxnId = txn.data?.id ?? null;
  }

  await sb
    .from("paylater_payments")
    .upsert({ item_id: itemId, month, expense_txn_id: expenseTxnId }, { onConflict: "item_id,month" });

  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Pay every still-owed installment in one go (used by a provider group's "Pay all"):
// books one expense per item from the chosen wallet and marks each month paid. Already-paid
// items are skipped. skipTxn = mark paid only, no expenses. Resolves the default category once.
export async function payPaylaterMonths(
  itemIds: number[],
  month: string,
  walletId: number,
  dateISO: string,
  skipTxn = false
) {
  if (!itemIds.length) return;
  if (!skipTxn && !walletId) return;
  const sb = supabaseServer();
  const occurred_on = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : new Date().toISOString().slice(0, 10);

  for (const itemId of itemIds) {
    // Skip months already marked paid so re-running never double-books.
    const { data: already } = await sb
      .from("paylater_payments")
      .select("id")
      .eq("item_id", itemId)
      .eq("month", month)
      .maybeSingle();
    if (already) continue;

    const { data: item } = await sb
      .from("paylater_items")
      .select("item, monthly_amount, provider_id")
      .eq("id", itemId)
      .maybeSingle();
    if (!item) continue;

    let expenseTxnId: number | null = null;
    if (!skipTxn) {
      // Each item books under its provider's installment category (or the default).
      const categoryId = await resolvePaylaterExpenseCategory(sb, item as { provider_id: number | null });
      const txn = await sb
        .from("transactions")
        .insert({
          occurred_on,
          type: "expense",
          amount: item.monthly_amount,
          description: item.item,
          category_id: categoryId,
          source_wallet_id: walletId,
        })
        .select("id")
        .single();
      expenseTxnId = txn.data?.id ?? null;
    }

    await sb
      .from("paylater_payments")
      .upsert({ item_id: itemId, month, expense_txn_id: expenseTxnId }, { onConflict: "item_id,month" });
  }

  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Un-pay an installment month: delete the linked expense and the paid marker.
export async function unpayPaylaterMonth(itemId: number, month: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("paylater_payments")
    .select("id, expense_txn_id")
    .eq("item_id", itemId)
    .eq("month", month)
    .maybeSingle();
  if (data) {
    if (data.expense_txn_id) await sb.from("transactions").delete().eq("id", data.expense_txn_id);
    await sb.from("paylater_payments").delete().eq("id", data.id);
  }
  revalidatePath("/more/paylater");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// ---- Forex ----
// Book the ledger side(s) of a forex convert and move the holding balance, returning the ids
// to record on the forex_transactions row. Buy = investment out of the wallet into the
// "Forex" bucket. Sell = return the cost basis to the wallet (a withdrawal) plus the realized
// P/L (Forex Profit income / Forex Loss expense) — mirrors the stocks module. For a sell,
// `priorTxns` are the account's OTHER forex moves, used to derive the average-cost basis.
async function bookForexConvert(
  sb: ReturnType<typeof supabaseServer>,
  p: {
    accountId: number;
    currency: string;
    direction: "buy" | "sell";
    walletId: number;
    idr: number;
    fx: number;
    occurredOn: string;
    priorTxns: ForexCostRow[];
  }
): Promise<{ txnId: number | null; plTxnId: number | null; realizedPl: number | null }> {
  const forexCat = await resolveCategoryId("cat_forex", "Forex", "investment");
  let txnId: number | null = null;
  let plTxnId: number | null = null;
  let realizedPl: number | null = null;

  if (p.direction === "buy") {
    const ins = await sb
      .from("transactions")
      .insert({
        occurred_on: p.occurredOn, type: "investment", amount: p.idr,
        description: `Buy ${p.currency} (forex)`, category_id: forexCat, source_wallet_id: p.walletId,
      })
      .select("id")
      .single();
    txnId = ins.data?.id ?? null;
  } else {
    // Cost basis of the sold units (average-cost), then split the proceeds into a return of
    // capital (withdrawal back to the wallet) and the realized gain/loss.
    const realizedCost = Math.round(forexAvgCost(p.priorTxns) * p.fx);
    realizedPl = p.idr - realizedCost; // proceeds − cost basis

    if (realizedCost > 0) {
      const w = await sb
        .from("transactions")
        .insert({
          occurred_on: p.occurredOn, type: "withdrawal", amount: realizedCost,
          description: `Sell ${p.currency} (forex)`, category_id: forexCat, dest_wallet_id: p.walletId,
        })
        .select("id")
        .single();
      txnId = w.data?.id ?? null;
    }

    if (realizedPl > 0) {
      const cat = await resolveCategoryId("cat_forex_profit", "Forex Profit", "income");
      const ptxn = await sb
        .from("transactions")
        .insert({
          occurred_on: p.occurredOn, type: "income", amount: realizedPl,
          description: `Profit ${p.currency} (forex)`, category_id: cat, dest_wallet_id: p.walletId,
        })
        .select("id")
        .single();
      plTxnId = ptxn.data?.id ?? null;
    } else if (realizedPl < 0) {
      const cat = await resolveCategoryId("cat_forex_loss", "Forex Loss", "expense");
      const ptxn = await sb
        .from("transactions")
        .insert({
          occurred_on: p.occurredOn, type: "expense", amount: -realizedPl,
          description: `Loss ${p.currency} (forex)`, category_id: cat, source_wallet_id: p.walletId,
        })
        .select("id")
        .single();
      plTxnId = ptxn.data?.id ?? null;
    }
  }

  // Move the foreign holding (buy adds units, sell removes them).
  const delta = p.direction === "buy" ? p.fx : -p.fx;
  const { data: a } = await sb.from("forex_accounts").select("units").eq("id", p.accountId).maybeSingle();
  if (a) {
    await sb.from("forex_accounts").update({ units: Math.max(0, Number(a.units) + delta) }).eq("id", p.accountId);
  }

  return { txnId, plTxnId, realizedPl };
}

// The account's existing forex moves, as the minimal columns needed for the cost basis.
async function forexCostRows(
  sb: ReturnType<typeof supabaseServer>,
  accountId: number,
  excludeId?: number
): Promise<ForexCostRow[]> {
  let q = sb.from("forex_transactions").select("direction, idr, units, occurred_on").eq("account_id", accountId);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return (data ?? []).map((t) => {
    const r = t as { direction: "buy" | "sell"; idr: number; units: number | string; occurred_on: string };
    return { direction: r.direction, idr: r.idr, units: Number(r.units), occurred_on: r.occurred_on };
  });
}

// Move money between an IDR wallet and a foreign-currency holding (from the Forex screen).
export async function convertForex(formData: FormData) {
  const sb = supabaseServer();
  const accountId = parseInt(String(formData.get("account_id") ?? ""), 10);
  const direction = String(formData.get("direction") ?? "buy") === "sell" ? "sell" : "buy";
  const walletId = parseInt(String(formData.get("wallet_id") ?? ""), 10);
  const idr = digits(formData.get("idr"));
  const fx = units(formData.get("units"));
  if (!accountId || !walletId || idr <= 0 || fx <= 0) return;

  const { data: acct } = await sb.from("forex_accounts").select("currency").eq("id", accountId).maybeSingle();
  if (!acct) return;
  const occurred_on = new Date().toISOString().slice(0, 10);
  const priorTxns = direction === "sell" ? await forexCostRows(sb, accountId) : [];

  const { txnId, plTxnId, realizedPl } = await bookForexConvert(sb, {
    accountId, currency: acct.currency, direction, walletId, idr, fx, occurredOn: occurred_on, priorTxns,
  });

  await sb.from("forex_transactions").insert({
    account_id: accountId, occurred_on, direction, idr, units: fx,
    wallet_id: walletId, txn_id: txnId, pl_txn_id: plTxnId, realized_pl: realizedPl,
  });

  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
}

// Edit an existing forex buy/sell from the history editor. Because a sell's cost-basis
// split and realized P/L depend on the rest of the log, the safest path is to fully revert
// the old entry (undo the holding move, drop its ledger row(s)) and re-book it from scratch
// with the new values, then update the forex log row in place. `bind(null, forexTxnId, txnId)`.
export async function updateForexTransaction(
  forexTxnId: number,
  _txnId: number,
  _prev: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const sb = supabaseServer();
  const accountId = optInt(formData.get("account_id"));
  const walletId = optInt(formData.get("wallet_id"));
  const direction = String(formData.get("direction") ?? "buy") === "sell" ? "sell" : "buy";
  const idr = digits(formData.get("idr"));
  const fx = units(formData.get("units"));
  const date = String(formData.get("date") ?? "").slice(0, 10);
  if (!accountId || !walletId || idr <= 0 || fx <= 0 || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Pick a currency and wallet, and fill in both amounts and the date." };
  }

  const { data: old } = await sb
    .from("forex_transactions")
    .select("account_id, direction, units, txn_id, pl_txn_id")
    .eq("id", forexTxnId)
    .maybeSingle();
  if (!old) return { error: "This forex entry no longer exists." };
  const { data: acct } = await sb.from("forex_accounts").select("currency").eq("id", accountId).maybeSingle();
  if (!acct) return { error: "That currency no longer exists." };

  // 1) Undo the old holding move and delete its ledger row(s).
  const undo = old.direction === "buy" ? -Number(old.units) : Number(old.units);
  const { data: oldAcct } = await sb.from("forex_accounts").select("units").eq("id", old.account_id).maybeSingle();
  if (oldAcct) {
    await sb.from("forex_accounts").update({ units: Math.max(0, Number(oldAcct.units) + undo) }).eq("id", old.account_id);
  }
  if (old.txn_id) await sb.from("transactions").delete().eq("id", old.txn_id);
  if (old.pl_txn_id) await sb.from("transactions").delete().eq("id", old.pl_txn_id);

  // 2) Re-book with the new values (cost basis from the account's other moves) and save.
  const priorTxns = direction === "sell" ? await forexCostRows(sb, accountId, forexTxnId) : [];
  const { txnId, plTxnId, realizedPl } = await bookForexConvert(sb, {
    accountId, currency: acct.currency, direction, walletId, idr, fx, occurredOn: date, priorTxns,
  });
  await sb
    .from("forex_transactions")
    .update({
      account_id: accountId, occurred_on: date, direction, idr, units: fx,
      wallet_id: walletId, txn_id: txnId, pl_txn_id: plTxnId, realized_pl: realizedPl,
    })
    .eq("id", forexTxnId);

  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  redirect(`/history?m=${date.slice(0, 7)}-01`);
}

// Delete a forex buy/sell from the history editor: revert the holding balance, then remove
// the forex log row together with its cost-basis/investment ledger row and any realized-P/L row.
export async function deleteForexTransaction(forexTxnId: number, txnId: number): Promise<void> {
  const sb = supabaseServer();
  const { data: old } = await sb
    .from("forex_transactions")
    .select("account_id, direction, units, occurred_on, txn_id, pl_txn_id")
    .eq("id", forexTxnId)
    .maybeSingle();
  if (old) {
    const delta = old.direction === "buy" ? -Number(old.units) : Number(old.units); // undo the move
    const { data: a } = await sb.from("forex_accounts").select("units").eq("id", old.account_id).maybeSingle();
    if (a) await sb.from("forex_accounts").update({ units: Math.max(0, Number(a.units) + delta) }).eq("id", old.account_id);
    if (old.txn_id) await sb.from("transactions").delete().eq("id", old.txn_id);
    if (old.pl_txn_id) await sb.from("transactions").delete().eq("id", old.pl_txn_id);
    await sb.from("forex_transactions").delete().eq("id", forexTxnId);
  }
  // Safety net for legacy rows whose primary ledger id was only carried on the form.
  await sb.from("transactions").delete().eq("id", txnId);

  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  redirect(old?.occurred_on ? `/history?m=${String(old.occurred_on).slice(0, 7)}-01` : "/history");
}

// Correct a forex holding's balance directly (no transaction booked).
export async function setForexUnits(accountId: number, formData: FormData) {
  await supabaseServer().from("forex_accounts").update({ units: units(formData.get("units")) }).eq("id", accountId);
  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
}

// Add a foreign-currency holding (one account per ISO currency code). An optional
// starting balance has two sides — the foreign units you hold and the IDR they cost —
// so the holding opens with a cost basis for the gain/loss view.
export async function addForexAccount(formData: FormData) {
  const sb = supabaseServer();
  const currency = String(formData.get("currency") ?? "").trim().toUpperCase().replace(/[^A-Z]/g, "");
  const nameRaw = String(formData.get("name") ?? "").trim();
  const startUnits = units(formData.get("units"));
  const startCost = digits(formData.get("idr")); // IDR paid for the opening balance
  if (currency.length < 2) return;
  const { data: existing } = await sb.from("forex_accounts").select("id").eq("currency", currency).maybeSingle();
  if (existing) return; // already have this currency
  const { data: acct } = await sb
    .from("forex_accounts")
    .insert({ name: nameRaw || `Forex ${currency}`, currency, units: startUnits })
    .select("id")
    .single();
  // Seed the cost basis as an opening "buy" — no wallet / no ledger transaction, since
  // it's an existing holding rather than a fresh purchase. Only when both sides are given.
  if (acct && startUnits > 0 && startCost > 0) {
    await sb.from("forex_transactions").insert({
      account_id: acct.id,
      occurred_on: new Date().toISOString().slice(0, 10),
      direction: "buy",
      idr: startCost,
      units: startUnits,
      wallet_id: null,
      txn_id: null,
    });
  }
  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
}

// Remove a forex holding. Cascades its forex_transactions log; the IDR wallet
// transactions it booked are real history and are left untouched.
export async function deleteForexAccount(accountId: number) {
  await supabaseServer().from("forex_accounts").delete().eq("id", accountId);
  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
}

// ---- Loans ----
export async function addLoan(formData: FormData) {
  const person = String(formData.get("person") ?? "").trim();
  if (!person) return;
  const sb = supabaseServer();
  const { data: loan } = await sb
    .from("loans")
    .insert({
      person,
      note: String(formData.get("note") ?? "").trim() || null,
      installment: digits(formData.get("installment")),
      lender: String(formData.get("lender") ?? "").trim() || null,
    })
    .select("id")
    .single();

  // Optionally lay out the promised months: from a start month, for N months (any year).
  const start = monthDate(formData.get("start_month"));
  const count = digits(formData.get("months"));
  if (loan && start && count > 0) {
    const rows = [];
    for (let i = 0; i < Math.min(count, 60); i++) {
      rows.push({ loan_id: loan.id, period_month: addMonthsISO(start, i), paid: false });
    }
    if (rows.length) await sb.from("loan_payments").insert(rows);
  }

  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

export async function deleteLoan(id: number) {
  await supabaseServer().from("loans").delete().eq("id", id);
  revalidatePath("/more/loans");
}

// Add a month to a loan's promised schedule (edit mode) — starts as "owed".
export async function scheduleMonth(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (!data) {
    await sb.from("loan_payments").insert({ loan_id: loanId, period_month: periodMonth, paid: false });
  }
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

// Remove a month from the promised schedule (edit mode) — only if not yet collected.
export async function unscheduleMonth(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id, paid")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (data && !data.paid) await sb.from("loan_payments").delete().eq("id", data.id);
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
}

// Un-collect: drop a collected month back to "owed" and delete its income record
// (the month stays in the schedule, since it's still promised).
export async function uncollectLoanPayment(loanId: number, periodMonth: string) {
  const sb = supabaseServer();
  const { data } = await sb
    .from("loan_payments")
    .select("id, income_txn_id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  if (data) {
    if (data.income_txn_id) await sb.from("transactions").delete().eq("id", data.income_txn_id);
    await sb.from("loan_payments").update({ paid: false, income_txn_id: null, amount: null }).eq("id", data.id);
  }
  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// Mark a month as collected and, unless skipTxn is set, book it as Hutang income into the
// chosen wallet (skipTxn = "I already received this manually elsewhere"). `amount` is the
// actual amount received (may be partial); 0 / omitted falls back to the full installment.
export async function collectLoanPayment(
  loanId: number,
  periodMonth: string,
  walletId: number,
  dateISO: string,
  skipTxn = false,
  amount = 0
) {
  const sb = supabaseServer();
  const occurred_on = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : new Date().toISOString().slice(0, 10);
  const { data: loan } = await sb.from("loans").select("person, installment").eq("id", loanId).maybeSingle();
  const amt = amount > 0 ? amount : loan?.installment ?? 0;

  // 1) ensure the cell exists, mark it paid, and record the collected amount
  const { data: existing } = await sb
    .from("loan_payments")
    .select("id")
    .eq("loan_id", loanId)
    .eq("period_month", periodMonth)
    .maybeSingle();
  let paymentId = existing?.id;
  if (paymentId) {
    await sb.from("loan_payments").update({ paid: true, amount: amt }).eq("id", paymentId);
  } else {
    const ins = await sb
      .from("loan_payments")
      .insert({ loan_id: loanId, period_month: periodMonth, paid: true, amount: amt })
      .select("id")
      .single();
    paymentId = ins.data?.id;
  }

  // 2) book the collected amount as Hutang income and link it to the cell (unless skipped)
  if (!skipTxn && loan && walletId) {
    const catId = await resolveCategoryId("cat_loan", "Hutang", "income");
    const txn = await sb
      .from("transactions")
      .insert({
        occurred_on,
        type: "income",
        amount: amt,
        description: loan.person,
        category_id: catId,
        dest_wallet_id: walletId,
      })
      .select("id")
      .single();
    if (paymentId && txn.data?.id) {
      await sb.from("loan_payments").update({ income_txn_id: txn.data.id }).eq("id", paymentId);
    }
  }

  revalidatePath("/more/loans");
  revalidatePath("/dashboard");
  revalidatePath("/history");
}

// ---- Settings ----
export async function saveSettings(formData: FormData) {
  const sb = supabaseServer();
  const rows = SETTING_KEYS.map((k) => ({ key: k, value: String(formData.get(k) ?? "").trim() })).filter((r) => r.value);
  if (rows.length) await sb.from("app_settings").upsert(rows, { onConflict: "key" });
  revalidatePath("/more/settings");
  revalidatePath("/dashboard");
  revalidatePath("/stocks");
  revalidatePath("/bonds");
}

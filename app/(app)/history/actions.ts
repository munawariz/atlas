"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseTransactionForm, optInt } from "@/lib/txnForm";
import { monthKeyOf } from "@/lib/data";
import type { TxnType } from "@/lib/types";

/**
 * Revalidate every page a ledger row feeds. The layout-wide entry covers whatever page a
 * sheet was opened over, so sheets don't need a follow-up router.refresh().
 */
function revalidateLedger() {
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/savings");
  revalidatePath("/charts");
  revalidatePath("/balances");
}

export async function updateTransaction(
  id: number,
  formData: FormData
): Promise<void> {
  const { row, error } = parseTransactionForm(formData);
  if (error || !row) throw new Error(error ?? "Could not save that.");

  const sb = supabaseServer();
  const { error: updateError } = await sb
    .from("transactions")
    .update(row)
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);

  revalidateLedger();
  // Land back on the month the row now belongs to, not on the current month.
  redirect(`/history?m=${monthKeyOf(row.occurred_on)}`);
}

export async function deleteTransaction(
  id: number,
  formData: FormData
): Promise<void> {
  const sb = supabaseServer();

  // Read the month before deleting, so the redirect can return to it.
  const { data: existing } = await sb
    .from("transactions")
    .select("occurred_on")
    .eq("id", id)
    .maybeSingle();

  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidateLedger();

  const month =
    (formData.get("month") as string | null) ||
    (existing?.occurred_on ? monthKeyOf(String(existing.occurred_on)) : null);
  redirect(month ? `/history?m=${month}` : "/history");
}

/**
 * Sheet variants of update/delete: same writes, but they return state instead of
 * redirecting — the edit sheet closes over the page it was opened from, so there is
 * nowhere to navigate to.
 */
export interface EditSheetState {
  ok?: boolean;
  error?: string;
  /** Changes on every success so the client can tell two saves apart. */
  nonce?: number;
  savedLabel?: string;
}

export async function updateTransactionSheet(
  id: number,
  _prev: EditSheetState,
  formData: FormData
): Promise<EditSheetState> {
  const { row, error } = parseTransactionForm(formData);
  if (error || !row) return { error: error ?? "Could not save that." };

  const sb = supabaseServer();
  const { error: updateError } = await sb
    .from("transactions")
    .update(row)
    .eq("id", id);
  if (updateError) return { error: updateError.message };

  revalidateLedger();
  return { ok: true, nonce: Date.now(), savedLabel: "Changes saved" };
}

export async function deleteTransactionSheet(
  id: number,
  _prev: EditSheetState,
  _formData: FormData
): Promise<EditSheetState> {
  const sb = supabaseServer();
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidateLedger();
  return { ok: true, nonce: Date.now(), savedLabel: "Deleted" };
}

/**
 * Apply one set of field changes to many rows at once.
 *
 * The client only offers fields that are meaningful for the selected type, and only allows a
 * selection of a SINGLE type — so this never has to reason about mixed-type normalization.
 * Blank fields are left untouched rather than nulled.
 */
export async function bulkUpdateTransactions(formData: FormData): Promise<void> {
  const ids = String(formData.get("ids") ?? "")
    .split(",")
    .map((v) => parseInt(v, 10))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (ids.length === 0) return;

  const type = String(formData.get("type") ?? "") as TxnType;
  const patch: Record<string, unknown> = {};

  const sourceWalletId = optInt(formData.get("source_wallet_id"));
  const destWalletId = optInt(formData.get("dest_wallet_id"));
  const categoryId = optInt(formData.get("category_id"));
  const occurredOn = String(formData.get("occurred_on") ?? "").trim();

  // Only assign columns the type actually uses, so a bulk edit can never write a wallet into
  // a slot the balance rule expects to be null.
  if (sourceWalletId && (type === "expense" || type === "saving" || type === "investment" || type === "transfer")) {
    patch.source_wallet_id = sourceWalletId;
  }
  if (destWalletId && (type === "income" || type === "withdrawal" || type === "transfer")) {
    patch.dest_wallet_id = destWalletId;
  }
  if (categoryId && type !== "transfer") patch.category_id = categoryId;
  if (/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) patch.occurred_on = occurredOn;

  if (Object.keys(patch).length === 0) return;

  const sb = supabaseServer();
  const { error } = await sb.from("transactions").update(patch).in("id", ids);
  if (error) throw new Error(error.message);

  revalidateLedger();
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseTransactionForm } from "@/lib/txnForm";

export interface EditState {
  error?: string;
}

// Return to the History view scoped to a transaction's month, so editing/deleting an
// entry lands you back where you were rather than on the current month.
const historyHref = (date?: string | null) => (date ? `/history?m=${date.slice(0, 7)}-01` : "/history");

export async function updateTransaction(
  id: number,
  _prev: EditState,
  formData: FormData
): Promise<EditState> {
  const { row, error } = parseTransactionForm(formData);
  if (error || !row) return { error: error ?? "Invalid entry." };

  const { error: dbError } = await supabaseServer().from("transactions").update(row).eq("id", id);
  if (dbError) return { error: dbError.message };

  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(historyHref(row.occurred_on));
}

// Bulk-set the source/destination wallet, category, and/or date on many transactions at
// once (used by the History select mode). The caller restricts the selection to a single
// type, so only the fields meaningful for that type are passed. The DB trigger reverses each
// old row and applies the new one, so wallet balances stay correct (incl. date/month moves).
export interface BulkPatch {
  source_wallet_id?: number;
  dest_wallet_id?: number;
  category_id?: number;
  occurred_on?: string; // YYYY-MM-DD
}

export async function bulkUpdateTransactions(
  ids: number[],
  patch: BulkPatch
): Promise<{ error?: string; updated?: number }> {
  if (!ids.length) return { error: "Nothing selected." };
  const update: Record<string, number | string> = {};
  if (patch.source_wallet_id != null) update.source_wallet_id = patch.source_wallet_id;
  if (patch.dest_wallet_id != null) update.dest_wallet_id = patch.dest_wallet_id;
  if (patch.category_id != null) update.category_id = patch.category_id;
  if (patch.occurred_on && /^\d{4}-\d{2}-\d{2}$/.test(patch.occurred_on)) update.occurred_on = patch.occurred_on;
  if (!Object.keys(update).length) return { error: "Pick something to change." };

  const { error } = await supabaseServer().from("transactions").update(update).in("id", ids);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/history");
  return { updated: ids.length };
}

export async function deleteTransaction(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: txn } = await sb.from("transactions").select("occurred_on").eq("id", id).maybeSingle();
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(historyHref(txn?.occurred_on as string | undefined));
}

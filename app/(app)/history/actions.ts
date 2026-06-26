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

// Bulk-set the source and/or destination wallet on many transactions at once (used by the
// History select mode). The caller restricts the selection to a single type, so only the
// wallet field(s) meaningful for that type are passed. The DB trigger reverses each old row
// and applies the new one, so wallet balances stay correct.
export async function bulkUpdateWallets(
  ids: number[],
  source: number | null,
  dest: number | null
): Promise<{ error?: string; updated?: number }> {
  if (!ids.length) return { error: "Nothing selected." };
  const update: Record<string, number> = {};
  if (source != null) update.source_wallet_id = source;
  if (dest != null) update.dest_wallet_id = dest;
  if (!Object.keys(update).length) return { error: "Pick a wallet to set." };

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

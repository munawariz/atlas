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

export async function deleteTransaction(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: txn } = await sb.from("transactions").select("occurred_on").eq("id", id).maybeSingle();
  const { error } = await sb.from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect(historyHref(txn?.occurred_on as string | undefined));
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseTransactionForm } from "@/lib/txnForm";

export interface EditState {
  error?: string;
}

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
  redirect("/history");
}

export async function deleteTransaction(id: number): Promise<void> {
  const { error } = await supabaseServer().from("transactions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/history");
  redirect("/history");
}

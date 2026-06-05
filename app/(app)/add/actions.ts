"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseTransactionForm } from "@/lib/txnForm";

export interface AddState {
  ok?: boolean;
  error?: string;
  nonce?: number;
  savedLabel?: string;
}

export async function createTransaction(_prev: AddState, formData: FormData): Promise<AddState> {
  const { row, error } = parseTransactionForm(formData);
  if (error || !row) return { error: error ?? "Invalid entry." };

  const { error: dbError } = await supabaseServer().from("transactions").insert(row);
  if (dbError) return { error: dbError.message };

  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/add");

  return { ok: true, nonce: Date.now(), savedLabel: `Saved ${row.type}` };
}

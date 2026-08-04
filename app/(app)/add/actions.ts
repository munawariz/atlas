"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { parseTransactionForm } from "@/lib/txnForm";
import { TXN_TYPES } from "@/lib/types";

export interface AddState {
  ok?: boolean;
  error?: string;
  /** Changes on every success so the client can tell two saves apart and reset the form. */
  nonce?: number;
  savedLabel?: string;
}

export async function addTransaction(
  _prev: AddState,
  formData: FormData
): Promise<AddState> {
  const { row, error } = parseTransactionForm(formData);
  if (error || !row) return { error: error ?? "Could not save that." };

  const sb = supabaseServer();
  const { error: insertError } = await sb.from("transactions").insert(row);
  if (insertError) return { error: insertError.message };

  // Every page whose numbers this row moves.
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/savings");
  revalidatePath("/charts");
  revalidatePath("/balances");

  const label =
    TXN_TYPES.find((t) => t.value === row.type)?.label ?? "Transaction";
  return { ok: true, nonce: Date.now(), savedLabel: `${label} saved` };
}

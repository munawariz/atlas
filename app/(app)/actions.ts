"use server";

import { revalidatePath } from "next/cache";
import { resolveCategoryId, unmappedError } from "@/lib/settings";
import { supabaseServer } from "@/lib/supabaseServer";
import { digits, parseTransactionForm } from "@/lib/txnForm";
import { TXN_TYPES, type TransactionInput } from "@/lib/types";

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

  // A transfer may carry an optional admin fee, booked as a separate expense from the same
  // source wallet under the user-mapped admin-fee category. Refused when unmapped — the fee
  // category is never guessed (ATLAS.md §14.14).
  const adminFee = row.type === "transfer" ? digits(formData.get("admin_fee")) : 0;
  const rows: TransactionInput[] = [row];
  if (adminFee > 0) {
    const feeCategoryId = await resolveCategoryId("cat_admin_fee");
    if (feeCategoryId === null) return { error: unmappedError("cat_admin_fee") };
    rows.push({
      occurred_on: row.occurred_on,
      type: "expense",
      amount: adminFee,
      description: row.description ? `Admin fee — ${row.description}` : "Admin fee",
      category_id: feeCategoryId,
      source_wallet_id: row.source_wallet_id,
      dest_wallet_id: null,
    });
  }

  const sb = supabaseServer();
  const { error: insertError } = await sb.from("transactions").insert(rows);
  if (insertError) return { error: insertError.message };

  // Every page whose numbers this row moves.
  revalidatePath("/dashboard");
  revalidatePath("/history");
  revalidatePath("/savings");
  revalidatePath("/charts");
  revalidatePath("/balances");

  const label =
    TXN_TYPES.find((t) => t.value === row.type)?.label ?? "Transaction";
  return {
    ok: true,
    nonce: Date.now(),
    savedLabel: adminFee > 0 ? `${label} + admin fee saved` : `${label} saved`,
  };
}

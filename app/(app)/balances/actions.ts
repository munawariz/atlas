"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { OPENING_MONTH, getWallets } from "@/lib/data";

export interface BalancesState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

/** Save the per-wallet starting (opening) balance the derived balances build on. */
export async function saveOpeningBalances(_prev: BalancesState, formData: FormData): Promise<BalancesState> {
  const wallets = await getWallets(true);
  const rows = wallets.map((w) => {
    const raw = String(formData.get(`w_${w.id}`) ?? "").replace(/\D/g, "");
    return { month: OPENING_MONTH, wallet_id: w.id, balance: parseInt(raw || "0", 10) };
  });

  const { error } = await supabaseServer()
    .from("wallet_balances")
    .upsert(rows, { onConflict: "month,wallet_id" });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/balances");
  return { ok: true, nonce: Date.now() };
}

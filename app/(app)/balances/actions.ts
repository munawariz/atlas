"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { getOpeningMonth, getWallets } from "@/lib/data";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);

export interface BalancesState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

/**
 * Upsert every wallet's opening balance.
 *
 * The month is RESOLVED, never assumed — `/balances` must write to exactly the month
 * `deriveWalletBalances` reads from, or net worth silently double-counts or ignores the
 * starting figures (ATLAS.md §14.15).
 */
export async function saveOpeningBalances(
  _prev: BalancesState,
  formData: FormData
): Promise<BalancesState> {
  const sb = supabaseServer();
  const month = await getOpeningMonth();
  const wallets = await getWallets(true);

  const rows = wallets
    .filter((w) => formData.has(`wallet_${w.id}`))
    .map((w) => ({
      month,
      wallet_id: w.id,
      balance: digits(formData.get(`wallet_${w.id}`)),
    }));

  if (rows.length === 0) return { error: "Nothing to save." };

  const { error } = await sb
    .from("wallet_balances")
    .upsert(rows, { onConflict: "month,wallet_id" });
  if (error) return { error: error.message };

  revalidatePath("/balances");
  revalidatePath("/dashboard");
  revalidatePath("/charts");

  return { ok: true, nonce: Date.now() };
}

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId, unmappedError } from "@/lib/settings";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const units = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export interface BondState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateBonds() {
  revalidatePath("/bonds");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  revalidatePath("/charts");
}

/**
 * Record a bond buy, sell or coupon.
 *
 * Buy moves principal into the bond bucket (`investment`); sell brings it back out
 * (`withdrawal`); a coupon is plain income and carries no units.
 *
 * The category mapping is resolved before the first write — an unmapped key refuses and
 * writes nothing rather than leaving a trade with no ledger row (ATLAS.md §11).
 */
export async function recordBondTrade(
  _prev: BondState,
  formData: FormData
): Promise<BondState> {
  const name = text(formData.get("name"));
  const rawSide = text(formData.get("side"));
  const side =
    rawSide === "sell" || rawSide === "coupon" ? rawSide : "buy";
  const idr = digits(formData.get("idr"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));
  // Coupons carry no units — the principal did not move.
  const unitCount = side === "coupon" ? 0 : units(formData.get("units"));

  if (!name) return { error: "Enter a bond name." };
  if (idr <= 0) return { error: "Enter an amount." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const key = side === "coupon" ? "cat_bond_coupon" : "cat_bond";
  const categoryId = await resolveCategoryId(key);
  if (categoryId === null) return { error: unmappedError(key) };

  const sb = supabaseServer();

  const description =
    side === "buy" ? `Buy ${name}` : side === "sell" ? `Sell ${name}` : `Coupon ${name}`;

  const row =
    side === "buy"
      ? {
          type: "investment" as const,
          source_wallet_id: walletId,
          dest_wallet_id: null,
        }
      : side === "sell"
        ? {
            type: "withdrawal" as const,
            source_wallet_id: null,
            dest_wallet_id: walletId,
          }
        : {
            type: "income" as const,
            source_wallet_id: null,
            dest_wallet_id: walletId,
          };

  const { data: created } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      amount: idr,
      description,
      category_id: categoryId,
      ...row,
    })
    .select("id")
    .maybeSingle();

  const { error } = await sb.from("bond_trades").insert({
    name,
    side,
    units: unitCount,
    idr,
    occurred_on: occurredOn,
    wallet_id: walletId,
    txn_id: created ? Number(created.id) : null,
  });
  if (error) return { error: error.message };

  revalidateBonds();
  return { ok: true, nonce: Date.now() };
}

/** Delete a trade and the ledger row it booked. */
export async function deleteBondTrade(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: trade } = await sb
    .from("bond_trades")
    .select("txn_id")
    .eq("id", id)
    .maybeSingle();

  if (trade?.txn_id) {
    await sb.from("transactions").delete().eq("id", trade.txn_id);
  }
  await sb.from("bond_trades").delete().eq("id", id);
  revalidateBonds();
}

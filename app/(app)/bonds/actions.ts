"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId } from "@/lib/settings";

function digits(v: FormDataEntryValue | null): number {
  return parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
}
function optInt(v: FormDataEntryValue | null): number | null {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function numUnits(v: FormDataEntryValue | null): number {
  return parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
}

export interface BondState {
  ok?: boolean;
  error?: string;
  nonce?: number;
  savedLabel?: string;
}

function revalidate() {
  revalidatePath("/bonds");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
}

export async function addBondTrade(_prev: BondState, formData: FormData): Promise<BondState> {
  const name = String(formData.get("name") ?? "").trim().toUpperCase();
  const raw = String(formData.get("side") ?? "buy");
  const side: "buy" | "sell" | "coupon" = raw === "sell" || raw === "coupon" ? raw : "buy";
  const idr = digits(formData.get("idr"));
  const unitsVal = side === "coupon" ? 0 : numUnits(formData.get("units"));
  const walletId = optInt(formData.get("wallet_id"));
  const date = String(formData.get("date") ?? "");

  if (!name) return { error: "Enter the bond name / series." };
  if (side !== "coupon" && unitsVal <= 0) return { error: "Enter the number of units." };
  if (!idr) return { error: side === "buy" ? "Enter money spent." : "Enter the amount." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const sb = supabaseServer();

  // buy = investment out of the wallet; sell = withdrawal back in (both the Bonds
  // bucket); coupon = interest income under "Kupon".
  let txnId: number | null = null;
  let row: Record<string, unknown>;
  if (side === "buy") {
    row = { type: "investment", amount: idr, description: `Beli ${name}`, category_id: await resolveCategoryId("cat_bond", "Bonds", "investment"), source_wallet_id: walletId, dest_wallet_id: null };
  } else if (side === "sell") {
    row = { type: "withdrawal", amount: idr, description: `Jual ${name}`, category_id: await resolveCategoryId("cat_bond", "Bonds", "investment"), source_wallet_id: null, dest_wallet_id: walletId };
  } else {
    row = { type: "income", amount: idr, description: `Kupon ${name}`, category_id: await resolveCategoryId("cat_bond_coupon", "Kupon", "income"), source_wallet_id: null, dest_wallet_id: walletId };
  }
  const { data: txn, error: txnErr } = await sb
    .from("transactions")
    .insert({ occurred_on: date, ...row })
    .select("id")
    .single();
  if (txnErr) return { error: txnErr.message };
  txnId = txn?.id ?? null;

  const { error: btErr } = await sb
    .from("bond_trades")
    .insert({ name, side, units: unitsVal, idr, occurred_on: date, wallet_id: walletId, txn_id: txnId });
  if (btErr) return { error: btErr.message };

  revalidate();
  const verb = side === "buy" ? "Bought" : side === "sell" ? "Sold" : "Logged coupon for";
  return { ok: true, nonce: Date.now(), savedLabel: `${verb} ${name}` };
}

export async function deleteBondTrade(id: number) {
  const sb = supabaseServer();
  const { data: t } = await sb.from("bond_trades").select("txn_id").eq("id", id).maybeSingle();
  await sb.from("bond_trades").delete().eq("id", id);
  if (t?.txn_id) await sb.from("transactions").delete().eq("id", t.txn_id);
  revalidate();
}

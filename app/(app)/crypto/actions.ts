"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId, unmappedError } from "@/lib/settings";
import { cryptoPosition, getCryptoTrades, DUST } from "@/lib/crypto";
import { formatUnits } from "@/lib/format";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const units = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export interface CryptoState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateCrypto() {
  revalidatePath("/crypto");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  revalidatePath("/charts");
}

/**
 * Record a buy or a sell.
 *
 * A sell books TWO ledger rows, exactly as a stock sale does: a `withdrawal` of the cost
 * basis back into the wallet, plus a separate P/L row — income on a profit, expense on a
 * loss. Splitting them is what keeps the bucket balance honest: only the original cost comes
 * back out of the bucket, and the gain or loss is recognised as its own flow.
 *
 * Every mapping is resolved BEFORE the first write (ATLAS.md §11). A sale inserts three rows;
 * discovering `cat_crypto_profit` unmapped halfway through would leave a half-booked trade.
 */
export async function recordCryptoTrade(
  _prev: CryptoState,
  formData: FormData
): Promise<CryptoState> {
  const symbol = text(formData.get("symbol")).toUpperCase();
  const side = text(formData.get("side")) === "sell" ? "sell" : "buy";
  const unitCount = units(formData.get("units"));
  const idr = digits(formData.get("idr"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));
  // An opening position establishes cost basis without moving any money.
  const opening = side === "buy" && text(formData.get("opening")) === "1";

  if (!symbol) return { error: "Enter a coin symbol." };
  if (unitCount <= 0) return { error: "Enter how many coins." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!opening && idr <= 0) return { error: "Enter an amount." };
  if (!opening && !walletId) return { error: "Choose a wallet." };

  const sb = supabaseServer();

  if (opening) {
    const { error } = await sb.from("crypto_trades").insert({
      symbol,
      side: "buy",
      units: unitCount,
      idr,
      occurred_on: occurredOn,
      opening: true,
      wallet_id: null,
      txn_id: null,
    });
    if (error) return { error: error.message };
    revalidateCrypto();
    return { ok: true, nonce: Date.now() };
  }

  // --- Resolve every mapping this path needs, up front --------------------
  const cryptoCategoryId = await resolveCategoryId("cat_crypto");
  if (cryptoCategoryId === null) return { error: unmappedError("cat_crypto") };

  if (side === "buy") {
    const { data: created } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "investment",
        amount: idr,
        description: `Buy ${formatUnits(unitCount)} ${symbol}`,
        category_id: cryptoCategoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();

    const { error } = await sb.from("crypto_trades").insert({
      symbol,
      side: "buy",
      units: unitCount,
      idr,
      occurred_on: occurredOn,
      opening: false,
      wallet_id: walletId,
      txn_id: created ? Number(created.id) : null,
    });
    if (error) return { error: error.message };

    revalidateCrypto();
    return { ok: true, nonce: Date.now() };
  }

  // --- Sell ---------------------------------------------------------------
  const { units: held, avgPerUnit } = cryptoPosition(
    await getCryptoTrades(),
    symbol
  );

  // Fractional units never compare cleanly, so selling out uses the same dust tolerance the
  // portfolio does — otherwise "sell everything" refuses on a rounding artefact.
  if (unitCount - held > DUST) {
    return { error: `You only hold ${formatUnits(held)} ${symbol}.` };
  }

  const realizedCost = Math.round(unitCount * avgPerUnit);
  const realizedPl = idr - realizedCost;

  // Resolve the P/L category BEFORE writing anything.
  const plKey = realizedPl >= 0 ? "cat_crypto_profit" : "cat_crypto_loss";
  const plCategoryId = realizedPl === 0 ? null : await resolveCategoryId(plKey);
  if (realizedPl !== 0 && plCategoryId === null) {
    return { error: unmappedError(plKey) };
  }

  // Cost basis comes back out of the bucket.
  const { data: costRow } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      type: "withdrawal",
      amount: realizedCost,
      description: `Sell ${formatUnits(unitCount)} ${symbol}`,
      category_id: cryptoCategoryId,
      source_wallet_id: null,
      dest_wallet_id: walletId,
    })
    .select("id")
    .maybeSingle();

  let plTxnId: number | null = null;
  if (realizedPl !== 0 && plCategoryId !== null) {
    const { data: plRow } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: realizedPl > 0 ? "income" : "expense",
        amount: Math.abs(realizedPl),
        description: `${realizedPl > 0 ? "Profit" : "Loss"} ${symbol}`,
        category_id: plCategoryId,
        source_wallet_id: realizedPl > 0 ? null : walletId,
        dest_wallet_id: realizedPl > 0 ? walletId : null,
      })
      .select("id")
      .maybeSingle();
    plTxnId = plRow ? Number(plRow.id) : null;
  }

  const { error } = await sb.from("crypto_trades").insert({
    symbol,
    side: "sell",
    units: unitCount,
    idr,
    occurred_on: occurredOn,
    opening: false,
    wallet_id: walletId,
    txn_id: costRow ? Number(costRow.id) : null,
    pl_txn_id: plTxnId,
    realized_pl: realizedPl,
  });
  if (error) return { error: error.message };

  revalidateCrypto();
  return { ok: true, nonce: Date.now() };
}

/** Delete a trade and both ledger rows it booked. */
export async function deleteCryptoTrade(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: trade } = await sb
    .from("crypto_trades")
    .select("txn_id, pl_txn_id")
    .eq("id", id)
    .maybeSingle();

  const txnIds = [trade?.txn_id, trade?.pl_txn_id].filter(
    (v): v is number => v != null
  );
  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("crypto_trades").delete().eq("id", id);
  revalidateCrypto();
}

"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId, unmappedError } from "@/lib/settings";
import { forexAvgCost, getForexTransactions } from "@/lib/forex";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const units = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();

export interface ForexState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateForex() {
  revalidatePath("/more/forex");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  revalidatePath("/charts");
}

/**
 * Add a currency, optionally with an opening balance.
 *
 * An opening balance is seeded as a WALLET-LESS `buy` so the holding starts with a real cost
 * basis — without it, the first sell would compute its entire proceeds as profit.
 */
export async function addForexAccount(formData: FormData): Promise<void> {
  const currency = text(formData.get("currency")).toUpperCase();
  const name = text(formData.get("name")) || currency;
  if (!currency) return;

  const openingUnits = units(formData.get("opening_units"));
  const openingIdr = digits(formData.get("opening_idr"));

  const sb = supabaseServer();
  const { data: created } = await sb
    .from("forex_accounts")
    .insert({ name, currency, units: openingUnits })
    .select("id")
    .maybeSingle();
  if (!created) return;

  if (openingUnits > 0) {
    await sb.from("forex_transactions").insert({
      account_id: Number(created.id),
      occurred_on: text(formData.get("opening_date")) || "1900-01-01",
      direction: "buy",
      idr: openingIdr,
      units: openingUnits,
      wallet_id: null,
      txn_id: null,
    });
  }

  revalidateForex();
}

export async function deleteForexAccount(id: number): Promise<void> {
  const sb = supabaseServer();

  const { data: rows } = await sb
    .from("forex_transactions")
    .select("txn_id, pl_txn_id")
    .eq("account_id", id);

  const txnIds = ((rows ?? []) as { txn_id: number | null; pl_txn_id: number | null }[])
    .flatMap((r) => [r.txn_id, r.pl_txn_id])
    .filter((v): v is number => v != null);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("forex_accounts").delete().eq("id", id);
  revalidateForex();
}

/** Correct a balance directly, with no transaction booked. */
export async function setForexBalance(formData: FormData): Promise<void> {
  const accountId = optInt(formData.get("account_id"));
  if (!accountId) return;

  await supabaseServer()
    .from("forex_accounts")
    .update({ units: units(formData.get("units")) })
    .eq("id", accountId);

  revalidateForex();
}

/**
 * Convert IDR to foreign currency and back.
 *
 * A buy moves money into the forex bucket. A sell brings the COST BASIS back out and books the
 * gain or loss as its own row — same split as a stock sale, and for the same reason: only the
 * original cost belongs to the bucket.
 *
 * Every mapping is resolved before the first write.
 */
export async function convertForex(
  _prev: ForexState,
  formData: FormData
): Promise<ForexState> {
  const accountId = optInt(formData.get("account_id"));
  const direction = text(formData.get("direction")) === "sell" ? "sell" : "buy";
  const idr = digits(formData.get("idr"));
  const unitCount = units(formData.get("units"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));

  if (!accountId) return { error: "Choose a currency." };
  if (idr <= 0) return { error: "Enter an amount in rupiah." };
  if (unitCount <= 0) return { error: "Enter how many units." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const forexCategoryId = await resolveCategoryId("cat_forex");
  if (forexCategoryId === null) return { error: unmappedError("cat_forex") };

  const sb = supabaseServer();
  const { data: account } = await sb
    .from("forex_accounts")
    .select("id, currency, units")
    .eq("id", accountId)
    .maybeSingle();
  if (!account) return { error: "That currency no longer exists." };

  const currency = String(account.currency);
  const currentUnits = Number(account.units ?? 0);

  if (direction === "buy") {
    const { data: created } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "investment",
        amount: idr,
        description: `Buy ${currency} (forex)`,
        category_id: forexCategoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();

    await sb.from("forex_transactions").insert({
      account_id: accountId,
      occurred_on: occurredOn,
      direction: "buy",
      idr,
      units: unitCount,
      wallet_id: walletId,
      txn_id: created ? Number(created.id) : null,
    });

    await sb
      .from("forex_accounts")
      .update({ units: currentUnits + unitCount })
      .eq("id", accountId);

    revalidateForex();
    return { ok: true, nonce: Date.now() };
  }

  // --- Sell ---------------------------------------------------------------
  if (unitCount > currentUnits) {
    return { error: `You only hold ${currentUnits} ${currency}.` };
  }

  const history = await getForexTransactions(accountId);
  const avgCost = forexAvgCost(history);
  const realizedCost = Math.round(avgCost * unitCount);
  const realizedPl = idr - realizedCost;

  const plKey = realizedPl >= 0 ? "cat_forex_profit" : "cat_forex_loss";
  const plCategoryId = realizedPl === 0 ? null : await resolveCategoryId(plKey);
  if (realizedPl !== 0 && plCategoryId === null) {
    return { error: unmappedError(plKey) };
  }

  const { data: costRow } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      type: "withdrawal",
      amount: realizedCost,
      description: `Sell ${currency} (forex)`,
      category_id: forexCategoryId,
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
        description: `${realizedPl > 0 ? "Profit" : "Loss"} ${currency} (forex)`,
        category_id: plCategoryId,
        source_wallet_id: realizedPl > 0 ? null : walletId,
        dest_wallet_id: realizedPl > 0 ? walletId : null,
      })
      .select("id")
      .maybeSingle();
    plTxnId = plRow ? Number(plRow.id) : null;
  }

  await sb.from("forex_transactions").insert({
    account_id: accountId,
    occurred_on: occurredOn,
    direction: "sell",
    idr,
    units: unitCount,
    wallet_id: walletId,
    txn_id: costRow ? Number(costRow.id) : null,
    pl_txn_id: plTxnId,
    realized_pl: realizedPl,
  });

  await sb
    .from("forex_accounts")
    .update({ units: currentUnits - unitCount })
    .eq("id", accountId);

  revalidateForex();
  return { ok: true, nonce: Date.now() };
}

/**
 * Edit a forex conversion from the History editor.
 *
 * This FULLY REVERTS and RE-BOOKS rather than patching in place. A sell's cost basis depends
 * on every other conversion in the log, so changing one row's units, amount or date can change
 * what the correct realized P/L was — patching the visible fields would leave a stale P/L row
 * behind.
 */
export async function updateForexTransaction(
  id: number,
  formData: FormData
): Promise<ForexState> {
  const sb = supabaseServer();

  const { data: existing } = await sb
    .from("forex_transactions")
    .select("id, account_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "That conversion no longer exists." };

  // Revert first: this restores the balance and clears the old ledger rows, so the re-book
  // computes its cost basis against a log that no longer contains this row.
  await deleteForexTransaction(id);

  const rebooked = new FormData();
  rebooked.set("account_id", String(formData.get("account_id") ?? existing.account_id));
  rebooked.set("direction", String(formData.get("direction") ?? "buy"));
  rebooked.set("idr", String(formData.get("idr") ?? ""));
  rebooked.set("units", String(formData.get("units") ?? ""));
  rebooked.set("occurred_on", String(formData.get("occurred_on") ?? ""));
  rebooked.set("wallet_id", String(formData.get("wallet_id") ?? ""));

  return convertForex({}, rebooked);
}

/** Delete a conversion, its ledger rows, and undo its effect on the balance. */
export async function deleteForexTransaction(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: row } = await sb
    .from("forex_transactions")
    .select("account_id, direction, units, txn_id, pl_txn_id")
    .eq("id", id)
    .maybeSingle();
  if (!row) return;

  const txnIds = [row.txn_id, row.pl_txn_id].filter(
    (v): v is number => v != null
  );
  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  const { data: account } = await sb
    .from("forex_accounts")
    .select("units")
    .eq("id", row.account_id)
    .maybeSingle();

  if (account) {
    const delta = row.direction === "buy" ? -Number(row.units) : Number(row.units);
    await sb
      .from("forex_accounts")
      .update({ units: Number(account.units ?? 0) + delta })
      .eq("id", row.account_id);
  }

  await sb.from("forex_transactions").delete().eq("id", id);
  revalidateForex();
}

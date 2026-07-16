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

export interface StockState {
  ok?: boolean;
  error?: string;
  nonce?: number;
  savedLabel?: string;
}

function revalidate() {
  revalidatePath("/stocks");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
}

export async function addStockTrade(_prev: StockState, formData: FormData): Promise<StockState> {
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase();
  const side = String(formData.get("side") ?? "buy") === "sell" ? "sell" : "buy";
  const lots = digits(formData.get("lots"));
  const idr = digits(formData.get("idr")); // money spent (buy) / received (sell)
  const walletId = optInt(formData.get("wallet_id"));
  const date = String(formData.get("date") ?? "");

  if (!ticker) return { error: "Enter a ticker." };
  if (!lots) return { error: "Enter the number of lots." };
  if (!idr) return { error: side === "buy" ? "Enter money spent." : "Enter money received." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const sb = supabaseServer();
  const stockCat = await resolveCategoryId("cat_stock", "Stock", "investment");

  let txnId: number | null = null;
  let plTxnId: number | null = null;
  let realizedPl: number | null = null;
  let savedLabel = `Bought ${ticker}`;

  if (side === "buy") {
    // Buy = investment out of the wallet into the Stock bucket.
    const { data: txn, error } = await sb
      .from("transactions")
      .insert({
        occurred_on: date,
        type: "investment",
        amount: idr,
        description: `Beli ${ticker} ${lots} lot`,
        category_id: stockCat,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .single();
    if (error) return { error: error.message };
    txnId = txn?.id ?? null;
  } else {
    // Sell = withdraw the COST BASIS of the sold lots back to the wallet, then book the
    // realized P/L (proceeds − cost) as Income:Trading (profit) or Expense:Cut Loss (loss).
    const { data: prior } = await sb.from("stock_trades").select("side, lots, idr").eq("ticker", ticker);
    let buyLots = 0;
    let buyIdr = 0;
    for (const t of prior ?? []) {
      if ((t as { side: string }).side === "buy") {
        buyLots += (t as { lots: number }).lots;
        buyIdr += (t as { idr: number }).idr;
      }
    }
    const avgPerLot = buyLots ? buyIdr / buyLots : 0;
    const realizedCost = Math.round(lots * avgPerLot);
    realizedPl = idr - realizedCost; // proceeds − cost basis

    if (realizedCost > 0) {
      const { data: wtxn, error } = await sb
        .from("transactions")
        .insert({
          occurred_on: date,
          type: "withdrawal",
          amount: realizedCost,
          description: `Jual ${ticker} ${lots} lot`,
          category_id: stockCat,
          source_wallet_id: null,
          dest_wallet_id: walletId,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      txnId = wtxn?.id ?? null;
    }

    if (realizedPl > 0) {
      const tradingCat = await resolveCategoryId("cat_stock_profit", "Trading", "income");
      const { data: ptxn, error } = await sb
        .from("transactions")
        .insert({
          occurred_on: date,
          type: "income",
          amount: realizedPl,
          description: `Profit ${ticker} ${lots} lot`,
          category_id: tradingCat,
          source_wallet_id: null,
          dest_wallet_id: walletId,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      plTxnId = ptxn?.id ?? null;
      savedLabel = `Sold ${ticker} · profit`;
    } else if (realizedPl < 0) {
      const cutCat = await resolveCategoryId("cat_stock_loss", "Cut Loss", "expense");
      const { data: ptxn, error } = await sb
        .from("transactions")
        .insert({
          occurred_on: date,
          type: "expense",
          amount: -realizedPl,
          description: `Cut loss ${ticker} ${lots} lot`,
          category_id: cutCat,
          source_wallet_id: walletId,
          dest_wallet_id: null,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      plTxnId = ptxn?.id ?? null;
      savedLabel = `Sold ${ticker} · loss`;
    } else {
      savedLabel = `Sold ${ticker}`;
    }
  }

  const { error: stErr } = await sb.from("stock_trades").insert({
    ticker,
    side,
    lots,
    idr,
    occurred_on: date,
    opening: false,
    wallet_id: walletId,
    txn_id: txnId,
    pl_txn_id: plTxnId,
    realized_pl: realizedPl,
  });
  if (stErr) return { error: stErr.message };

  revalidate();
  return { ok: true, nonce: Date.now(), savedLabel };
}

// Log a cash dividend received from a stock: books it as income ("Dividen") into the
// chosen wallet and records it in stock_dividends for the per-ticker lifetime total.
export async function addStockDividend(_prev: StockState, formData: FormData): Promise<StockState> {
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const idr = digits(formData.get("idr"));
  const walletId = optInt(formData.get("wallet_id"));
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!ticker) return { error: "Enter a ticker." };
  if (!idr) return { error: "Enter the dividend amount." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const sb = supabaseServer();
  const divCat = await resolveCategoryId("cat_stock_dividend", "Dividen", "income");

  const { data: txn, error } = await sb
    .from("transactions")
    .insert({
      occurred_on: date,
      type: "income",
      amount: idr,
      description: `Dividen ${ticker}`,
      category_id: divCat,
      source_wallet_id: null,
      dest_wallet_id: walletId,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const { error: dErr } = await sb.from("stock_dividends").insert({
    ticker,
    idr,
    occurred_on: date,
    wallet_id: walletId,
    txn_id: txn?.id ?? null,
    note,
  });
  if (dErr) {
    if (txn?.id) await sb.from("transactions").delete().eq("id", txn.id); // don't orphan the income row
    return { error: dErr.message };
  }

  revalidate();
  return { ok: true, nonce: Date.now(), savedLabel: `Dividend ${ticker}` };
}

export async function deleteStockDividend(id: number) {
  const sb = supabaseServer();
  const { data: d } = await sb.from("stock_dividends").select("txn_id").eq("id", id).maybeSingle();
  await sb.from("stock_dividends").delete().eq("id", id);
  if (d?.txn_id) await sb.from("transactions").delete().eq("id", d.txn_id);
  revalidate();
}

function revalidateStockTargets() {
  revalidatePath("/stocks");
  revalidatePath("/stocks/targets");
  revalidatePath("/dashboard");
  revalidatePath("/more/cashflow");
}

// Set a buy target of `lots` (optional speculative price) for a ticker. Same scopes as
// category budgets: "month" = this month only (per-month override); "forward" = this month
// and every month after (a base rule, clearing later rules/overrides); "all" = every month
// (a single base rule from the beginning, clearing all rules/overrides).
export async function saveStockTarget(formData: FormData) {
  const ticker = String(formData.get("ticker") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const lots = digits(formData.get("lots"));
  const price = digits(formData.get("price"));
  const month = String(formData.get("month") ?? "");
  const scope = String(formData.get("scope") ?? "forward");
  if (!ticker || lots <= 0) return;
  const priceVal = price > 0 ? price : null;
  const validMonth = /^\d{4}-\d{2}-01$/.test(month);
  const sb = supabaseServer();

  if (scope === "all") {
    // One base rule from the dawn of time; wipe every override and other rule.
    await sb.from("stock_targets").delete().eq("ticker", ticker);
    await sb.from("stock_target_months").delete().eq("ticker", ticker);
    const { error } = await sb.from("stock_targets").insert({ ticker, lots, price: priceVal, effective_from: "1900-01-01" });
    if (error) throw new Error(`Couldn't save stock target: ${error.message}`);
  } else if (scope === "month" && validMonth) {
    const { error } = await sb
      .from("stock_target_months")
      .upsert({ ticker, month, lots, price: priceVal }, { onConflict: "ticker,month" });
    if (error) throw new Error(`Couldn't save this month's target: ${error.message}`);
  } else if (validMonth) {
    // Authoritative from this month on: drop later rules + overrides, set the rule here.
    await sb.from("stock_targets").delete().eq("ticker", ticker).gt("effective_from", month);
    await sb.from("stock_target_months").delete().eq("ticker", ticker).gte("month", month);
    const { error } = await sb
      .from("stock_targets")
      .upsert({ ticker, lots, price: priceVal, effective_from: month }, { onConflict: "ticker,effective_from" });
    if (error) throw new Error(`Couldn't save stock target: ${error.message}`);
  }
  revalidateStockTargets();
}

// Remove a target entirely: the base and every per-month override for the ticker.
export async function deleteStockTarget(ticker: string) {
  const sb = supabaseServer();
  await sb.from("stock_targets").delete().eq("ticker", ticker);
  await sb.from("stock_target_months").delete().eq("ticker", ticker);
  revalidateStockTargets();
}

// Drop just one month's override so the ticker reverts to its every-month base.
export async function clearStockTargetMonth(ticker: string, month: string) {
  if (!/^\d{4}-\d{2}-01$/.test(month)) return;
  await supabaseServer().from("stock_target_months").delete().eq("ticker", ticker).eq("month", month);
  revalidateStockTargets();
}

export async function deleteStockTrade(id: number) {
  const sb = supabaseServer();
  const { data: t } = await sb.from("stock_trades").select("txn_id, pl_txn_id").eq("id", id).maybeSingle();
  await sb.from("stock_trades").delete().eq("id", id);
  // Reverse both the cost-basis/investment movement and the realized-P/L entry.
  if (t?.txn_id) await sb.from("transactions").delete().eq("id", t.txn_id);
  if (t?.pl_txn_id) await sb.from("transactions").delete().eq("id", t.pl_txn_id);
  revalidate();
}

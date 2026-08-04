"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId, unmappedError } from "@/lib/settings";
import { getStockTrades } from "@/lib/stocks";
import type { SaveScope } from "@/lib/types";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const monthDate = (v: FormDataEntryValue | null) => {
  const m = /^(\d{4}-\d{2})(?:-\d{2})?$/.exec(String(v ?? "").trim());
  return m ? `${m[1]}-01` : null;
};

export interface StockState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateStocks() {
  revalidatePath("/stocks");
  revalidatePath("/stocks/targets");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  revalidatePath("/charts");
  revalidatePath("/more/cashflow");
}

// =============================================================================
// Trades
// =============================================================================

/**
 * Record a buy or a sell.
 *
 * A sell books TWO ledger rows: a `withdrawal` of the cost basis back into the wallet, plus a
 * separate P/L row — income on a profit, expense on a loss. Splitting them is what keeps the
 * savings bucket balance honest: only the original cost comes back out of the bucket, and the
 * gain or loss is recognised as its own flow.
 *
 * Every mapping is resolved BEFORE the first write (ATLAS.md §11). A sale inserts three rows;
 * discovering `cat_stock_profit` unmapped halfway through would leave a half-booked trade.
 */
export async function recordStockTrade(
  _prev: StockState,
  formData: FormData
): Promise<StockState> {
  const ticker = text(formData.get("ticker")).toUpperCase();
  const side = text(formData.get("side")) === "sell" ? "sell" : "buy";
  const lots = optInt(formData.get("lots"));
  const idr = digits(formData.get("idr"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));
  // An opening position establishes cost basis without moving any money.
  const opening = text(formData.get("opening")) === "1";

  if (!ticker) return { error: "Enter a ticker." };
  if (!lots) return { error: "Enter how many lots." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!opening && idr <= 0) return { error: "Enter an amount." };
  if (!opening && !walletId) return { error: "Choose a wallet." };

  const sb = supabaseServer();

  if (opening) {
    const { error } = await sb.from("stock_trades").insert({
      ticker,
      side: "buy",
      lots,
      idr,
      occurred_on: occurredOn,
      opening: true,
      wallet_id: null,
      txn_id: null,
    });
    if (error) return { error: error.message };
    revalidateStocks();
    return { ok: true, nonce: Date.now() };
  }

  // --- Resolve every mapping this path needs, up front --------------------
  const stockCategoryId = await resolveCategoryId("cat_stock");
  if (stockCategoryId === null) return { error: unmappedError("cat_stock") };

  if (side === "buy") {
    const { data: created } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "investment",
        amount: idr,
        description: `Buy ${ticker} ${lots} lot`,
        category_id: stockCategoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();

    const { error } = await sb.from("stock_trades").insert({
      ticker,
      side: "buy",
      lots,
      idr,
      occurred_on: occurredOn,
      opening: false,
      wallet_id: walletId,
      txn_id: created ? Number(created.id) : null,
    });
    if (error) return { error: error.message };

    revalidateStocks();
    return { ok: true, nonce: Date.now() };
  }

  // --- Sell ---------------------------------------------------------------
  const trades = await getStockTrades();
  const forTicker = trades.filter((t) => t.ticker === ticker);
  const buyLots = forTicker
    .filter((t) => t.side === "buy")
    .reduce((sum, t) => sum + t.lots, 0);
  const sellLots = forTicker
    .filter((t) => t.side === "sell")
    .reduce((sum, t) => sum + t.lots, 0);
  const held = buyLots - sellLots;

  if (held < lots) {
    return { error: `You only hold ${held} lot${held === 1 ? "" : "s"} of ${ticker}.` };
  }

  // Average cost, per lot.
  const buyIdr = forTicker
    .filter((t) => t.side === "buy")
    .reduce((sum, t) => sum + t.idr, 0);
  const avgPerLot = buyLots > 0 ? buyIdr / buyLots : 0;
  const realizedCost = Math.round(lots * avgPerLot);
  const realizedPl = idr - realizedCost;

  // Resolve the P/L category BEFORE writing anything.
  const plKey = realizedPl >= 0 ? "cat_stock_profit" : "cat_stock_loss";
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
      description: `Sell ${ticker} ${lots} lot`,
      category_id: stockCategoryId,
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
        description: `${realizedPl > 0 ? "Profit" : "Loss"} ${ticker} ${lots} lot`,
        category_id: plCategoryId,
        source_wallet_id: realizedPl > 0 ? null : walletId,
        dest_wallet_id: realizedPl > 0 ? walletId : null,
      })
      .select("id")
      .maybeSingle();
    plTxnId = plRow ? Number(plRow.id) : null;
  }

  const { error } = await sb.from("stock_trades").insert({
    ticker,
    side: "sell",
    lots,
    idr,
    occurred_on: occurredOn,
    opening: false,
    wallet_id: walletId,
    txn_id: costRow ? Number(costRow.id) : null,
    pl_txn_id: plTxnId,
    realized_pl: realizedPl,
  });
  if (error) return { error: error.message };

  revalidateStocks();
  return { ok: true, nonce: Date.now() };
}

/** Delete a trade and both ledger rows it booked. */
export async function deleteStockTrade(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: trade } = await sb
    .from("stock_trades")
    .select("txn_id, pl_txn_id")
    .eq("id", id)
    .maybeSingle();

  const txnIds = [trade?.txn_id, trade?.pl_txn_id].filter(
    (v): v is number => v != null
  );
  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("stock_trades").delete().eq("id", id);
  revalidateStocks();
}

// =============================================================================
// Dividends
// =============================================================================

export async function recordStockDividend(
  _prev: StockState,
  formData: FormData
): Promise<StockState> {
  const ticker = text(formData.get("ticker")).toUpperCase();
  const idr = digits(formData.get("idr"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));

  if (!ticker) return { error: "Enter a ticker." };
  if (idr <= 0) return { error: "Enter an amount." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  const categoryId = await resolveCategoryId("cat_stock_dividend");
  if (categoryId === null) return { error: unmappedError("cat_stock_dividend") };

  const sb = supabaseServer();
  const { data: created } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      type: "income",
      amount: idr,
      description: `Dividend ${ticker}`,
      category_id: categoryId,
      source_wallet_id: null,
      dest_wallet_id: walletId,
    })
    .select("id")
    .maybeSingle();

  const { error } = await sb.from("stock_dividends").insert({
    ticker,
    idr,
    occurred_on: occurredOn,
    wallet_id: walletId,
    txn_id: created ? Number(created.id) : null,
    note: text(formData.get("note")) || null,
  });
  if (error) return { error: error.message };

  revalidateStocks();
  return { ok: true, nonce: Date.now() };
}

export async function deleteStockDividend(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: dividend } = await sb
    .from("stock_dividends")
    .select("txn_id")
    .eq("id", id)
    .maybeSingle();

  if (dividend?.txn_id) {
    await sb.from("transactions").delete().eq("id", dividend.txn_id);
  }
  await sb.from("stock_dividends").delete().eq("id", id);
  revalidateStocks();
}

// =============================================================================
// Buy targets — the same three save scopes as budgets (ATLAS.md §3.4)
// =============================================================================

const FOREVER = "1900-01-01";

export async function saveStockTarget(formData: FormData): Promise<void> {
  const ticker = text(formData.get("ticker")).toUpperCase();
  const month = monthDate(formData.get("month"));
  const lots = optInt(formData.get("lots"));
  const rawPrice = digits(formData.get("price"));
  const price = rawPrice > 0 ? rawPrice : null;
  const scope = String(formData.get("scope") ?? "forward") as SaveScope;

  if (!ticker || !month || !lots) return;

  const sb = supabaseServer();

  if (scope === "all") {
    await sb.from("stock_targets").delete().eq("ticker", ticker);
    await sb.from("stock_target_months").delete().eq("ticker", ticker);
    await sb
      .from("stock_targets")
      .insert({ ticker, lots, price, effective_from: FOREVER });
  } else if (scope === "forward") {
    await sb
      .from("stock_targets")
      .delete()
      .eq("ticker", ticker)
      .gt("effective_from", month);
    await sb
      .from("stock_target_months")
      .delete()
      .eq("ticker", ticker)
      .gte("month", month);
    await sb
      .from("stock_targets")
      .upsert(
        { ticker, lots, price, effective_from: month },
        { onConflict: "ticker,effective_from" }
      );
  } else {
    await sb
      .from("stock_target_months")
      .upsert({ ticker, month, lots, price }, { onConflict: "ticker,month" });
  }

  revalidateStocks();
}

/** Drop this month's override so the base rule applies again. */
export async function revertStockTarget(formData: FormData): Promise<void> {
  const ticker = text(formData.get("ticker")).toUpperCase();
  const month = monthDate(formData.get("month"));
  if (!ticker || !month) return;

  await supabaseServer()
    .from("stock_target_months")
    .delete()
    .eq("ticker", ticker)
    .eq("month", month);

  revalidateStocks();
}

export async function deleteStockTarget(formData: FormData): Promise<void> {
  const ticker = text(formData.get("ticker")).toUpperCase();
  if (!ticker) return;

  const sb = supabaseServer();
  await sb.from("stock_targets").delete().eq("ticker", ticker);
  await sb.from("stock_target_months").delete().eq("ticker", ticker);

  revalidateStocks();
}

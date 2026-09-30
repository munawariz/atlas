"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabaseServer";
import { resolveCategoryId, unmappedError } from "@/lib/settings";
import {
  CENT,
  DUST,
  etfBook,
  getEtfTrades,
  withdrawalCost,
} from "@/lib/etf";
import { formatUnits, formatUsd } from "@/lib/format";

const digits = (v: FormDataEntryValue | null) =>
  parseInt(String(v ?? "").replace(/\D/g, "") || "0", 10);
const optInt = (v: FormDataEntryValue | null) => {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const decimal = (v: FormDataEntryValue | null) =>
  parseFloat(String(v ?? "").replace(/[^0-9.]/g, "")) || 0;
const text = (v: FormDataEntryValue | null) => String(v ?? "").trim();
/** Dollars are stored to the cent. */
const cents = (n: number) => Math.round(n * 100) / 100;

export interface EtfState {
  ok?: boolean;
  error?: string;
  nonce?: number;
}

function revalidateEtf() {
  revalidatePath("/etf");
  revalidatePath("/dashboard");
  revalidatePath("/savings");
  revalidatePath("/history");
  revalidatePath("/charts");
}

/** One broker's cash and positions, from the same walk the page renders. */
async function bookFor(accountId: number) {
  const trades = await getEtfTrades();
  return etfBook(trades.filter((t) => t.account_id === accountId));
}

/** Every ledger row an entry can have booked: the move itself, its P/L, its fee and its tax. */
const LINKED_TXNS = "txn_id, pl_txn_id, fee_txn_id, tax_txn_id";
type LinkedTxns = Record<"txn_id" | "pl_txn_id" | "fee_txn_id" | "tax_txn_id", number | null>;
const linkedIds = (r: LinkedTxns) =>
  [r.txn_id, r.pl_txn_id, r.fee_txn_id, r.tax_txn_id].filter(
    (v): v is number => v != null
  );

async function brokerName(accountId: number): Promise<string | null> {
  const { data } = await supabaseServer()
    .from("etf_accounts")
    .select("name")
    .eq("id", accountId)
    .maybeSingle();
  return data ? String(data.name) : null;
}

// =============================================================================
// Brokers
// =============================================================================

export async function addEtfBroker(
  _prev: EtfState,
  formData: FormData
): Promise<EtfState> {
  const name = text(formData.get("name"));
  if (!name) return { error: "Name the broker." };

  const { error } = await supabaseServer().from("etf_accounts").insert({ name });
  if (error) {
    return {
      error: error.code === "23505" ? `${name} already exists.` : error.message,
    };
  }

  revalidateEtf();
  return { ok: true, nonce: Date.now() };
}

/** Delete a broker, every entry recorded against it, and every ledger row those booked. */
export async function deleteEtfBroker(id: number): Promise<void> {
  const sb = supabaseServer();

  const { data: rows } = await sb
    .from("etf_trades")
    .select(LINKED_TXNS)
    .eq("account_id", id);

  const txnIds = ((rows ?? []) as LinkedTxns[]).flatMap(linkedIds);

  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  // etf_trades cascade with the account.
  await sb.from("etf_accounts").delete().eq("id", id);
  revalidateEtf();
}

// =============================================================================
// Money in and out: the only entries that touch the IDR ledger
// =============================================================================

/**
 * Top up a broker from a wallet, or withdraw USD back to one.
 *
 * A top-up is entered as the RUPIAH paid from the wallet; any fee and tax come off it first,
 * and the rest converts at the rate the broker gave. A withdrawal is entered in DOLLARS; the
 * rupiah it converts to follows from the rate, and any fee and tax come off that.
 *
 * A withdrawal books the same pair a stock sale does: a `withdrawal` of the rupiah those
 * dollars COST back out of the ETF bucket, plus a P/L row for the difference. That difference
 * is the whole rupiah outcome — ETF gains, dividends (which entered at zero rupiah cost) and
 * the exchange-rate move together.
 *
 * The fee and tax are each booked as their own `expense` from the wallet — the way a
 * transfer's admin fee is — so the wallet moves by the full amount paid while neither charge
 * enters the bucket's cost basis.
 *
 * Every mapping is resolved before the first write (ATLAS.md §11).
 */
export async function recordEtfMove(
  _prev: EtfState,
  formData: FormData
): Promise<EtfState> {
  const accountId = optInt(formData.get("account_id"));
  const side = text(formData.get("side")) === "withdraw" ? "withdraw" : "topup";
  const rate = decimal(formData.get("rate"));
  const occurredOn = text(formData.get("occurred_on"));
  const walletId = optInt(formData.get("wallet_id"));

  if (!accountId) return { error: "Choose a broker." };
  if (!(rate > 0)) return { error: "Enter the rate, in rupiah per dollar." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };
  if (!walletId) return { error: "Choose a wallet." };

  // Optional charges, in rupiah, always deducted from the rupiah side of the conversion: out
  // of what you pay before it is converted, or out of what a withdrawal brings in.
  const fee = digits(formData.get("fee"));
  const tax = digits(formData.get("tax"));

  // `idr` is the rupiah actually converted — the dollars' cost basis on a top-up, the gross
  // proceeds on a withdrawal. Never the charges.
  let idr: number;
  let usd: number;
  if (side === "topup") {
    const paid = digits(formData.get("idr"));
    if (paid <= 0) return { error: "Enter the rupiah you paid." };
    if (fee + tax >= paid) {
      return { error: "Fee and tax take the whole top-up — nothing is left to convert." };
    }
    idr = paid - fee - tax;
    usd = cents(idr / rate);
  } else {
    usd = cents(decimal(formData.get("usd")));
    if (usd <= 0) return { error: "Enter the dollars you withdrew." };
    idr = Math.round(usd * rate);
    if (fee + tax > idr) {
      return { error: "Fee and tax come to more than the withdrawal brings in." };
    }
  }
  if (usd <= 0) return { error: "That converts to less than a cent." };

  const broker = await brokerName(accountId);
  if (!broker) return { error: "That broker no longer exists." };

  const etfCategoryId = await resolveCategoryId("cat_etf");
  if (etfCategoryId === null) return { error: unmappedError("cat_etf") };

  const feeCategoryId = fee > 0 ? await resolveCategoryId("cat_etf_fee") : null;
  if (fee > 0 && feeCategoryId === null) return { error: unmappedError("cat_etf_fee") };
  const taxCategoryId = tax > 0 ? await resolveCategoryId("cat_etf_tax") : null;
  if (tax > 0 && taxCategoryId === null) return { error: unmappedError("cat_etf_tax") };

  const sb = supabaseServer();
  const what = `${side === "topup" ? "Top up" : "Withdraw"} ${broker}`;

  // Each charge is a plain expense from the wallet: it never enters the ETF bucket, so it
  // cannot distort the cost basis a later withdrawal takes back out.
  const bookCharge = async (
    amount: number,
    categoryId: number | null,
    label: string
  ): Promise<number | null> => {
    if (amount <= 0 || categoryId === null) return null;
    const { data } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "expense",
        amount,
        description: `${label} · ${what}`,
        category_id: categoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();
    return data ? Number(data.id) : null;
  };
  const charges = async () => ({
    fee: fee > 0 ? fee : null,
    tax: tax > 0 ? tax : null,
    fee_txn_id: await bookCharge(fee, feeCategoryId, "Conversion fee"),
    tax_txn_id: await bookCharge(tax, taxCategoryId, "Tax"),
  });

  if (side === "topup") {
    const { data: created } = await sb
      .from("transactions")
      .insert({
        occurred_on: occurredOn,
        type: "investment",
        amount: idr,
        description: `Top up ${broker} · ${formatUsd(usd)}`,
        category_id: etfCategoryId,
        source_wallet_id: walletId,
        dest_wallet_id: null,
      })
      .select("id")
      .maybeSingle();

    const { error } = await sb.from("etf_trades").insert({
      account_id: accountId,
      side: "topup",
      usd,
      idr,
      rate,
      occurred_on: occurredOn,
      wallet_id: walletId,
      txn_id: created ? Number(created.id) : null,
      ...(await charges()),
    });
    if (error) return { error: error.message };

    revalidateEtf();
    return { ok: true, nonce: Date.now() };
  }

  // --- Withdraw -----------------------------------------------------------
  const book = await bookFor(accountId);
  if (usd - book.cashUsd > CENT) {
    return { error: `${broker} only holds ${formatUsd(book.cashUsd)} in cash.` };
  }

  const realizedCost = withdrawalCost(book, usd);
  const realizedPl = idr - realizedCost;

  const plKey = realizedPl >= 0 ? "cat_etf_profit" : "cat_etf_loss";
  const plCategoryId = realizedPl === 0 ? null : await resolveCategoryId(plKey);
  if (realizedPl !== 0 && plCategoryId === null) {
    return { error: unmappedError(plKey) };
  }

  // Cost basis comes back out of the bucket. It can be zero — withdrawing cash that came only
  // from dividends — and the row is still booked, so the whole amount shows as profit beside it.
  const { data: costRow } = await sb
    .from("transactions")
    .insert({
      occurred_on: occurredOn,
      type: "withdrawal",
      amount: realizedCost,
      description: `Withdraw ${broker} · ${formatUsd(usd)}`,
      category_id: etfCategoryId,
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
        description: `${realizedPl > 0 ? "Profit" : "Loss"} ${broker} (ETF)`,
        category_id: plCategoryId,
        source_wallet_id: realizedPl > 0 ? null : walletId,
        dest_wallet_id: realizedPl > 0 ? walletId : null,
      })
      .select("id")
      .maybeSingle();
    plTxnId = plRow ? Number(plRow.id) : null;
  }

  const { error } = await sb.from("etf_trades").insert({
    account_id: accountId,
    side: "withdraw",
    usd,
    idr,
    rate,
    occurred_on: occurredOn,
    wallet_id: walletId,
    txn_id: costRow ? Number(costRow.id) : null,
    pl_txn_id: plTxnId,
    realized_pl: realizedPl,
    ...(await charges()),
  });
  if (error) return { error: error.message };

  revalidateEtf();
  return { ok: true, nonce: Date.now() };
}

// =============================================================================
// Inside the broker: USD only, no ledger rows
// =============================================================================

/**
 * Record a buy, a sell or a dividend. All three are in USD and stay at the broker.
 *
 * A dividend is USD income: it lands in the broker's cash and is totalled per ticker, but it
 * books nothing in the IDR ledger — see the note at the top of `lib/etf.ts`.
 */
export async function recordEtfTrade(
  _prev: EtfState,
  formData: FormData
): Promise<EtfState> {
  const accountId = optInt(formData.get("account_id"));
  const raw = text(formData.get("side"));
  const side = raw === "sell" ? "sell" : raw === "dividend" ? "dividend" : "buy";
  const ticker = text(formData.get("ticker")).toUpperCase();
  const units = decimal(formData.get("units"));
  const usd = cents(decimal(formData.get("usd")));
  const occurredOn = text(formData.get("occurred_on"));

  if (!accountId) return { error: "Choose a broker." };
  if (!ticker) return { error: "Enter a ticker." };
  if (side !== "dividend" && units <= 0) return { error: "Enter how many units." };
  if (usd <= 0) {
    return {
      error:
        side === "buy"
          ? "Enter the dollars you paid."
          : side === "sell"
            ? "Enter the dollars you received."
            : "Enter the dividend in dollars.",
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn)) return { error: "Pick a date." };

  const broker = await brokerName(accountId);
  if (!broker) return { error: "That broker no longer exists." };

  const book = await bookFor(accountId);

  if (side === "buy" && usd - book.cashUsd > CENT) {
    return {
      error: `${broker} only holds ${formatUsd(book.cashUsd)} in cash. Top up first.`,
    };
  }

  if (side === "sell") {
    const held = book.positions.get(ticker)?.units ?? 0;
    // Fractional units never compare cleanly — same dust tolerance the portfolio uses.
    if (units - held > DUST) {
      return { error: `You only hold ${formatUnits(held)} ${ticker} at ${broker}.` };
    }
  }

  const { error } = await supabaseServer().from("etf_trades").insert({
    account_id: accountId,
    side,
    ticker,
    units: side === "dividend" ? null : units,
    usd,
    occurred_on: occurredOn,
  });
  if (error) return { error: error.message };

  revalidateEtf();
  return { ok: true, nonce: Date.now() };
}

/** Delete one entry and any ledger rows it booked. */
export async function deleteEtfTrade(id: number): Promise<void> {
  const sb = supabaseServer();
  const { data: trade } = await sb
    .from("etf_trades")
    .select(LINKED_TXNS)
    .eq("id", id)
    .maybeSingle();

  const txnIds = trade ? linkedIds(trade as LinkedTxns) : [];
  if (txnIds.length > 0) {
    await sb.from("transactions").delete().in("id", txnIds);
  }

  await sb.from("etf_trades").delete().eq("id", id);
  revalidateEtf();
}

import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable, isMissingFunction } from "./supabaseServer";
import type { ForexAccount, ForexTransaction } from "./types";

/**
 * Foreign-currency holdings.
 *
 * These are tracked in their own currency and are NEVER counted in IDR net worth (ATLAS.md
 * §3.2) — they appear on their own line with a live reference rate.
 */

/** Used only when the rate API is unreachable. A reference figure, never a booked one. */
export const FALLBACK_RATE: Record<string, number> = { JPY: 110 };

export async function getForexAccounts(): Promise<ForexAccount[]> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("forex_accounts")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }
  // Postgres `numeric` comes back as a string (ATLAS.md §14.5).
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    name: String(row.name),
    currency: String(row.currency),
    units: Number(row.units ?? 0),
  }));
}

// One fetch of the whole table per request, shared via cache(). The dashboard, the forex
// page and the snapshot all loop "one query per account" — filtering the shared set in JS
// turns K accounts x 1 query into a single query per request. Per-account order is preserved
// because the global sort (occurred_on asc, id asc) is stable under filtering.
const getAllForexTransactions = cache(async (): Promise<ForexTransaction[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("forex_transactions")
    .select("*")
    .order("occurred_on", { ascending: true })
    .order("id", { ascending: true });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    account_id: Number(row.account_id),
    occurred_on: String(row.occurred_on),
    direction: row.direction as "buy" | "sell",
    idr: Number(row.idr ?? 0),
    units: Number(row.units ?? 0),
    wallet_id: row.wallet_id == null ? null : Number(row.wallet_id),
    txn_id: row.txn_id == null ? null : Number(row.txn_id),
    pl_txn_id: row.pl_txn_id == null ? null : Number(row.pl_txn_id),
    realized_pl: row.realized_pl == null ? null : Number(row.realized_pl),
  }));
});

export async function getForexTransactions(
  accountId?: number
): Promise<ForexTransaction[]> {
  const all = await getAllForexTransactions();
  return accountId ? all.filter((t) => t.account_id === accountId) : all;
}

/**
 * Every ledger txn id booked by the forex module. History routes these rows to the
 * conversion editor instead of the plain edit sheet.
 *
 * Prefers the fn_forex_linked_txn_ids RPC (id set only, 0002_perf_rpc.sql); falls back to
 * deriving the set from the shared full-table fetch on an un-migrated database.
 */
export async function getForexLinkedTxnIds(): Promise<number[]> {
  const sb = supabaseServer();
  const { data, error } = await sb.rpc("fn_forex_linked_txn_ids");
  if (!error) {
    return ((data ?? []) as { id: number }[]).map((r) => Number(r.id));
  }
  if (!isMissingFunction(error) && !isMissingTable(error)) throw error;

  const all = await getAllForexTransactions();
  const ids = new Set<number>();
  for (const row of all) {
    if (row.txn_id != null) ids.add(row.txn_id);
    if (row.pl_txn_id != null) ids.add(row.pl_txn_id);
  }
  return [...ids];
}

/** Lets the history editor detect that a ledger row was booked by the forex module. */
export async function getForexTxnByTxnId(
  txnId: number
): Promise<ForexTransaction | null> {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("forex_transactions")
    .select("*")
    .or(`txn_id.eq.${txnId},pl_txn_id.eq.${txnId}`)
    .maybeSingle();
  if (error) {
    if (isMissingTable(error)) return null;
    throw error;
  }
  if (!data) return null;

  const row = data as Record<string, unknown>;
  return {
    id: Number(row.id),
    account_id: Number(row.account_id),
    occurred_on: String(row.occurred_on),
    direction: row.direction as "buy" | "sell",
    idr: Number(row.idr ?? 0),
    units: Number(row.units ?? 0),
    wallet_id: row.wallet_id == null ? null : Number(row.wallet_id),
    txn_id: row.txn_id == null ? null : Number(row.txn_id),
    pl_txn_id: row.pl_txn_id == null ? null : Number(row.pl_txn_id),
    realized_pl: row.realized_pl == null ? null : Number(row.realized_pl),
  };
}

/**
 * Average cost per unit — PURE, so it can be unit-reasoned about and reused by the sell path.
 *
 * A chronological walk: buys add units and cost; sells remove cost in proportion to the units
 * sold. That proportionality is what makes it average-cost rather than FIFO.
 */
export function forexAvgCost(
  txns: Pick<ForexTransaction, "direction" | "idr" | "units" | "occurred_on">[]
): number {
  const ordered = [...txns].sort((a, b) =>
    a.occurred_on === b.occurred_on ? 0 : a.occurred_on < b.occurred_on ? -1 : 1
  );

  let units = 0;
  let cost = 0;

  for (const txn of ordered) {
    if (txn.direction === "buy") {
      units += txn.units;
      cost += txn.idr;
    } else {
      if (units <= 0) continue;
      const sold = Math.min(txn.units, units);
      cost -= cost * (sold / units);
      units -= sold;
    }
  }

  return units > 0 ? cost / units : 0;
}

/** Total IDR cost still tied up in the units held. */
export function forexCostBasis(
  txns: Pick<ForexTransaction, "direction" | "idr" | "units" | "occurred_on">[],
  units: number
): number {
  return Math.round(forexAvgCost(txns) * units);
}

/**
 * Units held at the end of a month.
 *
 * `forex_accounts.units` is the CURRENT balance, so this walks backwards: undo every move
 * that happened after the month in question.
 */
export async function forexUnitsAt(
  accountId: number,
  monthKey: string,
  currentUnits: number
): Promise<number> {
  const txns = await getForexTransactions(accountId);
  const endOfMonth = `${monthKey.slice(0, 7)}-31`;

  let units = currentUnits;
  for (const txn of txns) {
    if (txn.occurred_on <= endOfMonth) continue;
    if (txn.direction === "buy") units -= txn.units;
    else units += txn.units;
  }
  return units;
}

/**
 * Live IDR rate for a currency. Reference only — nothing is ever booked at this rate.
 *
 * Never throws: a missing rate degrades to the fallback, which is better than a dead page.
 */
export async function getForexRate(currency: string): Promise<number> {
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(currency)}`,
      { next: { revalidate: 3600 } }
    );
    if (!res.ok) return FALLBACK_RATE[currency] ?? 0;

    const json = (await res.json()) as { rates?: Record<string, number> };
    const rate = json.rates?.IDR;
    return typeof rate === "number" && Number.isFinite(rate)
      ? rate
      : (FALLBACK_RATE[currency] ?? 0);
  } catch {
    return FALLBACK_RATE[currency] ?? 0;
  }
}

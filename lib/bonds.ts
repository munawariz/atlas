import "server-only";

import { cache } from "react";
import { supabaseServer, isMissingTable } from "./supabaseServer";

/**
 * Bonds. Buying and selling moves principal in and out of the bond bucket; coupons are income
 * and carry no units.
 */

export interface BondTrade {
  id: number;
  name: string;
  side: "buy" | "sell" | "coupon";
  units: number;
  idr: number;
  occurred_on: string;
  wallet_id: number | null;
  txn_id: number | null;
}

export interface BondHolding {
  name: string;
  units: number;
  /** Principal still in: Σbuy − Σsell. */
  invested: number;
  coupons: number;
}

export interface BondPortfolio {
  holdings: BondHolding[];
  totalInvested: number;
  totalCoupons: number;
}

// Fetches the whole table once per request; `asOf` filters in JS (dates are YYYY-MM-DD, so
// string compare matches the `lte` PostgREST used to apply). Dedupes the page's
// getBondPortfolio() + getBondTrades() pair into one query.
const getAllBondTrades = cache(async (): Promise<BondTrade[]> => {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from("bond_trades")
    .select("*")
    .order("occurred_on", { ascending: false })
    .order("id", { ascending: false });
  if (error) {
    if (isMissingTable(error)) return [];
    throw error;
  }

  // `units` is numeric, which the client returns as a string (ATLAS.md §14.5).
  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    name: String(row.name),
    side: row.side as BondTrade["side"],
    units: Number(row.units ?? 0),
    idr: Number(row.idr ?? 0),
    occurred_on: String(row.occurred_on),
    wallet_id: row.wallet_id == null ? null : Number(row.wallet_id),
    txn_id: row.txn_id == null ? null : Number(row.txn_id),
  }));
});

export async function getBondTrades(asOf?: string): Promise<BondTrade[]> {
  const all = await getAllBondTrades();
  return asOf ? all.filter((t) => t.occurred_on <= asOf) : all;
}

export async function getBondPortfolio(asOf?: string): Promise<BondPortfolio> {
  const trades = await getBondTrades(asOf);

  const byName = new Map<string, BondHolding>();
  const of = (name: string): BondHolding => {
    let holding = byName.get(name);
    if (!holding) {
      holding = { name, units: 0, invested: 0, coupons: 0 };
      byName.set(name, holding);
    }
    return holding;
  };

  for (const trade of trades) {
    const holding = of(trade.name);
    if (trade.side === "buy") {
      holding.units += trade.units;
      holding.invested += trade.idr;
    } else if (trade.side === "sell") {
      holding.units -= trade.units;
      holding.invested -= trade.idr;
    } else {
      holding.coupons += trade.idr;
    }
  }

  // A fully sold bond keeps its coupon history but stops being a holding.
  const holdings = [...byName.values()]
    .filter((h) => h.units > 0 || h.invested > 0 || h.coupons > 0)
    .sort((a, b) => b.invested - a.invested);

  return {
    holdings,
    totalInvested: holdings.reduce((sum, h) => sum + h.invested, 0),
    totalCoupons: holdings.reduce((sum, h) => sum + h.coupons, 0),
  };
}
